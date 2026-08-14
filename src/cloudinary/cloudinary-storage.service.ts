import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

export interface UploadedObject {
  readonly storagePath: string;
  readonly publicUrl: string;
}

@Injectable()
export class CloudinaryStorageService implements OnModuleInit {
  private readonly logger = new Logger(CloudinaryStorageService.name);
  private folder = 'clinical-images';
  private configured = false;

  constructor(private readonly configService: ConfigService) {}

  // được gọi khi module được khởi tạo
  onModuleInit(): void {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    this.folder = this.configService.get<string>('CLOUDINARY_FOLDER') ?? 'clinical-images';

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.warn('Cloudinary is not configured — clinical image upload will fail');
      return;
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });

    this.configured = true;
  }

  // uploadObject để upload ảnh vào Cloudinary
  async uploadObject(
    // đường dẫn lưu trữ trên máy
    storagePath: string,
    // buffer của ảnh
    buffer: Buffer,
    // kiểu nội dung của ảnh
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    contentType: string,
  ): Promise<UploadedObject> {
    this.assertConfigured(); // kiểm tra xem Cloudinary có được cấu hình không

    // Cloudinary public_id không có extension (.jpg, .png...)
    const publicId = storagePath.replace(/\.[^.]+$/, '');
    // resolve là hàm để trả về kết quả
    // reject là hàm để trả về lỗi
    // result là kết quả của upload
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      // upload_stream để upload ảnh vào Cloudinary
      // folder: thư mục lưu trữ trên Cloudinary
      // public_id: id của ảnh trên Cloudinary
      // resource_type: kiểu nội dung của ảnh
      // overwrite: false, nếu ảnh đã tồn tại thì không overwrite
      // ponytail: giữ mime gốc, Cloudinary tự detect format
      cloudinary.uploader
        .upload_stream(
          {
            folder: this.folder,
            public_id: publicId,
            resource_type: 'image',
            overwrite: false,
            // ponytail: giữ mime gốc, Cloudinary tự detect format
          },
          (error, uploadResult) => {
            if (error || !uploadResult) {
              reject(error ?? new Error('Cloudinary upload returned empty result'));
              return;
            }
            // trả về kết quả của upload
            resolve(uploadResult);
          },
        )
        .end(buffer); // kết thúc upload và trả về kết quả
    });

    return {
      storagePath: result.public_id,
      publicUrl: result.secure_url,
    };
  }

  async removeObject(storagePath: string): Promise<void> {
    this.assertConfigured();

    const result = await cloudinary.uploader.destroy(storagePath, {
      resource_type: 'image',
    });

    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(`Cloudinary delete failed: ${result.result}`);
    }
  }

  private assertConfigured(): void {
    if (!this.configured) {
      throw new Error('Cloudinary is not configured');
    }
  }
}
