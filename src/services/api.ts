import axios from "axios";
import type {
  AuthResponse,
  CompleteGoogleSignupRequest,
  FacebookAuthRequest,
  ForgotPasswordRequest,
  GoogleAuthRequest,
  GoogleAuthResponse,
  InsightResponse,
  LoginRequest,
  MaintenanceLogRequest,
  MaintenanceLogResponse,
  RegisterResponse,
  RegisterRequest,
  RWHUnitRequest,
  RWHUnitResponse,
  SocietyRequest,
  SocietyResponse,
  ResetPasswordRequest,
  VerifyOtpRequest,
  WaterReadingRequest,
  WaterReadingResponse,
  WeatherRainfallResponse,
} from "../types/api";

const TOKEN_KEY = "aquapulse_token";
const USER_KEY = "aquapulse_user";
const memoryStorage = new Map<string, string>();
const DEFAULT_LOCAL_API_URL = "http://localhost:8080";
const DEFAULT_PROD_API_URL = "https://aquapulse-kbbf.onrender.com";

function readStorage(key: string) {
  try {
    return window.localStorage.getItem(key) ?? memoryStorage.get(key) ?? null;
  } catch {
    return memoryStorage.get(key) ?? null;
  }
}

function writeStorage(key: string, value: string) {
  memoryStorage.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Some embedded browsers restrict storage; memory fallback keeps the session usable.
  }
}

function removeStorage(key: string) {
  memoryStorage.delete(key);
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage restrictions.
  }
}

export const tokenStore = {
  get: () => readStorage(TOKEN_KEY),
  set: (token: string) => writeStorage(TOKEN_KEY, token),
  clear: () => removeStorage(TOKEN_KEY),
};

export const userStore = {
  get: () => {
    const raw = readStorage(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthResponse) : null;
  },
  set: (user: AuthResponse) => writeStorage(USER_KEY, JSON.stringify(user)),
  clear: () => removeStorage(USER_KEY),
};

export const api = axios.create({
  baseURL:
    (import.meta.env.VITE_API_URL as string | undefined)?.trim() ||
    (import.meta.env.DEV ? DEFAULT_LOCAL_API_URL : DEFAULT_PROD_API_URL),
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = tokenStore.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const unwrap = <T>(promise: Promise<{ data: T }>) => promise.then((response) => response.data);

export function getApiErrorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (axios.isAxiosError(error)) {
    if (error.message === "Network Error") {
      return "Can't reach the backend right now. Make sure the Spring Boot server is running.";
    }

    const status = error.response?.status;
    const responseData = error.response?.data;
    const responseMessage =
      typeof responseData === "string"
        ? responseData
        : (responseData as { message?: string; error?: string } | undefined)?.message ??
          (responseData as { error?: string } | undefined)?.error ??
          error.message;

    if (status === 403) {
      return "You don't have permission to do that.";
    }

    if (status === 401) {
      return "Your session expired. Please sign in again.";
    }

    if (typeof responseMessage === "string" && responseMessage.toLowerCase().includes("already exists")) {
      return "This Google account was created moments ago. Please try signing in again.";
    }

    return responseMessage || fallback;
  }

  return fallback;
}

export const authApi = {
  login: (payload: LoginRequest) => unwrap(api.post<AuthResponse>("/api/auth/login", payload)),
  register: (payload: RegisterRequest) => unwrap(api.post<RegisterResponse>("/api/auth/register", payload)),
  verifyEmail: (payload: VerifyOtpRequest) => unwrap(api.post<AuthResponse>("/api/auth/verify-email", payload)),
  resendVerification: (email: string) => unwrap(api.post<{ message: string }>("/api/auth/resend-verification", { email })),
  forgotPassword: (payload: ForgotPasswordRequest) =>
    unwrap(api.post<{ message: string }>("/api/auth/forgot-password", payload)),
  resetPassword: (payload: ResetPasswordRequest) =>
    unwrap(api.post<{ message: string }>("/api/auth/reset-password", payload)),
  google: (payload: GoogleAuthRequest) => unwrap(api.post<GoogleAuthResponse>("/api/auth/google", payload)),
  facebook: (payload: FacebookAuthRequest) => unwrap(api.post<GoogleAuthResponse>("/api/auth/facebook", payload)),
  googleComplete: (payload: CompleteGoogleSignupRequest) =>
    unwrap(api.post<AuthResponse>("/api/auth/google/complete", payload)),
};

export const societiesApi = {
  my: () => unwrap(api.get<SocietyResponse[]>("/api/societies/my")),
  create: (payload: SocietyRequest) => unwrap(api.post<SocietyResponse>("/api/societies", payload)),
  join: (inviteCode: string) => unwrap(api.post<SocietyResponse>("/api/societies/join", { inviteCode })),
  update: (id: number, payload: SocietyRequest) => unwrap(api.put<SocietyResponse>(`/api/societies/${id}`, payload)),
  remove: (id: number) => unwrap(api.delete<void>(`/api/societies/${id}`)),
};

export const unitsApi = {
  bySociety: (societyId: number) => unwrap(api.get<RWHUnitResponse[]>(`/api/units/society/${societyId}`)),
  get: (id: number) => unwrap(api.get<RWHUnitResponse>(`/api/units/${id}`)),
  create: (payload: RWHUnitRequest) => unwrap(api.post<RWHUnitResponse>("/api/units", payload)),
  update: (id: number, payload: RWHUnitRequest) => unwrap(api.put<RWHUnitResponse>(`/api/units/${id}`, payload)),
  remove: (id: number) => unwrap(api.delete<void>(`/api/units/${id}`)),
};

export const readingsApi = {
  byUnit: (unitId: number) => unwrap(api.get<WaterReadingResponse[]>(`/api/readings/unit/${unitId}`)),
  create: (payload: WaterReadingRequest) => unwrap(api.post<WaterReadingResponse>("/api/readings", payload)),
  remove: (id: number) => unwrap(api.delete<void>(`/api/readings/${id}`)),
};

export const maintenanceApi = {
  byUnit: (unitId: number) => unwrap(api.get<MaintenanceLogResponse[]>(`/api/maintenance/unit/${unitId}`)),
  create: (payload: MaintenanceLogRequest) => unwrap(api.post<MaintenanceLogResponse>("/api/maintenance", payload)),
  update: (id: number, payload: MaintenanceLogRequest) =>
    unwrap(api.put<MaintenanceLogResponse>(`/api/maintenance/${id}`, payload)),
  remove: (id: number) => unwrap(api.delete<void>(`/api/maintenance/${id}`)),
};

export const weatherApi = {
  rainfall: (city: string) => unwrap(api.get<WeatherRainfallResponse>("/api/weather/rainfall", { params: { city } })),
};

export const insightsApi = {
  byUnit: (unitId: number) => unwrap(api.get<InsightResponse>(`/api/insights/unit/${unitId}`)),
};
