export type Role = "ADMIN" | "RESIDENT";
export type MaintenanceStatus = "PENDING" | "COMPLETED" | "OVERDUE";

export interface AuthResponse {
  token: string;
  email: string;
  fullName: string;
  role: Role;
}

export interface GoogleAuthResponse {
  needsRoleSelection: boolean;
  authResponse: AuthResponse | null;
  pendingEmail: string | null;
  pendingFullName: string | null;
}

export interface RegisterResponse {
  message: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest extends LoginRequest {
  fullName: string;
  role?: Role;
  societyId?: number;
}

export interface GoogleAuthRequest {
  idToken: string;
}

export interface FacebookAuthRequest {
  accessToken: string;
}

export interface CompleteGoogleSignupRequest {
  email: string;
  fullName: string;
  role: Role;
}

export interface VerifyOtpRequest {
  email: string;
  code: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

export interface SocietyRequest {
  name: string;
  address: string;
  city?: string;
}

export interface SocietyResponse extends SocietyRequest {
  id: number;
  inviteCode: string;
}

export interface RWHUnitRequest {
  tankCapacityLiters: number;
  rooftopAreaSqm: number;
  installDate?: string;
  societyId: number;
}

export interface RWHUnitResponse extends RWHUnitRequest {
  id: number;
  societyName: string;
}

export interface WaterReadingRequest {
  readingDate: string;
  waterCollectedLiters: number;
  storageLevelPercent: number;
  rainfallMm?: number;
  unitId: number;
}

export interface WaterReadingResponse extends WaterReadingRequest {
  id: number;
}

export interface MaintenanceLogRequest {
  maintenanceDate: string;
  type: string;
  status: MaintenanceStatus;
  notes?: string;
  nextDueDate?: string;
  unitId: number;
}

export interface MaintenanceLogResponse extends MaintenanceLogRequest {
  id: number;
}

export interface WeatherRainfallResponse {
  city: string;
  rainfallMm: number;
}

export interface InsightResponse {
  insight: string;
}
