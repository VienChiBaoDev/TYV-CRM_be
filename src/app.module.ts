import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppointmentModule } from './appointment/appointment.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { MedicalVisitModule } from './medical-visit/medical-visit.module';
import { ReferrerModule } from './referrer/referrer.module';
import { StaffModule } from './staff/staff.module';
import { PatientModule } from './patient/patient.module';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { PatientFollowUpModule } from './patient-follow-up/patient-follow-up.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '.env'),
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 200,
      },
    ]),
    CacheModule.register({
      isGlobal: true,
      ttl: 5 * 1000, // 5 seconds
      max: 100,
    }),
    PrismaModule,
    SupabaseModule,
    AuthModule,
    PatientModule,
    MedicalVisitModule,
    PatientFollowUpModule,
    ReferrerModule,
    AppointmentModule,
    StaffModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Xác thực JWT toàn cục (trừ route gắn @Public), sau đó kiểm tra @Roles.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule { }
