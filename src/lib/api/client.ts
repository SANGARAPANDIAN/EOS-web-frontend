import { ApiError, type ApiErrorEnvelope, type ApiSuccessEnvelope } from "@/types/api";
import { getToken, clearSession } from "@/lib/auth/session";
import { emitUnauthorized } from "@/lib/auth/authEvents";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

// Generous enough for institution-wide rollup endpoints (e.g. the IQAC
// dashboard aggregates across every department) but bounded: without this,
// a wedged/hung backend process (accepting the TCP connection but never
// responding — distinct from a refused connection, which fails immediately)
// leaves `fetch` pending forever, which keeps every caller's React Query
// `isLoading` true forever too — an indefinitely-stuck loading skeleton with
// no error, no retry, and no way out short of the backend itself recovering.
const REQUEST_TIMEOUT_MS = 20_000;

export type QueryParams = Record<string, string | number | boolean | undefined | null>;

function buildUrl(path: string, params?: QueryParams): string {
  const url = new URL(BASE_URL.replace(/\/+$/, "") + path);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

interface RequestOptions {
  params?: QueryParams;
  body?: unknown;
  isFormData?: boolean;
  signal?: AbortSignal;
}

async function request<T>(method: string, path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (options.isFormData) {
      body = options.body as FormData;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(options.body);
    }
  }

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = options.signal ? AbortSignal.any([options.signal, timeoutSignal]) : timeoutSignal;

  let res: Response;
  try {
    res = await fetch(buildUrl(path, options.params), {
      method,
      headers,
      body,
      signal,
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === "TimeoutError") {
      throw new ApiError({
        success: false,
        statusCode: 0,
        errorCode: "REQUEST_TIMEOUT",
        message: "The server is taking too long to respond. Please try again.",
        timestamp: new Date().toISOString(),
        path,
      });
    }
    throw err;
  }

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
      emitUnauthorized();
    }
    const errorEnvelope: ApiErrorEnvelope = json ?? {
      success: false,
      statusCode: res.status,
      errorCode: "UNKNOWN_ERROR",
      message: res.statusText || "Request failed",
      timestamp: new Date().toISOString(),
      path,
    };
    throw new ApiError(errorEnvelope);
  }

  const envelope = json as ApiSuccessEnvelope<T>;
  return envelope.data;
}

export interface BlobResponse {
  blob: Blob;
  filename: string | null;
}

function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null;
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match ? match[1] : null;
}

/**
 * Report/export downloads return a binary body on success but the same JSON
 * error envelope as every other endpoint on failure — res.ok must be checked
 * before res.blob(), or a failed download silently saves a JSON error body
 * as a .pdf/.xlsx.
 */
async function downloadBlob(path: string, params?: QueryParams): Promise<BlobResponse> {
  const token = getToken();
  const headers: HeadersInit = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(buildUrl(path, params), { method: "GET", headers });

  if (!res.ok) {
    if (res.status === 401) {
      clearSession();
      emitUnauthorized();
    }
    const json = await res.json().catch(() => null);
    const errorEnvelope: ApiErrorEnvelope = json ?? {
      success: false,
      statusCode: res.status,
      errorCode: "UNKNOWN_ERROR",
      message: res.statusText || "Request failed",
      timestamp: new Date().toISOString(),
      path,
    };
    throw new ApiError(errorEnvelope);
  }

  const blob = await res.blob();
  const filename = parseContentDispositionFilename(res.headers.get("Content-Disposition"));
  return { blob, filename };
}

/**
 * Multipart upload — no Content-Type header set here on purpose. The browser
 * needs to generate it itself for FormData (it embeds a random multipart
 * boundary the server parses on); setting it manually breaks the boundary.
 */
async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  return request<T>("POST", path, { body: formData, isFormData: true });
}

export const apiClient = {
  get: <T>(path: string, params?: QueryParams, signal?: AbortSignal) =>
    request<T>("GET", path, { params, signal }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, { body }),
  delete: <T>(path: string) => request<T>("DELETE", path),
  postForm: <T>(path: string, formData: FormData) =>
    request<T>("POST", path, { body: formData, isFormData: true }),
  patchForm: <T>(path: string, formData: FormData) =>
    request<T>("PATCH", path, { body: formData, isFormData: true }),
  downloadBlob,
  uploadFile,
};
