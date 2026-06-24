import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MedicalVisitModule } from './medical-visit/medical-visit.module';
import { PatientModule } from './patient/patient.module';
import { PrismaModule } from './prisma/prisma.module';
import { StandardMedicalRecordModule } from './standard-medical-record/standard-medical-record.module';

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
    PatientModule,
    MedicalVisitModule,
    StandardMedicalRecordModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
