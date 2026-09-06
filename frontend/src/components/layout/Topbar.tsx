import { BriefcaseBusiness, LogOut, Menu, UserRound } from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { initials } from "../../lib/format";
import { Button } from "../ui/Button";

interface TopbarProps {
  onMenuClick: () => void;
}

export function Topbar({ onMenuClick }: TopbarProps) {
  const { user, logout, viewMode, setViewMode, canSwitchViewMode } = useAuth();

  return (
    <header className="sticky top-0 z-20 border-b border-line bg-shell/90 px-4 py-3.5 backdrop-blur-xl sm:px-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-line bg-white text-ink/70 transition hover:border-fern/30 hover:text-moss lg:hidden"
            aria-label="Open menu"
          >
            <Menu size={19} />
          </button>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-ink sm:hidden">{user?.fullName}</p>
            <p className="truncate text-xs font-semibold text-ink/45 sm:hidden">{user?.role}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {canSwitchViewMode && (
            <div className="hidden items-center rounded-xl border border-line bg-white p-1 sm:flex">
              <button
                type="button"
                onClick={() => setViewMode("personnel")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  viewMode === "personnel" ? "bg-moss text-white shadow-raised" : "text-ink/55 hover:text-moss"
                }`}
              >
                <UserRound size={14} />
                Personnel
              </button>
              <button
                type="button"
                onClick={() => setViewMode("management")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                  viewMode === "management" ? "bg-moss text-white shadow-raised" : "text-ink/55 hover:text-moss"
                }`}
              >
                <BriefcaseBusiness size={14} />
                Management
              </button>
            </div>
          )}

          <div className="hidden text-right md:block">
            <p className="text-sm font-bold leading-tight text-ink">{user?.fullName}</p>
            <p className="text-xs font-semibold leading-tight text-ink/45">
              {user?.role} · {viewMode === "personnel" ? "Personnel" : "Management"}
            </p>
          </div>

          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-moss text-sm font-extrabold text-white">
            {initials(user?.fullName ?? "User")}
          </div>

          <Button
            type="button"
            variant="secondary"
            className="hidden !px-3 sm:inline-flex"
            onClick={logout}
            aria-label="Logout"
          >
            <LogOut size={16} />
            <span className="hidden lg:inline">Logout</span>
          </Button>
        </div>
      </div>

      {/* Compact view-mode switch for small screens */}
      {canSwitchViewMode && (
        <div className="mt-3 flex items-center gap-2 sm:hidden">
          <button
            type="button"
            onClick={() => setViewMode("personnel")}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
              viewMode === "personnel" ? "bg-moss text-white shadow-raised" : "border border-line bg-white text-ink/55"
            }`}
          >
            Personnel
          </button>
          <button
            type="button"
            onClick={() => setViewMode("management")}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-bold transition ${
              viewMode === "management" ? "bg-moss text-white shadow-raised" : "border border-line bg-white text-ink/55"
            }`}
          >
            Management
          </button>
        </div>
      )}
    </header>
  );
}
