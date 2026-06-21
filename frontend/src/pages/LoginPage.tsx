import { FormEvent, useState } from "react";
import { BadgeDollarSign, ShieldCheck } from "lucide-react";
import { Navigate } from "react-router-dom";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/Button";
import { Input } from "../components/ui/Input";

export function LoginPage() {
  const { login, token } = useAuth();
  const [email, setEmail] = useState("admin@payroll.local");
  const [password, setPassword] = useState("Admin@123");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (token) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password);
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
            Payroll control room for modern teams.
          </p>
          <p className="mt-6 max-w-lg text-lg leading-8 text-white/62">
            Manage people records, leave workflows, payroll settings, and audit trails from one secure workspace.
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
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-fern">Northstar Payroll</p>
          <h1 className="mt-3 font-display text-4xl font-extrabold text-ink">Welcome back</h1>
          <p className="mt-2 text-sm leading-6 text-ink/58">
            Default seeded login is ready for local development.
          </p>

          <div className="mt-8 space-y-4">
            <Input
              label="Email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <Input
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

          <Button type="submit" className="mt-6 w-full py-3" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in securely"}
          </Button>

          <div className="mt-5 rounded-2xl bg-oat/70 p-4 text-sm text-ink/65">
            <p className="font-bold text-ink">Demo credentials</p>
            <p>Email: admin@payroll.local</p>
            <p>Password: Admin@123</p>
          </div>
        </form>
      </section>
    </main>
  );
}
