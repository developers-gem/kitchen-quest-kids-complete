import { request } from "./client";
import type { Organization, User } from "../types/api";

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  familyName?: string;
  consentAcknowledged: true;
  timezone?: string;
}

export interface RegisterResponse extends AuthTokens {
  user: User;
  organization: Organization;
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export function register(input: RegisterInput) {
  return request<RegisterResponse>("/auth/register", { method: "POST", body: input });
}

export function login(email: string, password: string) {
  return request<LoginResponse>("/auth/login", { method: "POST", body: { email, password } });
}

export function refresh() {
  // Refresh token is carried via the httpOnly cookie set at login/register;
  // the body field exists for completeness (e.g. non-browser clients) but
  // the web app never needs to supply it explicitly.
  return request<AuthTokens>("/auth/refresh", { method: "POST", body: {} });
}

export function logout() {
  return request<void>("/auth/logout", { method: "POST", body: {} });
}

export function forgotPassword(email: string) {
  return request<void>("/auth/forgot-password", { method: "POST", body: { email } });
}

export function resetPassword(token: string, password: string) {
  return request<void>("/auth/reset-password", { method: "POST", body: { token, password } });
}

export function verifyEmail(token: string) {
  return request<void>("/auth/verify-email", { method: "POST", body: { token } });
}

export interface ParentalGateChallenge {
  question: string;
  challengeToken: string;
}

export function requestParentalGateChallenge() {
  return request<ParentalGateChallenge>("/auth/parental-gate/challenge", { method: "POST" });
}

export function verifyParentalGate(challengeToken: string, answer: number) {
  return request<{ gateToken: string }>("/auth/parental-gate/verify", {
    method: "POST",
    body: { challengeToken, answer },
  });
}
