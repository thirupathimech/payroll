import { FormEvent, useState } from "react";
import { BadgeDollarSign, ShieldCheck } from "lucide-react";
import { Navigate } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
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
    <main className="grid min-h-screen bg-mesh p-4 lg:grid-cols-[1.05fr_0.95fr]">
      <section className="hidden overflow-hidden rounded-[2.3rem] bg-ink p-10 text-white shadow-card lg:flex lg:flex-col lg:justify-between">
        <div>
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-ember text-ink">
            <BadgeDollarSign size={28} />
          </div>
          <p className="mt-8 max-w-xl font-display text-6xl font-extrabold leading-[1.02]">
            Payroll workspace for every organization.
          </p>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/62">
            Register your company, receive a three-letter org code, and keep people records separated by workspace.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {["JWT secured", "Audit ready", "MySQL backed"].map((item) => (
            <div key={item} className="rounded-3xl border border-white/10 bg-white/8 p-4">
              <ShieldCheck className="mb-3 text-ember" size={20} />
              <p className="text-sm font-bold">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex items-center justify-center px-2 py-10 sm:px-8">
        <form onSubmit={handleSubmit} className="w-full max-w-md animate-rise rounded-[2rem] bg-white/78 p-8 shadow-card backdrop-blur-xl">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-fern">Payroll</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold text-ink">
            {mode === "login" ? "Welcome back" : "Create workspace"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-ink/58">
            {mode === "login"
              ? "Sign in with your organization code."
              : "Your organization code is generated automatically after registration."}
          </p>

          <div className="mt-6 grid grid-cols-2 rounded-2xl bg-oat/70 p-1">
            <button
              type="button"
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${mode === "login" ? "bg-white text-ink shadow-sm" : "text-ink/60"}`}
              onClick={() => {
                setMode("login");
                setError("");
              }}
            >
              Login
            </button>
            <button
              type="button"
              className={`rounded-xl px-4 py-2 text-sm font-bold transition ${mode === "register" ? "bg-white text-ink shadow-sm" : "text-ink/60"}`}
              onClick={() => {
                setMode("register");
                setError("");
              }}
            >
              Register
            </button>
          </div>

          <div className="mt-8 space-y-4">
            {mode === "register" && (
              <>
                <Input
                  label="Company name"
                  name="companyName"
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                />
                <Input
                  label="Full name"
                  name="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </>
            )}
            <Input
              label={mode === "login" ? "Username or Email" : "Email"}
              name="identifier"
              type={mode === "login" ? "text" : "email"}
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
            <Input
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {mode === "login" && (
              <Input
                label="Org code"
                name="orgCode"
                value={orgCode}
                maxLength={3}
                onChange={(event) => setOrgCode(event.target.value.toUpperCase())}
              />
            )}
          </div>

          {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

          <Button type="submit" className="mt-6 w-full py-3" disabled={submitting}>
            {submitting ? "Please wait..." : mode === "login" ? "Sign in securely" : "Register organization"}
          </Button>
        </form>
      </section>
    </main>
  );
}
