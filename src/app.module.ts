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
import { ClinicModule } from './clinic/clinic.module';
import { CsrfGuard } from './auth/guards/csrf.guard';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { PermissionsGuard } from './auth/guards/permissions.guard';
import { RolesGuard } from './auth/guards/roles.guard';
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
    // ConfigModule để đọc các biến môi trường từ file .env
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: join(__dirname, '..', '.env'),
    }),
    ScheduleModule.forRoot(),
    // Ứng dụng sẽ bị tắt nếu vượt quá 200 request trong 1 phút
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 200,
      },
    ]),
    // CacheModule để lưu trữ dữ liệu trong bộ nhớ cache
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
    ClinicModule,
    ConsumableModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // JWT → CSRF → Roles (legacy @Roles) → Permissions (@RequirePermissions)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: CsrfGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
