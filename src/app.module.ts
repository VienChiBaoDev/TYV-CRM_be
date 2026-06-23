import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { EmployeesModule } from './employees/employees.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { MeModule } from './me/me.module';
import { ManagerClassesModule } from './manager-classes/manager-classes.module';
import { OrganizationModule } from './organization/organization.module';
import { PerformanceModule } from './performance/performance.module';
import { ManagerRoadmapModule } from './manager-roadmap/manager-roadmap.module';
import { TeacherClassesModule } from './teacher-classes/teacher-classes.module';
import { ExamModule } from './exam/exam.module';
import { OrgModule } from './org/org.module';
import { ManagerApprovalsModule } from './manager-approvals/manager-approvals.module';
import { ClassEvaluationsModule } from './class-evaluations/class-evaluations.module';
import { LearningModule } from './learning/learning.module';
import { RoomBookingModule } from './room-booking/room-booking.module';
import { LarkModule } from './lark/lark.module';
import { CompanyLandingModule } from './company-landing/company-landing.module';
import { AiModule } from './ai/ai.module';
import { CskhModule } from './cskh/cskh.module';
import { RewardModule } from './reward/reward.module';
import { TtsModule } from './tts/tts.module';
import { AssistantModule } from './assistant/assistant.module';
import { StorageModule } from './storage/storage.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '.env'),
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 200,
    }]),
    CacheModule.register({
      isGlobal: true,
      ttl: 5 * 1000, // 5 seconds
      max: 100,
    }),
    PrismaModule,
    StorageModule,
    AuthModule,
    UsersModule,
    MeModule,
    EmployeesModule,
    ManagerClassesModule,
    OrganizationModule,
    PerformanceModule,
    ManagerRoadmapModule,
    TeacherClassesModule,
    ExamModule,
    OrgModule,
    ManagerApprovalsModule,
    ClassEvaluationsModule,
    LearningModule,
    RoomBookingModule,
    LarkModule,
    CompanyLandingModule,
    AiModule,
    CskhModule,
    RewardModule,
    TtsModule,
    AssistantModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

