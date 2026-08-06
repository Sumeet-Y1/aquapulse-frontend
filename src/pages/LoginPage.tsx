import { AxiosError } from "axios";
import { ArrowLeft, ArrowRight, ChevronDown, Droplets, Home, KeyRound, RotateCcw, Shield } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Modal } from "../components/Modal";
import { useAuth } from "../context/AuthContext";
import { getApiErrorMessage } from "../services/api";
import type { GoogleAuthResponse, Role } from "../types/api";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

type AuthScreen = "login" | "signup" | "verify-email" | "forgot-request" | "forgot-reset";

type PendingSocialSignup = {
  provider: "Google";
  email: string;
  fullName: string;
};

export function LoginPage() {
  const {
    isAuthenticated,
    login,
    register,
    verifyEmail,
    resendVerification,
    forgotPassword,
    resetPassword,
    googleLogin,
    completeGoogleSignup,
  } = useAuth();
  const navigate = useNavigate();

  const [screen, setScreen] = useState<AuthScreen>("login");
  const [authForm, setAuthForm] = useState({ fullName: "", email: "", password: "", role: "ADMIN" });
  const [verificationForm, setVerificationForm] = useState({ email: "", code: "" });
  const [forgotForm, setForgotForm] = useState({ email: "", code: "", newPassword: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [pendingSocialSignup, setPendingSocialSignup] = useState<PendingSocialSignup | null>(null);
  const [googleRole, setGoogleRole] = useState<Role | null>(null);
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const roleMenuRef = useRef<HTMLDivElement | null>(null);
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleInitializedRef = useRef(false);

  const isPrimaryAuthScreen = screen === "login" || screen === "signup";
  const loginMode = screen === "login";
  const signupMode = screen === "signup";

  const ensureGoogleClientReady = () => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId || !window.google?.accounts?.id || googleInitializedRef.current) {
      return Boolean(googleInitializedRef.current);
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async ({ credential }) => {
        try {
          setError("");
          setNotice("");
          const response = await googleLogin(credential);
          await processSocialResponse("Google", response);
        } catch (caught) {
          setError(getApiErrorMessage(caught, "Unable to sign in with Google."));
        }
      },
    });

    googleInitializedRef.current = true;

    if (googleButtonRef.current) {
      googleButtonRef.current.innerHTML = "";
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
        shape: "pill",
        text: "signin_with",
      });
      setGoogleReady(true);
    }

    return true;
  };

  const waitForCondition = (checkFn: () => boolean, timeoutMs = 5000, intervalMs = 150) => {
    return new Promise<boolean>((resolve) => {
      const start = Date.now();

      const poll = () => {
        if (checkFn()) {
          resolve(true);
          return;
        }

        if (Date.now() - start >= timeoutMs) {
          resolve(false);
          return;
        }

        setTimeout(poll, intervalMs);
      };

      poll();
    });
  };

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
    if (screen !== "signup") {
      setRoleMenuOpen(false);
    }
  }, [screen]);

  useEffect(() => {
    if (!isPrimaryAuthScreen) return;

    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!clientId) return;

    const existingScript = document.getElementById("google-client-script") as HTMLScriptElement | null;
    if (window.google?.accounts.id) {
      ensureGoogleClientReady();
      return;
    }

    if (existingScript) {
      existingScript.addEventListener("load", ensureGoogleClientReady, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.id = "google-client-script";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.addEventListener("load", ensureGoogleClientReady, { once: true });
    document.body.appendChild(script);

    return () => {
      script.removeEventListener("load", ensureGoogleClientReady);
    };
  }, [googleLogin, isPrimaryAuthScreen]);

  if (isAuthenticated) return <Navigate to="/" replace />;

  const submitPrimaryAuth = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      if (screen === "login") {
        await login({ email: authForm.email, password: authForm.password });
        navigate("/");
        return;
      }

      const response = await register({
        fullName: authForm.fullName,
        email: authForm.email,
        password: authForm.password,
        role: authForm.role as Role,
      });

      setVerificationForm({ email: authForm.email, code: "" });
      setScreen("verify-email");
      setNotice(response.message || "Registration successful. Please check your email for a verification code.");
    } catch (caught) {
      if (screen === "login" && isUnverifiedLoginError(caught)) {
        setVerificationForm({ email: authForm.email, code: "" });
        setScreen("verify-email");
        setNotice("Please verify your email before logging in.");
      } else {
        setError(getError(caught));
      }
    } finally {
      setSaving(false);
    }
  };

  const submitVerification = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      await verifyEmail({
        email: verificationForm.email,
        code: verificationForm.code,
      });
      navigate("/");
    } catch (caught) {
      setError(getError(caught));
    } finally {
      setSaving(false);
    }
  };

  const resendVerificationCode = async () => {
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await resendVerification(verificationForm.email);
      setNotice(response.message);
    } catch (caught) {
      setError(getError(caught));
    } finally {
      setSaving(false);
    }
  };

  const submitForgotRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await forgotPassword({ email: forgotForm.email });
      setForgotForm((prev) => ({ ...prev, code: "", newPassword: "" }));
      setScreen("forgot-reset");
      setNotice(response.message);
    } catch (caught) {
      setError(getError(caught));
    } finally {
      setSaving(false);
    }
  };

  const submitForgotReset = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const response = await resetPassword({
        email: forgotForm.email,
        code: forgotForm.code,
        newPassword: forgotForm.newPassword,
      });

      setAuthForm((prev) => ({ ...prev, email: forgotForm.email, password: "" }));
      setScreen("login");
      setNotice(response.message);
      setForgotForm({ email: forgotForm.email, code: "", newPassword: "" });
    } catch (caught) {
      setError(getError(caught));
    } finally {
      setSaving(false);
    }
  };

  const handleGoogleCompleteSignup = async (role: Role) => {
    if (!pendingSocialSignup) return;
    setSaving(true);
    setGoogleRole(role);
    setError("");
    setNotice("");

    try {
      await completeGoogleSignup({
        email: pendingSocialSignup.email,
        fullName: pendingSocialSignup.fullName,
        role,
      });
      setPendingSocialSignup(null);
      navigate("/");
    } catch (caught) {
      setError(getError(caught));
    } finally {
      setSaving(false);
      setGoogleRole(null);
    }
  };

  const showLoginPrimaryActions = screen === "login" || screen === "signup";
  const processSocialResponse = async (provider: "Google", response: GoogleAuthResponse) => {
    if (response.needsRoleSelection) {
      if (!response.pendingEmail || !response.pendingFullName) {
        setError(`${provider} sign-in needs role selection, but the account details were incomplete.`);
        return;
      }

      setPendingSocialSignup({
        provider,
        email: response.pendingEmail,
        fullName: response.pendingFullName,
      });
      return;
    }

    if (response.authResponse) {
      navigate("/");
      return;
    }

    setError(`${provider} sign-in returned an unexpected response.`);
  };

  const triggerGoogleLogin = () => {
    setError("");
    setNotice("");

    const promptGoogle = () => {
      if (!ensureGoogleClientReady()) {
        return false;
      }

      window.google?.accounts?.id.prompt();
      return true;
    };

    if (promptGoogle()) {
      return;
    }

    void (async () => {
      setSaving(true);
      const becameReady = await waitForCondition(() => ensureGoogleClientReady());
      setSaving(false);

      if (!becameReady) {
        setError("Google Sign-In couldn't load. Please refresh the page and try again.");
        return;
      }

      window.google?.accounts?.id.prompt();
    })();
  };

  return (
    <main className="login-bg relative flex min-h-screen flex-col overflow-hidden p-3 text-[#22314A] sm:p-6 animate-[fadeIn_0.6s_ease-out]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(191,227,247,0.9),_transparent_34%),radial-gradient(circle_at_bottom_right,_rgba(43,108,176,0.12),_transparent_28%),linear-gradient(180deg,_#f8fcff_0%,_#eff7fd_100%)]" />
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
      <section className="relative mx-auto grid w-full flex-1 max-w-7xl overflow-hidden rounded-[36px] border border-white/80 bg-white/88 shadow-[0_30px_80px_-36px_rgba(43,108,176,0.32)] backdrop-blur-xl transition-shadow duration-500 hover:shadow-[0_40px_100px_-36px_rgba(43,108,176,0.38)] lg:grid-cols-[1fr_1.08fr]">
        <div className="flex items-center bg-[linear-gradient(180deg,_rgba(255,255,255,0.95),_rgba(247,251,254,0.92))] p-6 sm:p-10">
          <div className="w-full max-w-xl [animation:riseIn_0.55s_ease-out_both]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D7E6F5] bg-white/80 px-4 py-2 text-sm font-semibold text-[#2B6CB0] shadow-[0_14px_30px_-18px_rgba(43,108,176,0.35)] transition-transform duration-300 hover:-translate-y-0.5">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#EAF4FB]">
                <Droplets size={20} />
              </span>
              AquaPulse
            </div>

            <p className="mt-8 text-sm font-medium uppercase tracking-[0.32em] text-[#5B9BD5]">
              Residential RWH platform
            </p>
            <h2 className="mt-3 text-4xl font-semibold leading-tight text-[#13233D] transition-all duration-300 sm:text-5xl [animation:riseIn_0.6s_ease-out_0.05s_both]">
              {screen === "login"
                ? "Welcome back"
                : screen === "signup"
                  ? "Create your space"
                  : screen === "verify-email"
                    ? "Verify your email"
                    : screen === "forgot-request"
                      ? "Forgot password?"
                      : "Reset your password"}
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-7 text-[#5B6B85] sm:text-[15px] [animation:riseIn_0.6s_ease-out_0.1s_both]">
              {screen === "login"
                ? "Sign in to check on your society's rainwater storage and rainfall."
                : screen === "signup"
                  ? "Set up an account to start tracking your society's rainwater harvesting."
                  : screen === "verify-email"
                    ? "Enter the six-digit code sent to your inbox to finish creating your account."
                    : screen === "forgot-request"
                    ? "We'll send a reset code to your email if it's registered."
                      : "Use the code from your email to set a new password."}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {[
                { title: "Live data", body: "Track storage and rainfall in real time." },
                { title: "Simple access", body: "Verify once and keep your workspace in sync." },
                { title: "Clean workflow", body: "Move from sign in to dashboard without friction." },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-[#D7E6F5] bg-white/85 px-4 py-3 shadow-[0_14px_32px_-24px_rgba(43,108,176,0.45)]">
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#5B9BD5]">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-[#5B6B85]">{item.body}</p>
                </div>
              ))}
            </div>

            {notice && (
              <p className="mt-6 rounded-2xl border border-[#BFD7EC] bg-[#F7FBFE] px-4 py-3 text-sm text-[#22314A] [animation:popIn_0.3s_ease-out_both]">
                {notice}
              </p>
            )}

            {screen === "login" || screen === "signup" ? (
              <form className="mt-8 grid gap-4" onSubmit={submitPrimaryAuth}>
                {screen === "signup" && (
                  <input
                    required
                    autoComplete="name"
                    placeholder="Full name"
                    value={authForm.fullName}
                    onChange={(event) => setAuthForm({ ...authForm, fullName: event.target.value })}
                    className="h-12 rounded-2xl border border-[#D7E6F5] bg-[#F7FBFE] px-4 text-sm text-[#22314A] placeholder:text-[#8FA4C0] transition-all duration-300 ease-out focus:border-[#2B6CB0] focus:outline-none focus:ring-2 focus:ring-[#2B6CB0]/20 focus:scale-[1.01]"
                  />
                )}

                <input
                  required
                  autoComplete="email"
                  type="email"
                  placeholder="Email address"
                  value={authForm.email}
                  onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                  className="h-12 rounded-2xl border border-[#D7E6F5] bg-[#F7FBFE] px-4 text-sm text-[#22314A] placeholder:text-[#8FA4C0] transition-all duration-300 ease-out focus:border-[#2B6CB0] focus:outline-none focus:ring-2 focus:ring-[#2B6CB0]/20 focus:scale-[1.01]"
                />

                <input
                  required
                  autoComplete={loginMode ? "current-password" : "new-password"}
                  type="password"
                  placeholder="Password"
                  value={authForm.password}
                  onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                  className="h-12 rounded-2xl border border-[#D7E6F5] bg-[#F7FBFE] px-4 text-sm text-[#22314A] placeholder:text-[#8FA4C0] transition-all duration-300 ease-out focus:border-[#2B6CB0] focus:outline-none focus:ring-2 focus:ring-[#2B6CB0]/20 focus:scale-[1.01]"
                />

                {loginMode && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-sm text-[#5B6B85] underline decoration-[#B7CDE3] underline-offset-4 transition-colors duration-300 hover:text-[#2B6CB0] hover:decoration-[#2B6CB0]"
                      onClick={() => {
                        setForgotForm({ email: authForm.email, code: "", newPassword: "" });
                        setError("");
                        setNotice("");
                        setScreen("forgot-request");
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                {signupMode && (
                  <div className="relative [animation:riseIn_0.4s_ease-out_both]" ref={roleMenuRef}>
                    <button
                      type="button"
                      onClick={() => setRoleMenuOpen((open) => !open)}
                      className="flex h-12 w-full items-center justify-between rounded-2xl border border-[#D7E6F5] bg-[#F7FBFE] px-4 text-left text-sm text-[#22314A] transition-all duration-300 ease-out focus:border-[#2B6CB0] focus:outline-none focus:ring-2 focus:ring-[#2B6CB0]/20"
                      aria-haspopup="listbox"
                      aria-expanded={roleMenuOpen}
                    >
                      {authForm.role === "ADMIN" ? "Admin" : "Resident"}
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
                          aria-selected={authForm.role === option.value}
                          onClick={() => {
                            setAuthForm({ ...authForm, role: option.value });
                            setRoleMenuOpen(false);
                          }}
                          className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-150 ${
                            authForm.role === option.value
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
                  <p className="rounded-2xl bg-[#FDECEC] px-4 py-3 text-sm text-[#B3413C] [animation:popIn_0.3s_ease-out_both]">
                    {error}
                  </p>
                )}

                <button
                  className="h-12 rounded-2xl bg-[linear-gradient(135deg,_#2B6CB0,_#255E98)] text-sm font-semibold text-white shadow-[0_18px_40px_-20px_rgba(43,108,176,0.6)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:shadow-[0_26px_50px_-24px_rgba(43,108,176,0.7)] active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
                  disabled={saving}
                >
                  {saving ? "Working..." : screen === "login" ? "Sign in" : "Create account"}
                </button>
              </form>
            ) : screen === "verify-email" ? (
              <form className="mt-8 grid gap-4" onSubmit={submitVerification}>
                <input
                  required
                  autoComplete="email"
                  type="email"
                  placeholder="Email address"
                  value={verificationForm.email}
                  onChange={(event) => setVerificationForm({ ...verificationForm, email: event.target.value })}
                  className="h-12 rounded-2xl border border-[#D7E6F5] bg-[#F7FBFE] px-4 text-sm text-[#22314A] placeholder:text-[#8FA4C0] transition-all duration-300 ease-out focus:border-[#2B6CB0] focus:outline-none focus:ring-2 focus:ring-[#2B6CB0]/20 focus:scale-[1.01]"
                />
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#8FA4C0]">
                    <KeyRound size={16} />
                  </span>
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="6-digit verification code"
                    value={verificationForm.code}
                    onChange={(event) =>
                      setVerificationForm({
                        ...verificationForm,
                        code: event.target.value.replace(/\D/g, "").slice(0, 6),
                      })
                    }
                    className="h-12 rounded-2xl border border-[#D7E6F5] bg-[#F7FBFE] pl-10 pr-4 text-sm tracking-[0.34em] text-[#22314A] placeholder:tracking-normal placeholder:text-[#8FA4C0] transition-all duration-300 ease-out focus:border-[#2B6CB0] focus:outline-none focus:ring-2 focus:ring-[#2B6CB0]/20 focus:scale-[1.01]"
                  />
                </div>

                {error && (
                  <p className="rounded-2xl bg-[#FDECEC] px-4 py-3 text-sm text-[#B3413C] [animation:popIn_0.3s_ease-out_both]">
                    {error}
                  </p>
                )}

                <button
                  className="h-12 rounded-2xl bg-[#2B6CB0] text-sm font-semibold text-white transition-all duration-300 ease-out hover:bg-[#245C97] hover:shadow-lg hover:shadow-[#2B6CB0]/25 active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
                  disabled={saving}
                >
                  {saving ? "Verifying..." : "Verify"}
                </button>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    className="text-sm text-[#5B6B85] underline decoration-[#B7CDE3] underline-offset-4 transition-colors duration-300 hover:text-[#2B6CB0] hover:decoration-[#2B6CB0]"
                    onClick={resendVerificationCode}
                    disabled={saving || !verificationForm.email}
                  >
                    Resend code
                  </button>
                  <button
                    type="button"
                    className="text-sm text-[#5B6B85] transition-colors duration-300 hover:text-[#2B6CB0]"
                    onClick={() => {
                      setScreen("login");
                      setError("");
                    }}
                  >
                    Back to login
                  </button>
                </div>
              </form>
            ) : screen === "forgot-request" ? (
              <form className="mt-8 grid gap-4" onSubmit={submitForgotRequest}>
                <input
                  required
                  autoComplete="email"
                  type="email"
                  placeholder="Email address"
                  value={forgotForm.email}
                  onChange={(event) => setForgotForm({ ...forgotForm, email: event.target.value })}
                  className="h-12 rounded-2xl border border-[#D7E6F5] bg-[#F7FBFE] px-4 text-sm text-[#22314A] placeholder:text-[#8FA4C0] transition-all duration-300 ease-out focus:border-[#2B6CB0] focus:outline-none focus:ring-2 focus:ring-[#2B6CB0]/20 focus:scale-[1.01]"
                />

                {error && (
                  <p className="rounded-2xl bg-[#FDECEC] px-4 py-3 text-sm text-[#B3413C] [animation:popIn_0.3s_ease-out_both]">
                    {error}
                  </p>
                )}

                <button
                  className="h-12 rounded-2xl bg-[#2B6CB0] text-sm font-semibold text-white transition-all duration-300 ease-out hover:bg-[#245C97] hover:shadow-lg hover:shadow-[#2B6CB0]/25 active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
                  disabled={saving}
                >
                  {saving ? "Sending..." : "Send reset code"}
                </button>

                <button
                  type="button"
                  className="text-sm text-[#5B6B85] transition-colors duration-300 hover:text-[#2B6CB0]"
                  onClick={() => {
                    setScreen("login");
                    setError("");
                  }}
                >
                  Back to login
                </button>
              </form>
            ) : (
              <form className="mt-8 grid gap-4" onSubmit={submitForgotReset}>
                <input
                  required
                  autoComplete="email"
                  type="email"
                  placeholder="Email address"
                  value={forgotForm.email}
                  onChange={(event) => setForgotForm({ ...forgotForm, email: event.target.value })}
                  className="h-12 rounded-2xl border border-[#D7E6F5] bg-[#F7FBFE] px-4 text-sm text-[#22314A] placeholder:text-[#8FA4C0] transition-all duration-300 ease-out focus:border-[#2B6CB0] focus:outline-none focus:ring-2 focus:ring-[#2B6CB0]/20 focus:scale-[1.01]"
                />
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#8FA4C0]">
                    <KeyRound size={16} />
                  </span>
                  <input
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Reset code"
                    value={forgotForm.code}
                    onChange={(event) =>
                      setForgotForm({
                        ...forgotForm,
                        code: event.target.value.replace(/\D/g, "").slice(0, 6),
                      })
                    }
                    className="h-12 rounded-2xl border border-[#D7E6F5] bg-[#F7FBFE] pl-10 pr-4 text-sm tracking-[0.34em] text-[#22314A] placeholder:tracking-normal placeholder:text-[#8FA4C0] transition-all duration-300 ease-out focus:border-[#2B6CB0] focus:outline-none focus:ring-2 focus:ring-[#2B6CB0]/20 focus:scale-[1.01]"
                  />
                </div>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[#8FA4C0]">
                    <Shield size={16} />
                  </span>
                  <input
                    required
                    autoComplete="new-password"
                    type="password"
                    placeholder="New password"
                    value={forgotForm.newPassword}
                    onChange={(event) => setForgotForm({ ...forgotForm, newPassword: event.target.value })}
                    className="h-12 rounded-2xl border border-[#D7E6F5] bg-[#F7FBFE] pl-10 pr-4 text-sm text-[#22314A] placeholder:text-[#8FA4C0] transition-all duration-300 ease-out focus:border-[#2B6CB0] focus:outline-none focus:ring-2 focus:ring-[#2B6CB0]/20 focus:scale-[1.01]"
                  />
                </div>

                {error && (
                  <p className="rounded-2xl bg-[#FDECEC] px-4 py-3 text-sm text-[#B3413C] [animation:popIn_0.3s_ease-out_both]">
                    {error}
                  </p>
                )}

                <button
                  className="h-12 rounded-2xl bg-[#2B6CB0] text-sm font-semibold text-white transition-all duration-300 ease-out hover:bg-[#245C97] hover:shadow-lg hover:shadow-[#2B6CB0]/25 active:scale-[0.98] disabled:opacity-60 disabled:hover:scale-100"
                  disabled={saving}
                >
                  {saving ? "Resetting..." : "Reset password"}
                </button>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    className="inline-flex items-center gap-2 text-sm text-[#5B6B85] underline decoration-[#B7CDE3] underline-offset-4 transition-colors duration-300 hover:text-[#2B6CB0] hover:decoration-[#2B6CB0]"
                    onClick={async () => {
                      if (!forgotForm.email) return;
                      setSaving(true);
                      setError("");
                      setNotice("");
                      try {
                        const response = await forgotPassword({ email: forgotForm.email });
                        setNotice(response.message);
                      } catch (caught) {
                        setError(getError(caught));
                      } finally {
                        setSaving(false);
                      }
                    }}
                    disabled={saving || !forgotForm.email}
                  >
                    <RotateCcw size={14} />
                    Request a new code
                  </button>
                  <button
                    type="button"
                    className="text-sm text-[#5B6B85] transition-colors duration-300 hover:text-[#2B6CB0]"
                    onClick={() => {
                      setScreen("login");
                      setError("");
                    }}
                  >
                    Back to login
                  </button>
                </div>
              </form>
            )}

            {showLoginPrimaryActions && (
              <>
                <div
                  ref={googleButtonRef}
                  aria-hidden="true"
                  className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0"
                />
                {!import.meta.env.VITE_GOOGLE_CLIENT_ID && (
                  <p className="mt-2 text-xs text-[#8FA4C0]">Set VITE_GOOGLE_CLIENT_ID to enable Google Sign-In.</p>
                )}

                <button
                  type="button"
                  className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded-2xl border border-[#D7E6F5] bg-white px-4 text-sm font-semibold text-[#22314A] shadow-[0_14px_34px_-26px_rgba(27,43,69,0.55)] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:border-[#BFD7EC] hover:bg-[#F7FBFE] hover:shadow-[0_18px_40px_-24px_rgba(43,108,176,0.28)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={triggerGoogleLogin}
                  disabled={saving || !googleReady}
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-white shadow-[0_10px_24px_-18px_rgba(0,0,0,0.5)]">
                    <GoogleMark />
                  </span>
                  <span>{googleReady ? "Continue with Google" : "Loading Google..."}</span>
                </button>

                <p className="mt-3 text-center text-xs leading-5 text-[#7A8BA6]">
                  Secure Google sign in for verified AquaPulse accounts. No Facebook sign-in is enabled on this page.
                </p>

                <button
                  type="button"
                  className="mt-8 text-sm text-[#5B6B85] underline decoration-[#B7CDE3] underline-offset-4 transition-colors duration-300 hover:text-[#2B6CB0] hover:decoration-[#2B6CB0]"
                  onClick={() => {
                    setError("");
                    setNotice("");
                    setScreen(loginMode ? "signup" : "login");
                  }}
                >
                  {loginMode ? "Need an account? Sign up" : "Already registered? Sign in"}
                </button>
              </>
            )}

            {!showLoginPrimaryActions && (
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-2xl border border-[#D7E6F5] bg-white px-4 py-3 text-sm font-semibold text-[#22314A] transition-all duration-300 ease-out hover:-translate-y-0.5 hover:bg-[#F7FBFE] hover:shadow-md active:scale-[0.98]"
                  onClick={() => {
                    setScreen("login");
                    setError("");
                  }}
                >
                  <ArrowLeft size={16} />
                  Back to login
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="relative hidden min-h-[320px] overflow-hidden bg-gradient-to-b from-[#BFE3F7] via-[#8FCBEC] to-[#2B6CB0] lg:block [animation:slideInRight_0.6s_ease-out_both]">
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 800" preserveAspectRatio="xMidYMid slice" fill="none">
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

            <rect x="0" y="0" width="600" height="420" fill="url(#skyDepth)" />
            <circle cx="460" cy="150" r="150" fill="url(#sunGlow)" />
            <circle cx="460" cy="150" r="46" fill="url(#sunCore)">
              <animate attributeName="r" values="44;50;44" dur="6s" repeatCount="indefinite" />
            </circle>
            <path d="M-20 300 Q120 260 260 300 Q380 330 620 290 V420 H-20 Z" fill="#E7F4FC" opacity="0.35" />

            <g stroke="white" strokeOpacity="0.75" strokeWidth="3" strokeLinecap="round" fill="none">
              <path d="M60 130 Q68 122 76 130 Q84 122 92 130">
                <animate attributeName="opacity" values="0.9;0.5;0.9" dur="5s" repeatCount="indefinite" />
              </path>
              <path d="M95 118 Q101 112 107 118 Q113 112 119 118">
                <animate attributeName="opacity" values="0.6;0.9;0.6" dur="6s" repeatCount="indefinite" />
              </path>
            </g>

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

            <g>
              <ellipse cx="300" cy="494" rx="100" ry="14" fill="#1B2B45" opacity="0.08" />
              <polygon points="230,420 300,360 370,420" fill="#F7FBFE" opacity="0.92" />
              <rect x="245" y="420" width="110" height="70" fill="#EAF4FB" opacity="0.92" />
              <rect x="270" y="440" width="26" height="50" rx="3" fill="#BFE3F7" opacity="0.8" />
              <rect x="365" y="430" width="46" height="80" rx="8" fill="#1B2B45" opacity="0.85" />
              <rect x="365" y="430" width="46" height="18" rx="8" fill="#2B6CB0" opacity="0.9" />
              <line x1="330" y1="392" x2="365" y2="450" stroke="#8FCBEC" strokeWidth="3" strokeOpacity="0.7" strokeLinecap="round" />
            </g>

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

      {pendingSocialSignup && (
        <Modal title="Choose your role" onClose={() => setPendingSocialSignup(null)}>
          <div className="grid gap-4 [animation:popIn_0.25s_ease-out_both]">
            <div className="rounded-[24px] border border-[#D7E6F5] bg-[#F7FBFE] px-4 py-4">
              <p className="text-xs uppercase tracking-[0.22em] text-[#5B9BD5]">Confirming new account</p>
              <p className="mt-2 text-lg font-semibold text-[#1B2B45]">{pendingSocialSignup.fullName}</p>
              <p className="mt-1 text-sm text-[#5B6B85]">{pendingSocialSignup.email}</p>
              <p className="mt-2 text-sm text-[#5B6B85]">Provider: {pendingSocialSignup.provider}</p>
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
                onClick={() => handleGoogleCompleteSignup("ADMIN")}
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
                onClick={() => handleGoogleCompleteSignup("RESIDENT")}
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

            {error && (
              <p className="rounded-2xl bg-[#FDECEC] px-4 py-3 text-sm text-[#B3413C] [animation:popIn_0.3s_ease-out_both]">
                {error}
              </p>
            )}
          </div>
        </Modal>
      )}

      <Footer className="relative z-10 mt-3" />
    </main>
  );
}

function isUnverifiedLoginError(error: unknown) {
  if (!(error instanceof AxiosError)) {
    return false;
  }

  const status = error.response?.status;
  const message = getResponseMessage(error).toLowerCase();
  return status === 400 && message.includes("verify") && message.includes("email");
}

function getResponseMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const data = error.response?.data;
    if (typeof data === "string") return data;
    if (data && typeof data === "object") {
      const message = (data as { message?: string; error?: string }).message ?? (data as { message?: string; error?: string }).error;
      if (typeof message === "string") return message;
    }
    return error.message;
  }

  return "";
}

function getError(error: unknown, fallback = "Something went wrong. Please try again.") {
  if (error instanceof AxiosError) {
    if (error.message === "Network Error") {
      return "Can't reach the backend right now. Make sure the Spring Boot server is running.";
    }

    return getApiErrorMessage(error, fallback);
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

function GoogleMark() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.28 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.62a4.07 4.07 0 0 1-1.77 2.67v2.22h2.86c1.67-1.53 2.57-3.79 2.57-6.53Z" fill="#4285F4" />
      <path d="M9 18c2.39 0 4.4-.79 5.86-2.14l-2.86-2.22c-.79.53-1.8.84-3 .84a5.2 5.2 0 0 1-4.89-3.55H1.17v2.3A8.99 8.99 0 0 0 9 18Z" fill="#34A853" />
      <path d="M4.11 11.08c-.2-.59-.31-1.22-.31-1.88s.11-1.29.31-1.88v-2.3H1.17A8.99 8.99 0 0 0 0 9.2c0 1.45.35 2.82 1.17 4.02l2.94-2.14Z" fill="#FBBC05" />
      <path d="M9 3.56c1.3 0 2.46.45 3.37 1.33l2.53-2.53A8.5 8.5 0 0 0 9 0 8.99 8.99 0 0 0 1.17 4.02l2.94 2.18A5.2 5.2 0 0 1 9 3.56Z" fill="#EA4335" />
    </svg>
  );
}
