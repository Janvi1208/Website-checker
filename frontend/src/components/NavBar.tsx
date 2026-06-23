"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";

interface NavBarProps {
  userName?: string;
}

export function NavBar({ userName }: NavBarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-ink/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <ScanMark />
          <span className="font-display text-base font-semibold tracking-tight text-ivory">
            SiteMind <span className="text-signal">AI</span>
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                pathname === link.href
                  ? "text-ivory"
                  : "text-muted hover:text-ivory"
              }`}
            >
              {link.label}
            </Link>
          ))}
          {userName && (
            <span className="readout-label hidden sm:inline">{userName}</span>
          )}
          <button onClick={handleLogout} className="btn-secondary px-3 py-1.5 text-xs">
            Sign out
          </button>
        </nav>
      </div>
    </header>
  );
}

function ScanMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="2" y="2" width="18" height="18" rx="4" stroke="#3DDC84" strokeWidth="1.5" />
      <line x1="2" y1="11" x2="20" y2="11" stroke="#3DDC84" strokeWidth="1.5" />
      <circle cx="11" cy="11" r="2.5" fill="#3DDC84" />
    </svg>
  );
}
