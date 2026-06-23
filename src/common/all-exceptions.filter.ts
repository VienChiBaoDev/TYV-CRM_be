import {

  ArgumentsHost,

  Catch,

  ExceptionFilter,

  HttpException,

  HttpStatus,

  Logger,

} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import type { Response } from 'express';

import { isTechnicalError, toUserFacingError } from './user-facing-error.util';



@Catch()

export class AllExceptionsFilter implements ExceptionFilter {

  private readonly logger = new Logger(AllExceptionsFilter.name);



  catch(exception: unknown, host: ArgumentsHost) {

    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();



    if (exception instanceof HttpException) {

      const status = exception.getStatus();

      const body = exception.getResponse();

      let message = this.extractMessage(body);



      if (status >= HttpStatus.INTERNAL_SERVER_ERROR || isTechnicalError(message)) {

        message = toUserFacingError(message);

      }



      response.status(status).json({

        statusCode: status,

        message,

        error: status === HttpStatus.BAD_REQUEST ? 'Bad Request' : exception.name,

      });

      return;

    }



    if (exception instanceof Prisma.PrismaClientKnownRequestError) {

      const userMessage = prismaErrorToUserMessage(exception);

      if (userMessage) {

        this.logger.error(exception.message, exception.stack);

        response.status(HttpStatus.BAD_REQUEST).json({

          statusCode: HttpStatus.BAD_REQUEST,

          message: userMessage,

          error: 'Bad Request',

        });

        return;

      }

    }



    const raw = exception instanceof Error ? exception.message : String(exception);

    this.logger.error(raw, exception instanceof Error ? exception.stack : undefined);



    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({

      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,

      message: toUserFacingError(raw),

      error: 'Internal Server Error',

    });

  }



  private extractMessage(body: string | object): string {

    if (typeof body === 'string') return body;

    if (body && typeof body === 'object') {

      const msg = (body as { message?: string | string[] }).message;

      if (Array.isArray(msg)) return msg.join(', ');

      if (typeof msg === 'string') return msg;

    }

    return 'Đã có lỗi xảy ra';

  }

}



function prismaErrorToUserMessage(err: Prisma.PrismaClientKnownRequestError): string | null {

  if (err.code === 'P2003') {

    const field = String(err.meta?.field_name ?? '');

    if (field.includes('department_id')) {

      return 'Phòng ban không hợp lệ. Vui lòng chọn lại từ danh sách phòng ban.';

    }

    if (field.includes('division_id')) {

      return 'Phòng ban tổ chức không hợp lệ. Vui lòng chọn lại.';

    }

    if (field.includes('team_id')) {

      return 'Team không hợp lệ. Vui lòng chọn lại từ danh sách team.';

    }

    return 'Dữ liệu tham chiếu không hợp lệ. Vui lòng kiểm tra phòng ban và team.';

  }

  if (err.code === 'P2002') {

    return 'Dữ liệu đã tồn tại (trùng khóa). Vui lòng kiểm tra email hoặc mã nhân viên.';

  }

  return null;

}

