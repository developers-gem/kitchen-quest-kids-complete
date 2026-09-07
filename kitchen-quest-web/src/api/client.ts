// import { getAccessToken, refreshAccessToken, setAccessToken } from "./tokenStore";
// import { getGateToken } from "./gateTokenStore";
// import type { ApiErrorEnvelope, ApiSuccessEnvelope } from "../types/api";

// const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api/v1";

// /**
//  * The one error type every caller (React Query, form handlers, ...) deals
//  * with. `code` is the backend's stable machine-readable string
//  * (VALIDATION_ERROR, GAME_LOCKED, PARENTAL_GATE_REQUIRED, ...) -- UI code
//  * should branch on `code`, never parse `message` text.
//  */
// export class ApiError extends Error {
//   readonly status: number;
//   readonly code: string;
//   readonly details?: unknown;

//   constructor(status: number, code: string, message: string, details?: unknown) {
//     super(message);
//     this.name = "ApiError";
//     this.status = status;
//     this.code = code;
//     this.details = details;
//   }
// }

// export interface RequestOptions {
//   method?: "GET" | "POST" | "PATCH" | "DELETE";
//   body?: unknown;
//   query?: Record<string, string | number | boolean | undefined | null>;
//   /** Explicit opt-out for endpoints that must not send the parental-gate
//    * header even when one happens to be set (there are none today, but the
//    * override exists so a future public-but-authenticated endpoint doesn't
//    * have to fight the default). */
//   skipGateToken?: boolean;
//   /** Internal: prevents infinite refresh loops on the refresh call itself. */
//   _isRetry?: boolean;
// }

// function buildUrl(path: string, query?: RequestOptions["query"]): string {
//   const url = new URL(BASE_URL + path, window.location.origin);
//   if (query) {
//     Object.entries(query).forEach(([key, value]) => {
//       if (value !== undefined && value !== null && value !== "") {
//         url.searchParams.set(key, String(value));
//       }
//     });
//   }
//   return url.pathname + url.search;
// }

// async function rawFetch(path: string, options: RequestOptions): Promise<Response> {
//   const headers: Record<string, string> = { "Content-Type": "application/json" };

//   const token = getAccessToken();
//   if (token) headers.Authorization = `Bearer ${token}`;

//   const gateToken = options.skipGateToken ? null : getGateToken();
//   if (gateToken) headers["x-parental-gate-token"] = gateToken;

//   return fetch(buildUrl(path, options.query), {
//     method: options.method ?? "GET",
//     headers,
//     credentials: "include", // carries the httpOnly refresh-token cookie
//     body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
//   });
// }

// /**
//  * Every module client (auth.ts, games.ts, recipes.ts, ...) calls this.
//  * On a 401 that isn't itself a refresh/login/register call, attempts
//  * exactly one silent token refresh and retries the original request --
//  * if that also fails, the access token is cleared, which AuthContext's
//  * subscription picks up and treats as "logged out."
//  */
// export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
//   const { data } = await requestEnvelope<T>(path, options);
//   return data;
// }

// /**
//  * Like `request`, but also returns `meta` (pagination info) from the
//  * envelope. List endpoints that support ?page=&limit= use this instead of
//  * `request` so callers get { data, meta } without a second round trip.
//  */
// export async function requestPaginated<T>(
//   path: string,
//   options: RequestOptions = {}
// ): Promise<{ data: T; meta: { page: number; limit: number; total: number; totalPages: number } }> {
//   const { data, meta } = await requestEnvelope<T>(path, options);
//   return { data, meta: (meta as { page: number; limit: number; total: number; totalPages: number }) ?? { page: 1, limit: 0, total: 0, totalPages: 1 } };
// }

// async function requestEnvelope<T>(
//   path: string,
//   options: RequestOptions
// ): Promise<{ data: T; meta?: unknown }> {
//   const res = await rawFetch(path, options);
//   const json = (await res.json().catch(() => null)) as ApiSuccessEnvelope<T> | ApiErrorEnvelope | null;

//   if (res.ok && json?.success) {
//     return { data: json.data, meta: json.meta };
//   }

//   const errorBody = json && !json.success ? json.error : undefined;
//   const code = errorBody?.code ?? "UNKNOWN_ERROR";
//   const message = errorBody?.message ?? `Request failed (${res.status})`;

//   const isAuthEndpoint = path.startsWith("/auth/");
//   if (res.status === 401 && !isAuthEndpoint && !options._isRetry) {
//     const newToken = await refreshAccessToken();
//     if (newToken) {
//       return requestEnvelope<T>(path, { ...options, _isRetry: true });
//     }
//     setAccessToken(null);
//   }

//   throw new ApiError(res.status, code, message, errorBody?.details);
// }


import { getAccessToken, refreshAccessToken, setAccessToken } from "./tokenStore";
import { getGateToken } from "./gateTokenStore";
import type { ApiErrorEnvelope, ApiSuccessEnvelope } from "../types/api";

// Ensure the base URL includes /api/v1, whether pointing to Render or falling back to local proxy
const RAW_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") || "";
const BASE_URL = RAW_BASE ? `${RAW_BASE}/api/v1` : "/api/v1";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined | null>;
  skipGateToken?: boolean;
  _isRetry?: boolean;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  // Normalize path so it always begins with a single slash
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${BASE_URL}${cleanPath}`, window.location.origin);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  // Return the full URL if an absolute base was provided, otherwise return relative path
  return url.origin === window.location.origin ? url.pathname + url.search : url.toString();
}

async function rawFetch(path: string, options: RequestOptions): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const gateToken = options.skipGateToken ? null : getGateToken();
  if (gateToken) headers["x-parental-gate-token"] = gateToken;

  return fetch(buildUrl(path, options.query), {
    method: options.method ?? "GET",
    headers,
    credentials: "include", // carries the httpOnly refresh-token cookie
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { data } = await requestEnvelope<T>(path, options);
  return data;
}

export async function requestPaginated<T>(
  path: string,
  options: RequestOptions = {}
): Promise<{ data: T; meta: { page: number; limit: number; total: number; totalPages: number } }> {
  const { data, meta } = await requestEnvelope<T>(path, options);
  return { 
    data, 
    meta: (meta as { page: number; limit: number; total: number; totalPages: number }) ?? { page: 1, limit: 0, total: 0, totalPages: 1 } 
  };
}

async function requestEnvelope<T>(
  path: string,
  options: RequestOptions
): Promise<{ data: T; meta?: unknown }> {
  const res = await rawFetch(path, options);
  const json = (await res.json().catch(() => null)) as ApiSuccessEnvelope<T> | ApiErrorEnvelope | null;

  if (res.ok && json?.success) {
    return { data: json.data, meta: json.meta };
  }

  const errorBody = json && !json.success ? json.error : undefined;
  const code = errorBody?.code ?? "UNKNOWN_ERROR";
  const message = errorBody?.message ?? `Request failed (${res.status})`;

  const isAuthEndpoint = path.startsWith("/auth/") || path.startsWith("auth/");
  if (res.status === 401 && !isAuthEndpoint && !options._isRetry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return requestEnvelope<T>(path, { ...options, _isRetry: true });
    }
    setAccessToken(null);
  }

  throw new ApiError(res.status, code, message, errorBody?.details);
}