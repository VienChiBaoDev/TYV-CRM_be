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
import { BankAccountModule } from './bank-account/bank-account.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { MedicalCaseModule } from './medical-case/medical-case.module';
import { MedicalVisitModule } from './medical-visit/medical-visit.module';
import { ReferrerModule } from './referrer/referrer.module';
import { StaffModule } from './staff/staff.module';
import { PatientModule } from './patient/patient.module';
import { PrismaModule } from './prisma/prisma.module';
import { SupabaseModule } from './supabase/supabase.module';
import { PatientFollowUpModule } from './patient-follow-up/patient-follow-up.module';
import { ServiceCatalogModule } from './service-catalog/service-catalog.module';
import { MedicineModule } from './medicine/medicine.module';
import { PatientServiceModule } from './patient-service/patient-service.module';
import { PatientPaymentModule } from './patient-payment/patient-payment.module';
import { PatientTreatmentModule } from './patient-treatment/patient-treatment.module';
import { StaffShiftModule } from './staff-shift/staff-shift.module';
import { PrescriptionFormulaTemplateModule } from './prescription-formula-template/prescription-formula-template.module';
import { ConsumableModule } from './consumable/consumable.module';

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
    MedicalCaseModule,
    PatientFollowUpModule,
    ServiceCatalogModule,
    ReferrerModule,
    AppointmentModule,
    StaffModule,
    MedicineModule,
    PatientServiceModule,
    PatientPaymentModule,
    PatientTreatmentModule,
    StaffShiftModule,
    PrescriptionFormulaTemplateModule,
    BankAccountModule,
    ConsumableModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Xác thực JWT toàn cục (trừ route gắn @Public), sau đó kiểm tra @Roles.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
