import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import { PERMISSIONS } from '../auth/permissions';
import type { JwtPayloadUser } from '../auth/types';
import { AiPrescriptionService } from './ai-prescription.service';
import type { SuggestPrescriptionResponse } from './ai-prescription.types';
import { SuggestPrescriptionDto } from './dto/suggest-prescription.dto';

@Controller('patients/:patientId/visits')
export class AiPrescriptionController {
  constructor(private readonly aiPrescriptionService: AiPrescriptionService) {}

  @Post('ai-suggest')
  @RequirePermissions(PERMISSIONS.VISITS_WRITE)
  suggest(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: SuggestPrescriptionDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<SuggestPrescriptionResponse> {
    return this.aiPrescriptionService.suggest(patientId, dto, user);
  }
}
