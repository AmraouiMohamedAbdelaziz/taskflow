import type { ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import { StorageError, TaskNotFoundError } from '../errors.js';

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, next) => {
  if (res.headersSent) { next(error); return; }
  let status = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred.';
  if (error instanceof URIError) {
    status = 400; code = 'INVALID_REQUEST'; message = 'Invalid request URL.';
  } else if (error instanceof ZodError) {
    status = 400; code = 'VALIDATION_ERROR'; message = 'Invalid task data or identifier.';
  } else if (error instanceof TaskNotFoundError) {
    status = 404; code = 'TASK_NOT_FOUND'; message = 'Task not found.';
  } else if (error instanceof StorageError) {
    status = 503; code = 'STORAGE_UNAVAILABLE'; message = 'Task storage is unavailable.';
  } else if (error instanceof Error && 'type' in error) {
    switch (error.type) {
      case 'entity.parse.failed':
        status = 400; code = 'INVALID_JSON'; message = 'Request body must be valid JSON.'; break;
      case 'entity.too.large':
        status = 413; code = 'PAYLOAD_TOO_LARGE'; message = 'Request body exceeds 32 KiB.'; break;
      case 'charset.unsupported':
      case 'encoding.unsupported':
        status = 415; code = 'UNSUPPORTED_MEDIA_TYPE'; message = 'Use uncompressed application/json with UTF-8 encoding.'; break;
      case 'request.aborted':
      case 'request.size.invalid':
        status = 400; code = 'INVALID_REQUEST'; message = 'Invalid request body.'; break;
    }
  }
  res.status(status).json({ error: { code, message } });
};
