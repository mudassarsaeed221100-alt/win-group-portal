"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabase } from "../../lib/supabase";

const modules = [
  { name: "🏠 Home", href: "/super-admin" },
  { name: "Create Staff", href: "/super-admin/create-staff" },
  { name: "Team Management", href: "/super-admin/team-management" },
  { name: "Work Tasks", href: "/super-admin/work-tasks" },
  { name: "Submissions", href: "/super-admin/submissions" },
  { name: "Staff Performance", href: "/super-admin/staff-performance" },
  { name: "Staff Earnings", href: "/super-admin/staff-earnings" },
  { name: "Team Communication", href: "/super-admin/team-communication" },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const pathname = usePathname();

  useEffect(() => {
    async function checkAccess() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return setAllowed(false);
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();
      setAllowed(!!profile && ["super_admin", "admin"].includes(profile.role));
    }
    checkAccess();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  if (allowed === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
        Checking access...
      </main>
    );
  }

  if (allowed === false) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-950 p-4 text-center text-white">
        <h1 className="text-2xl font-bold">🔒 Access Denied</h1>
        <p className="text-slate-400">Aapko is page ki permission nahi hai. Admin account se login karein.</p>
      </main>
    );
  }

  // Dashboard par sirf sidebar (menu bar nahi)
  if (pathname === "/super-admin") {
    return <>{children}</>;
  }

  // Baqi modules par menu bar
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <nav className="sticky top-0 z-40 border-b border-slate-800 bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center gap-2 overflow-x-auto p-3">
          {modules.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className={
                "whitespace-nowrap rounded-lg px-3 py-2 text-sm " +
                (pathname === m.href ? "bg-blue-600 font-semibold" : "text-slate-300 hover:bg-slate-800")
              }
            >
              {m.name}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="ml-auto whitespace-nowrap rounded-lg border border-red-700 px-3 py-2 text-sm text-red-300 hover:bg-red-900/40"
          >
            Logout
          </button>
        </div>
      </nav>
      {children}
    </div>
  );
}
