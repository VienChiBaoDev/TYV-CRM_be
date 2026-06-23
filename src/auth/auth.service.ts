import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtUserPayload } from './jwt-auth.guard';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes } from 'node:crypto';
import { UsersService } from '../users/users.service';
import { PermissionsService } from '../permissions/permissions.service';
import { userToSession } from './session.mapper';
import type { UserSessionDto } from './session.mapper';
import { normalizeEmailForAuth } from '../common/normalize-email';
import { isEmploymentInactive } from '../common/employment-status';

@Injectable()
export class AuthService {
  private googleOAuthClient: OAuth2Client | null = null;

  constructor(
    private readonly usersService: UsersService,
    private readonly permissionsService: PermissionsService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Singleton OAuth2Client — tránh tạo mới mỗi request khi 200 người login cùng lúc */
  private getGoogleOAuthClient(): OAuth2Client {
    if (!this.googleOAuthClient) {
      const clientId = this.config.get<string>('GOOGLE_CLIENT_ID', '');
      const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET', '');
      const redirectUri = this.googleRedirectUri();
      this.googleOAuthClient = new OAuth2Client(clientId, clientSecret, redirectUri);
    }
    return this.googleOAuthClient;
  }

  /** State CSRF — lưu cookie trước khi redirect sang Google. */
  createOAuthState(): string {
    return randomBytes(24).toString('hex');
  }

  private googleRedirectUri(): string {
    return (
      this.config.get<string>('GOOGLE_OAUTH_REDIRECT_URI', '') ||
      `http://localhost:${this.config.get<string>('PORT', '3003')}/auth/google/callback`
    );
  }

  private frontendUrl(): string {
    return this.config.get<string>('FRONTEND_URL', 'http://localhost:5173');
  }

  getGoogleAuthorizeUrl(state: string): string {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID', '');
    if (!clientId) {
      throw new UnauthorizedException('Chưa cấu hình GOOGLE_CLIENT_ID');
    }
    const redirectUri = this.googleRedirectUri();
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: ['openid', 'email', 'profile'].join(' '),
      state,
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'select_account',
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /** Đổi authorization code lấy id_token; tìm user theo email; ký JWT session. */
  async completeGoogleOAuth(code: string): Promise<{
    accessToken: string;
    user: UserSessionDto;
  }> {
    const clientId = this.config.get<string>('GOOGLE_CLIENT_ID', '');
    const clientSecret = this.config.get<string>('GOOGLE_CLIENT_SECRET', '');
    if (!clientId || !clientSecret) {
      throw new UnauthorizedException('Chưa cấu hình GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET');
    }
    const oauth2Client = this.getGoogleOAuthClient();
    const { tokens } = await oauth2Client.getToken(code);
    if (!tokens.id_token) {
      throw new UnauthorizedException('Google không trả id_token');
    }
    const ticket = await oauth2Client.verifyIdToken({
      idToken: tokens.id_token,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    const emailRaw = payload?.email?.trim() ?? '';
    if (!emailRaw) {
      throw new UnauthorizedException('Google không trả email');
    }
    const user = await this.usersService.findByIdWithProfileByEmail(emailRaw);
    if (!user) {
      throw new UnauthorizedException('Email chưa có trong hệ thống nhân sự');
    }
    if (isEmploymentInactive(user.employmentStatus)) {
      throw new UnauthorizedException('Tài khoản đã bị vô hiệu hóa. Vui lòng liên hệ HR.');
    }
    const email = normalizeEmailForAuth(emailRaw);

    // Bước 1: Song song lấy staffLevel + isTeacher (không phụ thuộc nhau)
    const [staffLevel, isAssignedClassTeacher] = await Promise.all([
      this.usersService.resolveStaffLevel(user.id),
      this.usersService.isAssignedLearningClassTeacher(user.id),
    ]);

    // Bước 2: resolveAppRole dùng isTeacherHint để KHÔNG gọi DB lần 2
    const appRole = await this.usersService.resolveAppRole(email, user, isAssignedClassTeacher);
    const effective = await this.permissionsService.resolveEffectiveForUser(user.id, appRole);

    const teamName = await this.usersService.findTeamName(user.teamId);
    const [sessionUser, accessToken] = await Promise.all([
      Promise.resolve(userToSession(user, email, appRole, effective, staffLevel, {
        isAssignedClassTeacher,
        teamName,
      })),
      this.jwt.signAsync({
        sub: user.id,
        email,
        appRole,
      }),
    ]);
    return { accessToken, user: sessionUser };
  }

  /** Khôi phục phiên từ Bearer hoặc cookie — không 401 khi thiếu/hết hạn (trang công khai). */
  async tryMeFromToken(
    token: string | undefined,
  ): Promise<{ user: UserSessionDto; accessToken?: string } | null> {
    if (!token?.trim()) return null;
    try {
      const payload = this.jwt.verify<JwtUserPayload>(token);
      if (!payload.sub || !payload.email || !payload.appRole) return null;
      return this.me(payload.sub, token);
    } catch {
      return null;
    }
  }

  async me(
    userId: string,
    bearerToken?: string,
  ): Promise<{ user: UserSessionDto; accessToken?: string }> {
    // Song song hóa: Tải user + staffLevel + isTeacher cùng lúc để giảm latency
    const [user, staffLevel, isAssignedClassTeacher] = await Promise.all([
      this.usersService.findByIdWithProfile(userId),
      this.usersService.resolveStaffLevel(userId),
      this.usersService.isAssignedLearningClassTeacher(userId),
    ]);
    if (!user?.email?.trim()) {
      throw new UnauthorizedException('Phiên không hợp lệ');
    }
    const email = normalizeEmailForAuth(user.email);

    // Truyền isTeacherHint để tránh query trùng lặp trong resolveAppRole
    const appRole = await this.usersService.resolveAppRole(email, user, isAssignedClassTeacher);
    const effective = await this.permissionsService.resolveEffectiveForUser(userId, appRole);

    const teamName = await this.usersService.findTeamName(user.teamId);
    const out: { user: UserSessionDto; accessToken?: string } = {
      user: userToSession(user, email, appRole, effective, staffLevel, {
        isAssignedClassTeacher,
        teamName,
      }),
    };
    if (bearerToken) out.accessToken = bearerToken;
    return out;
  }

  login(_body: { username: string; password: string }) {
    throw new UnauthorizedException('Sử dụng đăng nhập Google');
  }
}
