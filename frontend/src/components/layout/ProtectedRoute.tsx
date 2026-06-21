import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";

export function ProtectedRoute() {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-mesh">
        <div className="rounded-[2rem] bg-white/70 px-8 py-6 text-center shadow-card">
          <p className="font-display text-xl font-extrabold text-moss">Loading payroll workspace</p>
          <p className="mt-1 text-sm text-ink/60">Checking your secure session...</p>
        </div>
      </div>
    );
  }

  return token ? <Outlet /> : <Navigate to="/login" replace />;
}
