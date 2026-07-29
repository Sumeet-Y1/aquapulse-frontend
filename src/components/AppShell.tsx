import { Droplets, Home, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Footer } from "./Footer";
import { SocietySwitcher } from "./SocietySwitcher";

export function AppShell() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <div className="app-bg flex min-h-screen flex-col text-[#22314A]">
      <header className="sticky top-0 z-40 px-4 py-4 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/70 bg-white/85 px-3 py-2 shadow-glass backdrop-blur-xl">
          <Link to="/" className="flex items-center gap-2 rounded-full pr-3 text-sm font-semibold">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#2B6CB0] text-white">
              <Droplets size={20} />
            </span>
            AquaPulse
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            <NavLink to="/" className={({ isActive }) => `nav-pill ${isActive ? "nav-pill-active" : ""}`}>
              <Home size={16} /> Overview
            </NavLink>
            <button className="nav-pill" onClick={logout}>
              <LogOut size={16} /> Sign out
            </button>
          </nav>
          <div className="hidden flex-1 justify-center px-4 md:flex">
            <SocietySwitcher />
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <div className="text-right text-xs">
              <p className="font-semibold">{user?.fullName}</p>
              <p className="text-[#5B6B85]">{user?.role}</p>
            </div>
          </div>
          <button className="icon-btn md:hidden" onClick={() => setOpen((value) => !value)} aria-label="Menu">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
        {open && (
          <div className="mx-auto mt-3 grid max-w-7xl gap-2 rounded-3xl border border-white/70 bg-white/92 p-3 shadow-glass backdrop-blur-xl md:hidden">
            <NavLink to="/" onClick={() => setOpen(false)} className="mobile-link">
              Overview
            </NavLink>
            <div className="rounded-3xl border border-white/80 bg-white/70 p-3">
              <SocietySwitcher />
            </div>
            <button className="mobile-link text-left" onClick={logout}>
              Sign out
            </button>
          </div>
        )}
      </header>
      <main className="mx-auto flex w-full max-w-7xl flex-1 px-4 pb-10 md:px-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
