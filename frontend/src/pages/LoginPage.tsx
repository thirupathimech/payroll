import { FormEvent, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BadgeDollarSign,
  Check,
  CheckCircle2,
  CircleHelp,
  Eye,
  EyeOff,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { Navigate } from "react-router-dom";
import { getApiError } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Input } from "../components/ui/Input";

type AuthField = "orgCode" | "companyName" | "fullName" | "identifier" | "password" | "confirmPassword";
type FieldErrors = Partial<Record<AuthField, string>>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const orgCodePattern = /^[A-Z]{3}$/;

export function LoginPage() {
  const { login, register, token } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [orgCode, setOrgCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showOrgHelp, setShowOrgHelp] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const passwordChecks = [
    { label: "At least 8 characters", valid: password.length >= 8 },
    { label: "One uppercase letter", valid: /[A-Z]/.test(password) },
    { label: "One number", valid: /\d/.test(password) },
  ];
  const passwordScore = passwordChecks.filter((check) => check.valid).length;

  function clearFieldError(field: AuthField) {
    setFieldErrors((current) => {
      if (!current[field]) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function validateField(field: AuthField, value: string) {
    const trimmedValue = value.trim();

    switch (field) {
      case "orgCode":
        if (!trimmedValue) return "Organization code is required.";
        if (!orgCodePattern.test(trimmedValue.toUpperCase())) return "Use the 3-letter code, for example ABC.";
        return undefined;
      case "companyName":
        return trimmedValue ? undefined : "Company name is required.";
      case "fullName":
        return trimmedValue ? undefined : "Full name is required.";
      case "identifier":
        if (!trimmedValue) return mode === "login" ? "Email or username is required." : "Email is required.";
        if (mode === "register" && !emailPattern.test(trimmedValue)) return "Enter a valid email address.";
        if (mode === "login" && trimmedValue.includes("@") && !emailPattern.test(trimmedValue)) {
          return "Enter a valid email address or username.";
        }
        return undefined;
      case "password":
        if (!value) return "Password is required.";
        if (mode === "register" && value.length < 8) return "Use at least 8 characters.";
        return undefined;
      case "confirmPassword":
        if (!value) return "Please confirm your password.";
        if (value !== password) return "Passwords do not match.";
        return undefined;
      default:
        return undefined;
    }
  }

  function validateForm() {
    const fields: AuthField[] = mode === "login"
      ? ["orgCode", "identifier", "password"]
      : ["companyName", "fullName", "identifier", "password", "confirmPassword"];
    const nextErrors: FieldErrors = {};

    fields.forEach((field) => {
      const value = {
        orgCode,
        companyName,
        fullName,
        identifier,
        password,
        confirmPassword,
      }[field];
      const message = validateField(field, value);
      if (message) {
        nextErrors[field] = message;
      }
    });

    setFieldErrors(nextErrors);
    const firstError = fields.find((field) => nextErrors[field]);
    if (firstError) {
      window.setTimeout(() => document.getElementById(firstError)?.focus(), 0);
    }
    return Object.keys(nextErrors).length === 0;
  }

  if (token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      if (mode === "login") {
        await login(orgCode, identifier, password);
      } else {
        await register({ companyName, fullName, email: identifier, password });
      }
    } catch (apiError) {
      const details = getApiError(apiError);
      const backendFieldErrors: FieldErrors = {};
      Object.entries(details.fieldErrors ?? {}).forEach(([field, message]) => {
        const authField = field === "email" ? "identifier" : field as AuthField;
        if (["orgCode", "companyName", "fullName", "identifier", "password", "confirmPassword"].includes(authField)) {
          backendFieldErrors[authField] = message;
        }
      });
      setFieldErrors(backendFieldErrors);

      const backendMessage = details.message.toLowerCase();
      if (backendMessage.includes("organization code")) {
        backendFieldErrors.orgCode = "We couldn't find that organization code.";
        setFieldErrors(backendFieldErrors);
      }

      if (details.status === 429) {
        setError("Too many sign-in attempts. Please wait a moment and try again.");
      } else if (details.status === 401) {
        setError("Invalid credentials or organization code. Check your details and try again.");
      } else if (details.status === undefined) {
        setError("We couldn't reach the payroll server. Check your connection and try again.");
      } else if (details.status >= 500) {
        setError("The payroll service is temporarily unavailable. Please try again shortly.");
      } else if (Object.keys(backendFieldErrors).length > 0) {
        setError("Please correct the highlighted fields and try again.");
      } else {
        setError(details.message || "Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative isolate grid min-h-screen overflow-hidden bg-[#f5f8f3] lg:grid-cols-[1.04fr_0.96fr]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_10%,rgba(47,111,79,0.10),transparent_32%),linear-gradient(180deg,#f8faf7_0%,#f0f5ef_100%)]"
      />

      <section className="relative order-2 isolate overflow-hidden bg-ink px-6 py-8 text-white sm:px-10 sm:py-12 lg:order-1 lg:flex lg:min-h-screen lg:flex-col lg:justify-between lg:px-14 lg:py-14">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="auth-float absolute -left-32 -top-32 h-96 w-96 rounded-full border border-white/10 bg-fern/25 blur-sm" />
          <div className="auth-drift absolute -bottom-48 -right-24 h-[34rem] w-[34rem] rounded-full border border-ember/20 bg-ember/10 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lagoon/10 blur-3xl" />
        </div>

        <div>
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-ember shadow-[0_12px_26px_rgba(0,0,0,0.2)]">
              <BadgeDollarSign size={22} strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-display text-lg font-extrabold tracking-[-0.04em]">Payroll</p>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-white/50">People operations</p>
            </div>
          </div>

          <div className="mt-16 max-w-xl lg:mt-24">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3.5 py-2 text-xs font-bold text-white/80 backdrop-blur">
              <Sparkles size={14} className="text-ember" />
              Calm, confident payroll
            </div>
            <h1 className="auth-fade-up mt-6 max-w-lg font-display text-4xl font-extrabold leading-[1.04] tracking-[-0.06em] text-white sm:text-5xl lg:text-[4.15rem]">
              Make every payday feel <span className="text-ember">effortless.</span>
            </h1>
            <p className="auth-fade-up mt-6 max-w-md text-[1.05rem] leading-7 text-white/62" style={{ animationDelay: "120ms" }}>
              One thoughtful workspace for people, attendance, leave, and payroll—so your team can focus on the work that matters.
            </p>
          </div>
        </div>

        <div className="mt-12 grid max-w-xl gap-3 sm:grid-cols-3 lg:mt-16">
          <div className="auth-fade-up rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur" style={{ animationDelay: "220ms" }}>
            <Users size={18} className="text-ember" />
            <p className="mt-7 text-sm font-bold text-white">People first</p>
            <p className="mt-1 text-xs leading-5 text-white/50">Everything your team needs, together.</p>
          </div>
          <div className="auth-fade-up rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur" style={{ animationDelay: "320ms" }}>
            <ShieldCheck size={18} className="text-emerald-300" />
            <p className="mt-7 text-sm font-bold text-white">Built for trust</p>
            <p className="mt-1 text-xs leading-5 text-white/50">Clear access, secure records, no clutter.</p>
          </div>
          <div className="auth-fade-up rounded-2xl border border-white/10 bg-white/[0.07] p-4 backdrop-blur" style={{ animationDelay: "420ms" }}>
            <LockKeyhole size={18} className="text-sky-300" />
            <p className="mt-7 text-sm font-bold text-white">Ready to grow</p>
            <p className="mt-1 text-xs leading-5 text-white/50">A calmer way to run every month.</p>
          </div>
        </div>

        <p className="mt-10 text-xs font-medium text-white/35 lg:mt-14">Designed for teams that value clarity.</p>
      </section>

      <section className="relative order-1 flex items-center px-5 py-8 sm:px-10 sm:py-12 lg:order-2 lg:px-14 lg:py-16">
        <div className="mx-auto w-full max-w-[31rem] animate-rise">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-moss/55">Account access</p>
              <p className="mt-1 text-sm text-ink/45">Your workspace is waiting.</p>
            </div>
            <span className="hidden rounded-full border border-moss/10 bg-white/70 px-3 py-1.5 text-xs font-bold text-ink/45 shadow-sm sm:inline-flex">
              Secure sign in
            </span>
          </div>

          <form
            key={mode}
            onSubmit={handleSubmit}
            className="auth-fade-up rounded-[2rem] border border-white/80 bg-white/90 p-6 shadow-[0_24px_80px_rgba(18,32,24,0.10)] backdrop-blur-xl sm:p-9 [&_input]:rounded-2xl [&_input]:border-slate-200/90 [&_input]:bg-slate-50/75 [&_input]:py-3.5 [&_input]:focus:border-moss [&_input]:focus:ring-moss/10"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-3xl font-extrabold tracking-[-0.06em] text-ink sm:text-[2.2rem]">
                  {mode === "login" ? "Welcome back" : "Create workspace"}
                </h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-ink/50">
                  {mode === "login" ? "Sign in to pick up where you left off." : "Set up your team’s calm, organized home base."}
                </p>
              </div>
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-oat/70 text-moss">
                <BadgeDollarSign size={20} strokeWidth={2.4} />
              </div>
            </div>

            <div className="mt-8 space-y-5">
              {mode === "register" && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Input
                    label="Company name"
                    name="companyName"
                    value={companyName}
                    error={fieldErrors.companyName}
                    autoComplete="organization"
                    onBlur={() => setFieldErrors((current) => ({ ...current, companyName: validateField("companyName", companyName) }))}
                    onChange={(event) => {
                      setCompanyName(event.target.value);
                      clearFieldError("companyName");
                      setError("");
                    }}
                  />
                  <Input
                    label="Full name"
                    name="fullName"
                    value={fullName}
                    error={fieldErrors.fullName}
                    autoComplete="name"
                    onBlur={() => setFieldErrors((current) => ({ ...current, fullName: validateField("fullName", fullName) }))}
                    onChange={(event) => {
                      setFullName(event.target.value);
                      clearFieldError("fullName");
                      setError("");
                    }}
                  />
                </div>
              )}
              {mode === "login" && (
                <Input
                  label="Organization code"
                  name="orgCode"
                  value={orgCode}
                  error={fieldErrors.orgCode}
                  maxLength={3}
                  autoCapitalize="characters"
                  placeholder="ABC"
                  className="font-semibold tracking-[0.2em] placeholder:tracking-[0.2em]"
                  onBlur={() => setFieldErrors((current) => ({ ...current, orgCode: validateField("orgCode", orgCode) }))}
                  onChange={(event) => {
                    setOrgCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, ""));
                    clearFieldError("orgCode");
                    setError("");
                  }}
                />
              )}
              {mode === "login" && (
                <div className="-mt-2">
                  <button
                    type="button"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-moss/75 transition hover:text-moss focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-moss/30"
                    onClick={() => setShowOrgHelp((visible) => !visible)}
                    aria-expanded={showOrgHelp}
                  >
                    <CircleHelp size={14} />
                    Where can I find my org code?
                  </button>
                  {showOrgHelp && (
                    <p role="note" className="mt-2 rounded-xl border border-moss/10 bg-moss/[0.04] px-3 py-2.5 text-xs leading-5 text-ink/55">
                      Your org code is the 3-letter code shared by your payroll admin. It usually looks like <strong className="text-ink">ABC</strong>.
                    </p>
                  )}
                </div>
              )}
              <Input
                label={mode === "login" ? "Email or username" : "Email"}
                name="identifier"
                type={mode === "login" ? "text" : "email"}
                autoComplete="username"
                value={identifier}
                error={fieldErrors.identifier}
                onBlur={() => setFieldErrors((current) => ({ ...current, identifier: validateField("identifier", identifier) }))}
                onChange={(event) => {
                  setIdentifier(event.target.value);
                  clearFieldError("identifier");
                  setError("");
                }}
              />
              <div className="relative">
                <Input
                  label="Password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  error={fieldErrors.password}
                  onBlur={() => {
                    setFieldErrors((current) => ({ ...current, password: validateField("password", password) }));
                    setCapsLockOn(false);
                  }}
                  onKeyDown={(event) => setCapsLockOn(event.getModifierState("CapsLock"))}
                  onKeyUp={(event) => setCapsLockOn(event.getModifierState("CapsLock"))}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    clearFieldError("password");
                    setError("");
                  }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute bottom-3.5 right-3.5 rounded-lg p-1 text-ink/35 transition hover:text-moss focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30"
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {capsLockOn && (
                <p role="status" className="-mt-3 flex items-center gap-2 text-xs font-bold text-amber-700">
                  <AlertCircle size={14} /> Caps Lock is on
                </p>
              )}
              {mode === "register" && (
                <>
                  <div className="-mt-2 rounded-2xl border border-ink/8 bg-slate-50/70 p-3.5" aria-live="polite">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-bold text-ink/60">Password strength</p>
                      {password && (
                        <span className={`text-xs font-extrabold ${passwordScore === 3 ? "text-fern" : passwordScore === 2 ? "text-amber-600" : "text-red-600"}`}>
                          {passwordScore === 3 ? "Strong" : passwordScore === 2 ? "Good" : "Needs work"}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-3 gap-1.5" aria-hidden="true">
                      {[1, 2, 3].map((step) => (
                        <div key={step} className={`h-1.5 rounded-full ${passwordScore >= step ? (passwordScore === 3 ? "bg-fern" : "bg-amber-400") : "bg-ink/10"}`} />
                      ))}
                    </div>
                    <div className="mt-3 grid gap-1.5 sm:grid-cols-3">
                      {passwordChecks.map((check) => (
                        <p key={check.label} className={`flex items-center gap-1.5 text-[0.68rem] font-semibold ${check.valid ? "text-fern" : "text-ink/40"}`}>
                          <CheckCircle2 size={13} /> {check.label}
                        </p>
                      ))}
                    </div>
                  </div>
                  <Input
                    label="Confirm password"
                    name="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    error={fieldErrors.confirmPassword}
                    onBlur={() => setFieldErrors((current) => ({ ...current, confirmPassword: validateField("confirmPassword", confirmPassword) }))}
                    onChange={(event) => {
                      setConfirmPassword(event.target.value);
                      clearFieldError("confirmPassword");
                      setError("");
                    }}
                  />
                </>
              )}
            </div>

            {error && (
              <p role="alert" className="mt-5 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold leading-5 text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="auth-pulse mt-7 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 py-4 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-moss hover:shadow-[0_18px_32px_rgba(18,32,24,0.22)] focus:outline-none focus:ring-4 focus:ring-moss/15 disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
            >
              {submitting ? "Please wait..." : mode === "login" ? "Sign in to workspace" : "Create workspace"}
              {!submitting && <ArrowRight size={17} strokeWidth={2.5} />}
            </button>

            <div className="mt-6 flex items-center gap-3 text-xs font-semibold text-ink/40">
              <div className="h-px flex-1 bg-ink/10" />
              <span>Simple. Secure. Human.</span>
              <div className="h-px flex-1 bg-ink/10" />
            </div>

            <p className="mt-6 text-center text-sm text-ink/55">
              {mode === "login" ? "New organization?" : "Already have a workspace?"}{" "}
              <button
                type="button"
                className="font-bold text-moss transition hover:text-ink focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-moss/30"
                onClick={() => {
                  setMode(mode === "login" ? "register" : "login");
                  setError("");
                  setFieldErrors({});
                  setConfirmPassword("");
                  setPassword("");
                  setCapsLockOn(false);
                  setShowOrgHelp(false);
                }}
              >
                {mode === "login" ? "Create workspace" : "Sign in"}
              </button>
            </p>

            <div className="mt-7 flex items-center justify-center gap-2 text-xs font-semibold text-ink/35">
              <Check size={14} className="text-fern" />
              Your data stays private and protected
            </div>
          </form>

          <p className="mt-6 text-center text-xs font-medium text-ink/35">© 2026 Payroll · Made for better workdays</p>
        </div>
      </section>
    </main>
  );
}
