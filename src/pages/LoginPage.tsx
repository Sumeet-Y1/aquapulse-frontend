import { AxiosError } from "axios";
import { ArrowRight, Droplets, Home, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../services/api";
import type { Role } from "../types/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

type GooglePendingSignup = {
  email: string;
  fullName: string;
};

export function LoginPage() {
  const { isAuthenticated, login, register, googleLogin, completeGoogleSignup } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [form, setForm] = useState({ fullName: "", email: "", password: "", role: "ADMIN" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [pendingGoogleSignup, setPendingGoogleSignup] = useState<GooglePendingSignup | null>(null);
  const [googleRole, setGoogleRole] = useState<Role | null>(null);
  const [googleError, setGoogleError] = useState("");

  useEffect(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) return;

    const initializeGoogle = () => {
      window.google?.accounts.id.initialize({
        client_id: clientId,
        callback: async ({ credential }) => {
          try {
            setError("");
            setGoogleError("");
            const response = await googleLogin(credential);

            if (response.needsRoleSelection) {
              if (!response.pendingEmail || !response.pendingFullName) {
                setGoogleError("Google sign-in needs role selection, but the account details were incomplete.");
                return;
              }

              setPendingGoogleSignup({
                email: response.pendingEmail,
                fullName: response.pendingFullName,
              });
              return;
            }

            if (response.authResponse) {
              navigate("/");
              return;
            }

            setGoogleError("Google sign-in returned an unexpected response.");
          } catch (caught) {
            setGoogleError(getApiErrorMessage(caught, "Unable to sign in with Google."));
          }
        },
      });

      const button = document.getElementById("googleSignIn");
      if (button) {
        window.google?.accounts.id.renderButton(button, { theme: "outline", size: "large", width: 280 });
      }
    };

    const existingScript = document.getElementById("google-client-script") as HTMLScriptElement | null;
    if (window.google?.accounts.id) {
      initializeGoogle();
      return;
    }

    if (existingScript) {
      existingScript.addEventListener("load", initializeGoogle, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "google-client-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = initializeGoogle;
    document.body.appendChild(script);
  }, [googleLogin, navigate]);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await register({ fullName: form.fullName, email: form.email, password: form.password, role: form.role as Role });
      }
      navigate("/");
    } catch (caught) {
      setError(getError(caught));
    } finally {
      setSaving(false);
    }
  };

  const completeRoleSelection = async (role: Role) => {
    if (!pendingGoogleSignup) return;
    setSaving(true);
    setGoogleRole(role);
    setGoogleError("");

    try {
      await completeGoogleSignup({
        email: pendingGoogleSignup.email,
        fullName: pendingGoogleSignup.fullName,
        role,
      });
      setPendingGoogleSignup(null);
      navigate("/");
    } catch (caught) {
      setGoogleError(getError(caught));
    } finally {
      setSaving(false);
      setGoogleRole(null);
    }
  };

  return (
    <main className="login-bg min-h-screen p-3 text-mist sm:p-6">
      <section className="mx-auto grid min-h-[calc(100vh-24px)] max-w-6xl overflow-hidden rounded-[32px] border border-white/15 bg-charcoal shadow-glass lg:grid-cols-[1.08fr_0.92fr]">
        <div className="login-visual relative min-h-[320px] p-8">
          <div className="relative z-10 flex items-center gap-2 text-sm font-semibold">
            <span className="grid h-10 w-10 place-items-center rounded-full border border-white/40 bg-white/10">
              <Droplets size={20} />
            </span>
            AquaPulse
          </div>
          <div className="relative z-10 mt-40 max-w-md md:mt-64">
            <h1 className="font-serif text-4xl leading-tight md:text-6xl">Harvest rain. Live lighter.</h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/75">
              Monitor society storage, rainfall, maintenance, and AI insights from one calm command center.
            </p>
          </div>
        </div>
        <div className="flex items-center bg-[#101410] p-6 sm:p-10">
          <div className="w-full">
            <p className="text-sm uppercase tracking-[0.28em] text-leaf/80">Residential RWH Platform</p>
            <h2 className="mt-4 font-serif text-4xl leading-tight">{mode === "login" ? "Welcome back." : "Create your space."}</h2>
            <form className="mt-8 grid gap-4" onSubmit={submit}>
              {mode === "signup" && (
                <input
                  required
                  autoComplete="name"
                  placeholder="Full name"
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                />
              )}
              <input
                required
                autoComplete="email"
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
              <input
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
              {mode === "signup" && (
                <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                  <option value="ADMIN">Admin</option>
                  <option value="RESIDENT">Resident</option>
                </select>
              )}
              {error && <p className="rounded-2xl bg-red-950/50 px-4 py-3 text-sm text-red-50">{error}</p>}
              <button className="primary-btn h-12" disabled={saving}>
                {saving ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
              </button>
            </form>
            <div className="mt-5 min-h-11" id="googleSignIn" />
            {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <p className="mt-2 text-xs text-white/45">Set VITE_GOOGLE_CLIENT_ID to enable Google Sign-In.</p>
            )}
            {googleError && <p className="mt-3 rounded-2xl bg-red-950/50 px-4 py-3 text-sm text-red-50">{googleError}</p>}
            <button
              type="button"
              className="mt-8 text-sm text-white/70 underline decoration-white/25 underline-offset-4"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Need an account? Sign up" : "Already registered? Sign in"}
            </button>
          </div>
        </div>
      </section>

      {pendingGoogleSignup && (
        <Modal title="Choose your role" onClose={() => setPendingGoogleSignup(null)}>
          <div className="grid gap-4">
            <div className="rounded-[24px] border border-white/12 bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/45">Confirming new account</p>
              <p className="mt-2 text-lg font-semibold">{pendingGoogleSignup.fullName}</p>
              <p className="mt-1 text-sm text-white/60">{pendingGoogleSignup.email}</p>
            </div>

            <p className="text-sm leading-6 text-white/68">
              Choose the path that matches your new AquaPulse account.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="primary-btn w-full rounded-[24px] px-4 py-4"
                style={{
                  minHeight: 140,
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  flexDirection: "column",
                  textAlign: "left",
                  whiteSpace: "normal",
                }}
                onClick={() => completeRoleSelection("ADMIN")}
                disabled={saving}
              >
                <span className="flex items-center gap-2 text-base">
                  <Shield size={18} />
                  I&apos;m an Admin
                </span>
                <span className="text-sm font-normal leading-6 text-charcoal/80">
                  Create and manage your society&apos;s rainwater harvesting setup.
                </span>
                <span className="mt-auto inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em]">
                  {saving && googleRole === "ADMIN" ? "Completing..." : "Create and manage"}
                  <ArrowRight size={14} />
                </span>
              </button>

              <button
                type="button"
                className="secondary-btn w-full rounded-[24px] px-4 py-4"
                style={{
                  minHeight: 140,
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  flexDirection: "column",
                  textAlign: "left",
                  whiteSpace: "normal",
                }}
                onClick={() => completeRoleSelection("RESIDENT")}
                disabled={saving}
              >
                <span className="flex items-center gap-2 text-base">
                  <Home size={18} />
                  I&apos;m a Resident
                </span>
                <span className="text-sm font-normal leading-6 text-white/70">
                  Join your society and view the rainwater data shared with you.
                </span>
                <span className="mt-auto inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em]">
                  {saving && googleRole === "RESIDENT" ? "Completing..." : "Join and view"}
                  <ArrowRight size={14} />
                </span>
              </button>
            </div>

            {googleError && <p className="rounded-2xl bg-red-950/50 px-4 py-3 text-sm text-red-50">{googleError}</p>}
          </div>
        </Modal>
      )}
    </main>
  );
}

function getError(error: unknown) {
  if (error instanceof AxiosError) {
    if (error.message === "Network Error") {
      return "Can't reach the backend right now. Make sure the Spring Boot server is running.";
    }
    return getApiErrorMessage(error);
  }
  return "Something went wrong. Please try again.";
}
