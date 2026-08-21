import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';
import type {
  AiIntegrationSuggestPayload,
  AiIntegrationSuggestResponse,
} from './ai-integration.types';

@Injectable()
export class AiIntegrationClient {
  private readonly baseUrl: string;
  private readonly serviceKey: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = (
      this.config.get<string>('AI_SERVICE_URL') ?? 'http://127.0.0.1:8100'
    ).replace(/\/$/, '');
    this.serviceKey = (this.config.get<string>('AI_SERVICE_KEY') ?? '').trim();
  }

  async suggestPrescription(
    payload: AiIntegrationSuggestPayload,
  ): Promise<AiIntegrationSuggestResponse> {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.serviceKey) {
        headers['X-AI-Service-Key'] = this.serviceKey;
      }

      const { data } = await axios.post<AiIntegrationSuggestResponse>(
        `${this.baseUrl}/v1/suggest-prescription`,
        payload,
        {
          headers,
          timeout: 130_000,
        },
      );
      return data;
    } catch (error) {
      const axiosError = error as AxiosError<{ detail?: string | { msg?: string }[] }>;
      const detail = axiosError.response?.data?.detail;
      let message = 'Dịch vụ AI tạm thời không phản hồi.';
      if (typeof detail === 'string' && detail.trim()) {
        message = detail.trim();
      } else if (axiosError.code === 'ECONNREFUSED') {
        message =
          'Không kết nối được TYV-CRM_ai. Kiểm tra AI_SERVICE_URL và service Python đang chạy.';
      } else if (axiosError.message) {
        message = `Dịch vụ AI lỗi: ${axiosError.message}`;
      }
      throw new ServiceUnavailableException(message);
    }
  }
}
