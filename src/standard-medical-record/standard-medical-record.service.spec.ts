import { Test, TestingModule } from '@nestjs/testing';
import { StandardMedicalRecordService } from './standard-medical-record.service';

describe('StandardMedicalRecordService', () => {
  let service: StandardMedicalRecordService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StandardMedicalRecordService],
    }).compile();

    service = module.get<StandardMedicalRecordService>(StandardMedicalRecordService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
