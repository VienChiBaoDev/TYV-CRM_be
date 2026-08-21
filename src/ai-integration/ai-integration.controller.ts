import { Body, Controller, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { CurrentUser, RequirePermissions } from '../auth/decorators';
import { PERMISSIONS } from '../auth/permissions';
import type { JwtPayloadUser } from '../auth/types';
import { AiIntegrationService } from './ai-integration.service';
import type { AiIntegrationSuggestResponse } from './ai-integration.types';
import { SuggestPrescriptionDto } from './dto/suggest-prescription.dto';

@Controller('patients/:patientId/visits')
export class AiIntegrationController {
  constructor(private readonly aiIntegrationService: AiIntegrationService) {}

  @Post('ai-suggest')
  @RequirePermissions(PERMISSIONS.VISITS_WRITE)
  suggest(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @Body() dto: SuggestPrescriptionDto,
    @CurrentUser() user: JwtPayloadUser,
  ): Promise<AiIntegrationSuggestResponse> {
    return this.aiIntegrationService.suggestPrescription(patientId, dto, user);
  }
}
