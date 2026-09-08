import axios from "axios";
import { API_BASE_URL } from "../lib/config";

export const AUTH_TOKEN_KEY = "payroll.auth.token";
export const AUTH_USER_KEY = "payroll.auth.user";
export const AUTH_VIEW_MODE_KEY = "payroll.auth.viewMode";

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ApiErrorDetails {
  status?: number;
  message: string;
  fieldErrors?: Record<string, string>;
}

export function getApiError(error: unknown): ApiErrorDetails {
  if (axios.isAxiosError(error)) {
    const responseData = error.response?.data as
      | { message?: unknown; fieldErrors?: Record<string, string> }
      | undefined;

    return {
      status: error.response?.status,
      message: typeof responseData?.message === "string" ? responseData.message : error.message,
      fieldErrors: responseData?.fieldErrors,
    };
  }

  return { message: "Something went wrong" };
}

export function getErrorMessage(error: unknown) {
  return getApiError(error).message;
}
