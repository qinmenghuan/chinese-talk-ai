import type {
  ArgumentsHost} from "@nestjs/common";
import {
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";

interface HttpResponseLike {
  status(code: number): HttpResponseLike;
  json(payload: unknown): void;
}

function resolveExceptionMessage(exception: HttpException) {
  const response = exception.getResponse();

  if (typeof response === "string") {
    return response;
  }

  if (response && typeof response === "object" && "message" in response) {
    const message = (response as { message?: string | string[] }).message;

    if (Array.isArray(message)) {
      return message.join("; ");
    }

    if (typeof message === "string" && message.trim()) {
      return message;
    }
  }

  return exception.message || "Request failed.";
}

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<HttpResponseLike>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      response.status(status).json({
        code: status,
        message: resolveExceptionMessage(exception),
        data: null,
      });
      return;
    }

    const message =
      exception instanceof Error && exception.message.trim()
        ? exception.message
        : "Internal server error.";

    this.logger.error(message, exception instanceof Error ? exception.stack : undefined);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      message,
      data: null,
    });
  }
}
