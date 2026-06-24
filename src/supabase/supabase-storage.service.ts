import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface UploadedObject {
  readonly storagePath: string;
  readonly publicUrl: string;
}

@Injectable()
export class SupabaseStorageService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseStorageService.name);
  private client: SupabaseClient | null = null;
  private bucket = '';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit(): void {
    const url = this.configService.get<string>('SUPABASE_URL');
    const serviceRoleKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );
    this.bucket =
      this.configService.get<string>('SUPABASE_CLINICAL_BUCKET') ??
      'clinical-images';

    if (!url || !serviceRoleKey) {
      this.logger.warn(
        'Supabase storage is not configured — clinical image upload will fail',
      );
      return;
    }

    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async uploadObject(
    storagePath: string,
    buffer: Buffer,
    contentType: string,
  ): Promise<UploadedObject> {
    const client = this.getClient();

    const { error } = await client.storage
      .from(this.bucket)
      .upload(storagePath, buffer, {
        contentType,
        upsert: false,
        cacheControl: '3600',
      });

    if (error) {
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    const { data } = client.storage.from(this.bucket).getPublicUrl(storagePath);

    return {
      storagePath,
      publicUrl: data.publicUrl,
    };
  }

  async removeObject(storagePath: string): Promise<void> {
    const client = this.getClient();

    const { error } = await client.storage
      .from(this.bucket)
      .remove([storagePath]);

    if (error) {
      throw new Error(`Supabase delete failed: ${error.message}`);
    }
  }

  private getClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Supabase storage is not configured');
    }

    return this.client;
  }
}
