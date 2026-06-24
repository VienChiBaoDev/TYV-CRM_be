import { Test, TestingModule } from '@nestjs/testing';
import { StandardMedicalRecordController } from './standard-medical-record.controller';
import { StandardMedicalRecordService } from './standard-medical-record.service';

describe('StandardMedicalRecordController', () => {
  let controller: StandardMedicalRecordController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StandardMedicalRecordController],
      providers: [StandardMedicalRecordService],
    }).compile();

    controller = module.get<StandardMedicalRecordController>(StandardMedicalRecordController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
