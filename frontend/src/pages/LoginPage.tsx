import { FormEvent, useState } from "react";
import { ArrowRight, BadgeDollarSign } from "lucide-react";
import { Navigate } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Input } from "../components/ui/Input";

export function LoginPage() {
  const { login, register, token } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [orgCode, setOrgCode] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (mode === "login" && (!orgCode || !identifier || !password)) {
      setError("Org code, username or email, and password are required.");
      return;
    }

    if (mode === "register" && (!companyName || !fullName || !identifier || !password)) {
      setError("Company name, full name, email, and password are required.");
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
      setError(getErrorMessage(apiError));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative isolate grid min-h-screen place-items-center overflow-hidden bg-shell px-5 py-8 sm:p-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_-15%,rgba(47,111,79,0.16),transparent_42%),linear-gradient(180deg,#fcfcfb_0%,#f5f3ed_100%)]"
      />

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-[25rem] animate-rise rounded-[1.75rem] border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_rgba(18,32,24,0.1)] sm:p-8 [&_input]:rounded-xl [&_input]:border-slate-200 [&_input]:bg-slate-50/80 [&_input]:py-3.5 [&_input]:focus:border-moss [&_input]:focus:ring-moss/10"
      >
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink text-ember shadow-[0_10px_22px_rgba(18,32,24,0.18)]">
            <BadgeDollarSign size={21} strokeWidth={2.4} />
          </div>
          <span className="font-display text-lg font-extrabold tracking-[-0.03em] text-ink">Payroll</span>
        </div>

        <h1 className="mt-8 font-display text-[2rem] font-extrabold tracking-[-0.05em] text-ink">
          {mode === "login" ? "Welcome back" : "Create workspace"}
        </h1>

        <div className="mt-7 space-y-4">
          {mode === "register" && (
            <>
              <Input
                label="Company name"
                name="companyName"
                value={companyName}
                autoComplete="organization"
                onChange={(event) => setCompanyName(event.target.value)}
              />
              <Input
                label="Full name"
                name="fullName"
                autoComplete="name"
                onChange={(event) => setFullName(event.target.value)}
              />
            </>
          )}
          {mode === "login" && (
            <Input
              label="Organization code"
              name="orgCode"
              value={orgCode}
              maxLength={3}
              autoCapitalize="characters"
              placeholder="ABC"
              className="font-semibold tracking-[0.2em] placeholder:tracking-[0.2em]"
              onChange={(event) => setOrgCode(event.target.value.toUpperCase())}
            />
          )}
          <Input
            label={mode === "login" ? "Email or username" : "Email"}
            name="identifier"
            type={mode === "login" ? "text" : "email"}
            autoComplete="username"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
          <Input
            label="Password"
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-4 py-3.5 text-sm font-bold text-white shadow-[0_12px_24px_rgba(18,32,24,0.16)] transition hover:bg-moss focus:outline-none focus:ring-4 focus:ring-moss/15 disabled:cursor-not-allowed disabled:opacity-55"
        >
          {submitting ? "Please wait..." : mode === "login" ? "Sign in" : "Create workspace"}
          {!submitting && <ArrowRight size={17} strokeWidth={2.5} />}
        </button>

        <p className="mt-5 text-center text-sm text-ink/55">
          {mode === "login" ? "New organization?" : "Already have a workspace?"}{" "}
          <button
            type="button"
            className="font-bold text-moss transition hover:text-ink focus:outline-none focus-visible:rounded focus-visible:ring-2 focus-visible:ring-moss/30"
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setError("");
            }}
          >
            {mode === "login" ? "Create workspace" : "Sign in"}
          </button>
        </p>
      </form>
    </main>
  );
}
