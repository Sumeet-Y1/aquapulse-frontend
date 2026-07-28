import { createContext, useContext, useMemo, useState } from "react";
import { authApi, tokenStore, userStore } from "../services/api";
import type {
  AuthResponse,
  CompleteGoogleSignupRequest,
  GoogleAuthResponse,
  LoginRequest,
  RegisterRequest,
} from "../types/api";

interface AuthContextValue {
  user: AuthResponse | null;
  isAuthenticated: boolean;
  login: (payload: LoginRequest) => Promise<void>;
  register: (payload: RegisterRequest) => Promise<void>;
  googleLogin: (idToken: string) => Promise<GoogleAuthResponse>;
  completeGoogleSignup: (payload: CompleteGoogleSignupRequest) => Promise<AuthResponse>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthResponse | null>(() => userStore.get());

  const persist = (nextUser: AuthResponse) => {
    tokenStore.set(nextUser.token);
    userStore.set(nextUser);
    setUser(nextUser);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user && tokenStore.get()),
      login: async (payload) => persist(await authApi.login(payload)),
      register: async (payload) => persist(await authApi.register(payload)),
      googleLogin: async (idToken) => {
        const response = await authApi.google({ idToken });
        if (response.authResponse) {
          persist(response.authResponse);
        }
        return response;
      },
      completeGoogleSignup: async (payload) => {
        const authResponse = await authApi.googleComplete(payload);
        persist(authResponse);
        return authResponse;
      },
      logout: () => {
        tokenStore.clear();
        userStore.clear();
        setUser(null);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
