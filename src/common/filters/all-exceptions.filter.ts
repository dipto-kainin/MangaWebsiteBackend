import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
    Logger,
} from "@nestjs/common";
import { Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let error = "Internal server error";
        let code = "INTERNAL_ERROR";

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const body = exception.getResponse();

            if (typeof body === "string") {
                error = body;
            } else if (typeof body === "object" && body !== null) {
                const b = body as any;
                error = b.error ?? b.message ?? error;
                code = b.code ?? this.statusToCode(status);
            }
        } else {
            this.logger.error("Unhandled exception", exception);
        }

        response.status(status).json({ error, code });
    }

    private statusToCode(status: number): string {
        const map: Record<number, string> = {
            400: "VALIDATION_ERROR",
            401: "UNAUTHORIZED",
            403: "FORBIDDEN",
            404: "NOT_FOUND",
            409: "CONFLICT",
            429: "RATE_LIMITED",
            500: "INTERNAL_ERROR",
        };
        return map[status] ?? "INTERNAL_ERROR";
    }
}
