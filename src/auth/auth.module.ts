import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtModuleOptions } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CookieAuthService } from './cookie/cookie-auth.service';
import { PermissionsService } from './permissions.service';
import { RefreshTokenRepository } from './refresh-token.repository';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): JwtModuleOptions => ({
        secret: config.get<string>('JWT_SECRET') ?? 'dev-secret-change-me',
        signOptions: {
          expiresIn: config.get<string>('JWT_ACCESS_EXPIRES') ?? '15m',
        } as JwtModuleOptions['signOptions'],
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, CookieAuthService, PermissionsService, RefreshTokenRepository],
  exports: [JwtModule, PermissionsService, CookieAuthService],
})
export class AuthModule {}
