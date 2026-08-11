import { ApiError, type ApiErrorEnvelope, type ApiSuccessEnvelope } from "@/types/api";
import { getToken, clearSession } from "@/lib/auth/session";
import { emitUnauthorized } from "@/lib/auth/authEvents";

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001/api/v1";

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

  const res = await fetch(buildUrl(path, options.params), {
    method,
    headers,
    body,
    signal: options.signal,
  });

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

export const apiClient = {
  get: <T>(path: string, params?: QueryParams, signal?: AbortSignal) =>
    request<T>("GET", path, { params, signal }),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, { body }),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, { body }),
  delete: <T>(path: string) => request<T>("DELETE", path),
  postForm: <T>(path: string, formData: FormData) =>
    request<T>("POST", path, { body: formData, isFormData: true }),
};
