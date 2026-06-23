
import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /** Internal: CSKH audit pipeline gọi AI service + lưu chat_audits. */
  @Post('audit-chat')
  async auditChat(@Body() body: Record<string, unknown>) {
    return this.aiService.auditChat(body as Parameters<AiService['auditChat']>[0]);
  }
}
