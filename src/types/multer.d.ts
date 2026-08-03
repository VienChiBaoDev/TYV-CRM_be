declare global {
  namespace Express {
    namespace Multer {
      /** Memory-storage upload from Nest `FileInterceptor`. */
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        buffer: Buffer;
        destination?: string;
        filename?: string;
        path?: string;
      }
    }
  }
}

export {};
