import axios from "axios";
import { API_BASE_URL } from "../lib/config";

export const AUTH_TOKEN_KEY = "payroll.auth.token";
export const AUTH_USER_KEY = "payroll.auth.user";

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

export function getErrorMessage(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message ?? error.message;
  }
  return "Something went wrong";
}
