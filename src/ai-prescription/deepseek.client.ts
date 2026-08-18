import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosError } from 'axios';

export interface DeepSeekChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

/** Latest DeepSeek models (V4). Prefer pro for clinical reasoning accuracy. */
export const DEEPSEEK_DEFAULT_MODEL = 'deepseek-v4-pro';

@Injectable()
export class DeepSeekClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(private readonly config: ConfigService) {
    this.apiKey = (this.config.get<string>('DEEPSEEK_API_KEY') ?? '').trim();
    this.baseUrl = (
      this.config.get<string>('DEEPSEEK_BASE_URL') ?? 'https://api.deepseek.com'
    ).replace(/\/$/, '');
    this.model =
      (this.config.get<string>('DEEPSEEK_MODEL') ?? DEEPSEEK_DEFAULT_MODEL).trim() ||
      DEEPSEEK_DEFAULT_MODEL;
  }

  async chat(messages: DeepSeekChatMessage[]): Promise<string> {
    if (!this.apiKey) {
      throw new ServiceUnavailableException(
        'Chưa cấu hình DEEPSEEK_API_KEY. Vui lòng thêm key vào biến môi trường.',
      );
    }

    try {
      const { data } = await axios.post<DeepSeekChatCompletionResponse>(
        `${this.baseUrl}/chat/completions`,
        {
          model: this.model,
          messages,
          temperature: 0.2,
          thinking: { type: 'enabled' },
          reasoning_effort: 'high',
        },
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 120_000,
        },
      );

      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) {
        throw new ServiceUnavailableException(
          'DeepSeek không trả về nội dung gợi ý.',
        );
      }
      return content;
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;

      const axiosError = error as AxiosError<{ error?: { message?: string } }>;
      const providerMessage =
        axiosError.response?.data?.error?.message ?? axiosError.message;
      throw new ServiceUnavailableException(
        `DeepSeek tạm thời không phản hồi: ${providerMessage}`,
      );
    }
  }
}
