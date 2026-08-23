export interface ApiSuccessEnvelope<T> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

export interface ApiErrorEnvelope {
  success: false;
  statusCode: number;
  errorCode: string;
  message: string;
  timestamp: string;
  path: string;
  /** Present on some 409 conflicts (e.g. "can't delete, still in use") — a breakdown of what's blocking the request. */
  details?: Record<string, number>;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ApiError extends Error {
  readonly statusCode: number;
  readonly errorCode: string;
  readonly details?: Record<string, number>;

  constructor(envelope: ApiErrorEnvelope) {
    // envelope.message can genuinely be a string[] at runtime — the backend's
    // globalValidationPipe sends every failing class-validator constraint as
    // a raw array (see exceptionFactory in validation.pipe.ts), even though
    // this type says string. Error's constructor would otherwise stringify
    // an array via a bare comma-join (e.g. "a,b"), so join with "; " here
    // for a readable message instead.
    const message = Array.isArray(envelope.message) ? envelope.message.join("; ") : envelope.message;
    super(message);
    this.name = "ApiError";
    this.statusCode = envelope.statusCode;
    this.errorCode = envelope.errorCode;
    this.details = envelope.details;
  }
}
