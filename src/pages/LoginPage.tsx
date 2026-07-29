import { AxiosError } from "axios";
import { ArrowRight, ChevronDown, Droplets, Home, Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Modal } from "../components/Modal";
import { Footer } from "../components/Footer";
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
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (roleMenuRef.current && !roleMenuRef.current.contains(event.target as Node)) {
        setRoleMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    <main className="login-bg flex min-h-screen flex-col p-3 text-[#22314A] sm:p-6 animate-[fadeIn_0.6s_ease-out]">
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes riseIn {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(18px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.96); }
          100% { opacity: 1; transform: scale(1); }
        }
      `}</style>
      <section className="mx-auto grid w-full flex-1 max-w-7xl overflow-hidden rounded-[32px] border border-white/70 bg-white/92 shadow-[0_30px_80px_-40px_rgba(43,108,176,0.35)] transition-shadow duration-500 hover:shadow-[0_35px_90px_-35px_rgba(43,108,176,0.4)] lg:grid-cols-[0.85fr_1.15fr]">
        {/* Form side */}
        <div className="flex items-center bg-white p-6 sm:p-10">
          <div className="w-full [animation:riseIn_0.55s_ease-out_both]">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#2B6CB0] transition-transform duration-300 hover:translate-x-0.5">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#EAF4FB] transition-transform duration-300 hover:scale-105">
                <Droplets size={20} />
              </span>
              AquaPulse
            </div>

            <p className="mt-8 text-sm font-medium uppercase tracking-[0.28em] text-[#5B9BD5]">
              Residential RWH platform
            </p>
            <h2 className="mt-3 text-4xl font-semibold leading-tight text-[#1B2B45] transition-all duration-300 [animation:riseIn_0.6s_ease-out_0.05s_both]">
              {mode === "login" ? "Welcome back" : "Create your space"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[#5B6B85] [animation:riseIn_0.6s_ease-out_0.1s_both]">
              {mode === "login"
                ? "Sign in to check on your society's rainwater storage and rainfall."
                : "Set up an account to start tracking your society's rainwater harvesting."}
            </p>

            <form className="mt-8 grid gap-4" onSubmit={submit}>
              {mode === "signup" && (
                <input
                  required
                  autoComplete="name"
                  placeholder="Full name"
                  value={form.fullName}
                  onChange={(event) => setForm({ ...form, fullName: event.target.value })}
                  className="h-12 rounded-2xl border border-[#D7E6F5] bg-[#F7FBFE] px-4 text-sm text-[#22314A] placeholder:text-[#8FA4C0] transition-all duration-300 ease-out focus:border-[#2B6CB0] focus:outline-none focus:ring-2 focus:ring-[#2B6CB0]/20 focus:scale-[1.01] [animation:riseIn_0.4s_ease-out_both]"
                />
              )}
              <input
                required
                autoComplete="email"
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                className="h-12 rounded-2xl border border-[#D7E6F5] bg-[#F7FBFE] px-4 text-sm text-[#22314A] placeholder:text-[#8FA4C0] transition-all duration-300 ease-out focus:border-[#2B6CB0] focus:outline-none focus:ring-2 focus:ring-[#2B6CB0]/20 focus:scale-[1.01]"
              />
              <input
                required
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
                className="h-12 rounded-2xl border border-[#D7E6F5] bg-[#F7FBFE] px-4 text-sm text-[#22314A] placeholder:text-[#8FA4C0] transition-all duration-300 ease-out focus:border-[#2B6CB0] focus:outline-none focus:ring-2 focus:ring-[#2B6CB0]/20 focus:scale-[1.01]"
              />
              {mode === "signup" && (
                <div className="relative [animation:riseIn_0.4s_ease-out_both]" ref={roleMenuRef}>
                  <button
                    type="button"
                    onClick={() => setRoleMenuOpen((open) => !open)}
                    className="flex h-12 w-full items-center justify-between rounded-2xl border border-[#D7E6F5] bg-[#F7FBFE] px-4 text-left text-sm text-[#22314A] transition-all duration-300 ease-out focus:border-[#2B6CB0] focus:outline-none focus:ring-2 focus:ring-[#2B6CB0]/20"
                    aria-haspopup="listbox"
                    aria-expanded={roleMenuOpen}
                  >
                    {form.role === "ADMIN" ? "Admin" : "Resident"}
                    <ChevronDown
                      size={18}
                      className={`text-[#8FA4C0] transition-transform duration-300 ${roleMenuOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  <div
                    role="listbox"
                    className={`z-20 origin-top overflow-hidden rounded-2xl border border-[#D7E6F5] bg-white p-1.5 shadow-[0_18px_40px_-16px_rgba(43,108,176,0.35)] transition-all duration-200 ease-out ${
                      roleMenuOpen
                        ? "pointer-events-auto mt-2 max-h-40 scale-100 opacity-100"
                        : "pointer-events-none mt-0 max-h-0 scale-95 border-transparent p-0 opacity-0"
                    }`}
                  >
                    {[
                      { value: "ADMIN", label: "Admin" },
                      { value: "RESIDENT", label: "Resident" },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        role="option"
                        aria-selected={form.role === option.value}
                        onClick={() => {
                          setForm({ ...form, role: option.value });
                          setRoleMenuOpen(false);
                        }}
                        className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                          form.role === option.value
                            ? "bg-[#2B6CB0] text-white"
                            : "text-[#22314A] hover:bg-[#EAF4FB]"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {error && (
                <p className="rounded-2xl bg-[#FDECEC] px-4 py-3 text-sm text-[#B3413C] [animation:popIn_0.3s_ease-out_both]">{error}</p>
              )}
              <button
                className="h-12 rounded-2xl bg-[#2B6CB0] text-sm font-semibold text-white transition-all duration-300 ease-out hover:bg-[#245C97] hover:shadow-lg hover:shadow-[#2B6CB0]/25 active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
                disabled={saving}
              >
                {saving ? "Working..." : mode === "login" ? "Sign in" : "Create account"}
              </button>
            </form>

            <div className="mt-5 min-h-11 transition-opacity duration-300" id="googleSignIn" />
            {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
              <p className="mt-2 text-xs text-[#8FA4C0]">Set VITE_GOOGLE_CLIENT_ID to enable Google Sign-In.</p>
            )}
            {googleError && (
              <p className="mt-3 rounded-2xl bg-[#FDECEC] px-4 py-3 text-sm text-[#B3413C] [animation:popIn_0.3s_ease-out_both]">{googleError}</p>
            )}

            <button
              type="button"
              className="mt-8 text-sm text-[#5B6B85] underline decoration-[#B7CDE3] underline-offset-4 transition-colors duration-300 hover:text-[#2B6CB0] hover:decoration-[#2B6CB0]"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Need an account? Sign up" : "Already registered? Sign in"}
            </button>
          </div>
        </div>

        {/* Illustration side */}
        <div className="relative hidden min-h-[320px] overflow-hidden bg-gradient-to-b from-[#BFE3F7] via-[#8FCBEC] to-[#2B6CB0] lg:block [animation:slideInRight_0.6s_ease-out_both]">
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 600 800"
            preserveAspectRatio="xMidYMid slice"
            fill="none"
          >
            <defs>
              <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFFDF5" stopOpacity="0.9" />
                <stop offset="55%" stopColor="#FFF6DA" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#FFF6DA" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="sunCore" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#FFFDF6" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#FFF3C4" stopOpacity="0.6" />
              </radialGradient>
              <linearGradient id="skyDepth" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#D8EFFB" stopOpacity="0.5" />
                <stop offset="100%" stopColor="#2B6CB0" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* soft sky depth wash */}
            <rect x="0" y="0" width="600" height="420" fill="url(#skyDepth)" />

            {/* sun glow, upper right, out of the way of the copy */}
            <circle cx="460" cy="150" r="150" fill="url(#sunGlow)" />
            <circle cx="460" cy="150" r="46" fill="url(#sunCore)">
              <animate attributeName="r" values="44;50;44" dur="6s" repeatCount="indefinite" />
            </circle>

            {/* distant hazy hills for depth */}
            <path d="M-20 300 Q120 260 260 300 Q380 330 620 290 V420 H-20 Z" fill="#E7F4FC" opacity="0.35" />

            {/* birds */}
            <g stroke="white" strokeOpacity="0.75" strokeWidth="3" strokeLinecap="round" fill="none">
              <path d="M60 130 Q68 122 76 130 Q84 122 92 130">
                <animate attributeName="opacity" values="0.9;0.5;0.9" dur="5s" repeatCount="indefinite" />
              </path>
              <path d="M95 118 Q101 112 107 118 Q113 112 119 118">
                <animate attributeName="opacity" values="0.6;0.9;0.6" dur="6s" repeatCount="indefinite" />
              </path>
            </g>

            {/* clouds */}
            <ellipse cx="120" cy="110" rx="70" ry="26" fill="white" opacity="0.55">
              <animate attributeName="cx" values="120;135;120" dur="8s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="170" cy="95" rx="46" ry="20" fill="white" opacity="0.5">
              <animate attributeName="cx" values="170;155;170" dur="9s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="340" cy="250" rx="52" ry="18" fill="white" opacity="0.3">
              <animate attributeName="cx" values="340;322;340" dur="11s" repeatCount="indefinite" />
            </ellipse>
            <ellipse cx="90" cy="300" rx="60" ry="20" fill="white" opacity="0.22">
              <animate attributeName="cx" values="90;108;90" dur="12s" repeatCount="indefinite" />
            </ellipse>

            {/* rain */}
            <g stroke="white" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round">
              <line x1="150" y1="160" x2="138" y2="205">
                <animate attributeName="opacity" values="0.2;0.7;0.2" dur="1.1s" repeatCount="indefinite" />
              </line>
              <line x1="185" y1="150" x2="173" y2="200">
                <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.3s" repeatCount="indefinite" />
              </line>
              <line x1="120" y1="175" x2="110" y2="215">
                <animate attributeName="opacity" values="0.4;0.8;0.4" dur="1.4s" repeatCount="indefinite" />
              </line>
              <line x1="410" y1="140" x2="398" y2="185">
                <animate attributeName="opacity" values="0.2;0.7;0.2" dur="1.2s" repeatCount="indefinite" />
              </line>
              <line x1="445" y1="150" x2="433" y2="195">
                <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1.5s" repeatCount="indefinite" />
              </line>
              <line x1="475" y1="135" x2="465" y2="175">
                <animate attributeName="opacity" values="0.3;0.8;0.3" dur="1.1s" repeatCount="indefinite" />
              </line>
            </g>

            {/* rooftop + tank, simple flat illustration */}
            <g>
              <ellipse cx="300" cy="494" rx="100" ry="14" fill="#1B2B45" opacity="0.08" />
              <polygon points="230,420 300,360 370,420" fill="#F7FBFE" opacity="0.92" />
              <rect x="245" y="420" width="110" height="70" fill="#EAF4FB" opacity="0.92" />
              <rect x="270" y="440" width="26" height="50" rx="3" fill="#BFE3F7" opacity="0.8" />
              <rect x="365" y="430" width="46" height="80" rx="8" fill="#1B2B45" opacity="0.85" />
              <rect x="365" y="430" width="46" height="18" rx="8" fill="#2B6CB0" opacity="0.9" />
              <line x1="330" y1="392" x2="365" y2="450" stroke="#8FCBEC" strokeWidth="3" strokeOpacity="0.7" strokeLinecap="round" />
            </g>

            {/* layered waves with shimmer */}
            <path d="M0 560 Q150 520 300 560 T600 560 V800 H0 Z" fill="#DDF0FB" opacity="0.5" />
            <path d="M0 620 Q150 580 300 620 T600 620 V800 H0 Z" fill="#BFE3F7" opacity="0.7" />
            <path d="M0 690 Q150 650 300 690 T600 690 V800 H0 Z" fill="#8FCBEC" />
            <g stroke="white" strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round">
              <line x1="120" y1="640" x2="200" y2="640">
                <animate attributeName="opacity" values="0.15;0.5;0.15" dur="3.5s" repeatCount="indefinite" />
              </line>
              <line x1="380" y1="660" x2="470" y2="660">
                <animate attributeName="opacity" values="0.4;0.15;0.4" dur="4s" repeatCount="indefinite" />
              </line>
              <line x1="240" y1="710" x2="330" y2="710">
                <animate attributeName="opacity" values="0.2;0.5;0.2" dur="4.5s" repeatCount="indefinite" />
              </line>
            </g>
          </svg>

          <div className="relative z-10 flex h-full flex-col justify-end p-10 text-white sm:p-14">
            <h1 className="max-w-sm text-4xl font-semibold leading-tight sm:text-5xl [animation:riseIn_0.7s_ease-out_0.15s_both]">
              Every drop, accounted for.
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-6 text-white/85 [animation:riseIn_0.7s_ease-out_0.25s_both]">
              Monitor storage, rainfall, and maintenance across your society from one calm, connected dashboard.
            </p>
          </div>
        </div>
      </section>

      {pendingGoogleSignup && (
        <Modal title="Choose your role" onClose={() => setPendingGoogleSignup(null)}>
          <div className="grid gap-4 [animation:popIn_0.25s_ease-out_both]">
            <div className="rounded-[24px] border border-[#D7E6F5] bg-[#F7FBFE] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[#5B9BD5]">Confirming new account</p>
              <p className="mt-2 text-lg font-semibold text-[#1B2B45]">{pendingGoogleSignup.fullName}</p>
              <p className="mt-1 text-sm text-[#5B6B85]">{pendingGoogleSignup.email}</p>
            </div>

            <p className="text-sm leading-6 text-[#5B6B85]">
              Choose the path that matches your new AquaPulse account.
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                className="w-full rounded-[24px] bg-[#2B6CB0] px-4 py-4 text-left text-white transition-all duration-300 ease-out hover:bg-[#245C97] hover:shadow-lg hover:shadow-[#2B6CB0]/25 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-60 disabled:hover:translate-y-0"
                style={{
                  minHeight: 140,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  flexDirection: "column",
                }}
                onClick={() => completeRoleSelection("ADMIN")}
                disabled={saving}
              >
                <span className="flex items-center gap-2 text-base font-semibold">
                  <Shield size={18} />
                  I&apos;m an Admin
                </span>
                <span className="text-sm font-normal leading-6 text-white/80">
                  Create and manage your society&apos;s rainwater harvesting setup.
                </span>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.2em]">
                  {saving && googleRole === "ADMIN" ? "Completing..." : "Create and manage"}
                  <ArrowRight size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
                </span>
              </button>

              <button
                type="button"
                className="w-full rounded-[24px] border border-[#D7E6F5] bg-white px-4 py-4 text-left text-[#1B2B45] transition-all duration-300 ease-out hover:bg-[#F7FBFE] hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] disabled:opacity-60 disabled:hover:translate-y-0"
                style={{
                  minHeight: 140,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "flex-start",
                  flexDirection: "column",
                }}
                onClick={() => completeRoleSelection("RESIDENT")}
                disabled={saving}
              >
                <span className="flex items-center gap-2 text-base font-semibold">
                  <Home size={18} />
                  I&apos;m a Resident
                </span>
                <span className="text-sm font-normal leading-6 text-[#5B6B85]">
                  Join your society and view the rainwater data shared with you.
                </span>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#2B6CB0]">
                  {saving && googleRole === "RESIDENT" ? "Completing..." : "Join and view"}
                  <ArrowRight size={14} />
                </span>
              </button>
            </div>

            {googleError && (
              <p className="rounded-2xl bg-[#FDECEC] px-4 py-3 text-sm text-[#B3413C] [animation:popIn_0.3s_ease-out_both]">{googleError}</p>
            )}
          </div>
        </Modal>
      )}
      <Footer className="mt-3" />
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
