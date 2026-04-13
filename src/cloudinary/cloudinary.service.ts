import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import sharp = require('sharp');
import * as streamifier from 'streamifier';

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
}

@Injectable()
export class CloudinaryService {
  constructor(private config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.config.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Resize image to 1024px wide (height auto) then upload to Cloudinary.
   * @param buffer  Raw file buffer from multer
   * @param folder  Cloudinary folder path
   */
  async uploadImage(buffer: Buffer, folder: string): Promise<CloudinaryUploadResult> {
    // Resize: width = 1024px, height auto (preserve aspect ratio)
    const resized = await sharp(buffer)
      .resize({ width: 1024, withoutEnlargement: false })
      .toBuffer();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          format: 'webp',
          quality: 'auto:good',
        },
        (error, result: UploadApiResponse) => {
          if (error) return reject(error);
          resolve({ url: result.secure_url, publicId: result.public_id });
        },
      );
      streamifier.createReadStream(resized).pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    await cloudinary.uploader.destroy(publicId);
  }
}
