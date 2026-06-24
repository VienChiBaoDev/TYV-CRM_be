import { Injectable } from '@nestjs/common';
import { CreateStandardMedicalRecordDto } from './dto/create-standard-medical-record.dto';
import { UpdateStandardMedicalRecordDto } from './dto/update-standard-medical-record.dto';

@Injectable()
export class StandardMedicalRecordService {
  create(createStandardMedicalRecordDto: CreateStandardMedicalRecordDto) {
    return 'This action adds a new standardMedicalRecord';
  }

  findAll() {
    return `This action returns all standardMedicalRecord`;
  }

  findOne(id: number) {
    return `This action returns a #${id} standardMedicalRecord`;
  }

  update(id: number, updateStandardMedicalRecordDto: UpdateStandardMedicalRecordDto) {
    return `This action updates a #${id} standardMedicalRecord`;
  }

  remove(id: number) {
    return `This action removes a #${id} standardMedicalRecord`;
  }
}
