"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const links = [
  { name: "Overview", href: "/super-admin", icon: "◆" },
  { name: "Create Staff", href: "/super-admin/create-staff", icon: "◈" },
  { name: "Team Management", href: "/super-admin/team-management", icon: "☷" },
  { name: "Work Tasks", href: "/super-admin/work-tasks", icon: "▣" },
  { name: "Submissions", href: "/super-admin/submissions", icon: "▤" },
  { name: "Staff Performance", href: "/super-admin/staff-performance", icon: "▥" },
  { name: "Staff Earnings", href: "/super-admin/staff-earnings", icon: "₹" },
  { name: "Team Communication", href: "/super-admin/team-communication", icon: "✉" },
];

type Me = { first_name: string | null; surname: string | null; username: string; role: string; team_code: string | null; avatar_url: string | null };

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [me, setMe] = useState<Me | null>(null);
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);
  const [dropdown, setDropdown] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme(localStorage.getItem("sa-theme") === "light" ? "light" : "dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("light", theme === "light");
    localStorage.setItem("sa-theme", theme);
  }, [theme]);

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (!user) return setAllowed(false);
      const { data: p } = await supabase
        .from("profiles")
        .select("first_name, surname, username, role, team_code, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (p && ["super_admin", "admin"].includes(p.role)) {
        setMe(p);
        setAllowed(true);
      } else setAllowed(false);
    }
    check();
  }, []);

  useEffect(() => {
    setOpen(false);
    setDropdown(false);
  }, [pathname]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  const name = [me?.first_name, me?.surname].filter(Boolean).join(" ") || me?.username || "Super Admin";
  const roleLabel = me?.role === "super_admin" ? "Super Admin" : "Admin";
  const current = links.find((l) => l.href === pathname)?.name || "Overview";

  const Avatar = ({ size }: { size: number }) => (
    <div className="avatar" style={{ width: size, height: size, minWidth: size, lineHeight: size - 4 + "px" }}>
      {me?.avatar_url ? <img src={me.avatar_url} alt="" /> : name.charAt(0).toUpperCase()}
    </div>
  );

  if (allowed === null) {
    return (
      <main className="sa-center">
        <div style={{ fontSize: 42 }}>◆</div>
        <h2 style={{ letterSpacing: 5 }}>WIN GROUP</h2>
        <p style={{ color: "#888", fontSize: 13 }}>Preparing Super Admin Portal...</p>
        <style jsx>{`
          .sa-center { min-height: 100vh; background: #090909; color: #e8e8e8; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: Arial, sans-serif; }
        `}</style>
      </main>
    );
  }

  if (allowed === false) {
    return (
      <main className="sa-center">
        <div style={{ fontSize: 42 }}>◇</div>
        <h2>Access Denied</h2>
        <p style={{ color: "#888", fontSize: 13 }}>Aapko is page ki permission nahi hai.</p>
        <Link href="/" style={{ color: "#111", background: "#e3e3e3", padding: "10px 18px", borderRadius: 7, textDecoration: "none", fontWeight: "bold" }}>Login Page</Link>
        <style jsx>{`
          .sa-center { min-height: 100vh; background: #090909; color: #e8e8e8; display: flex; flex-direction: column; gap: 6px; align-items: center; justify-content: center; font-family: Arial, sans-serif; }
        `}</style>
      </main>
    );
  }

  return (
    <div className="sa-layout">
      {open && <div className="overlay" onClick={() => setOpen(false)} />}

      <aside className={open ? "sidebar open" : "sidebar"}>
        <button className="close-btn" onClick={() => setOpen(false)}>✕</button>

        <div className="brand">
          <div className="brand-symbol">◆</div>
          <h2>WIN GROUP</h2>
          <span>WOLF INDEPENDENT</span>
          <span>NATIONAL GROUP</span>
          <div className="brand-line" />
          <small>SUPER ADMIN CONTROL CENTER</small>
        </div>

        <div className="profile">
          <Avatar size={43} />
          <div style={{ minWidth: 0 }}>
            <strong>{name}</strong>
            <small>{roleLabel}</small>
            <span className="online"><i /> Team: {me?.team_code || "—"}</span>
          </div>
        </div>

        <p className="menu-title">MAIN NAVIGATION</p>
        <nav>
          {links.map((l) => (
            <Link key={l.href} href={l.href} className={pathname === l.href ? "menu active" : "menu"}>
              <span className="menu-icon">{l.icon}</span>
              <span>{l.name}</span>
              {pathname === l.href && <span className="active-mark">◆</span>}
            </Link>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="authority-card">
            <span style={{ fontSize: 19 }}>◈</span>
            <div>
              <strong>{roleLabel} Authority</strong>
              <small>Team Management Access</small>
            </div>
          </div>
          <button className="logout" onClick={logout}><span>↪</span> Logout</button>
          <div className="sidebar-footer">
            WIN GROUP MANAGEMENT
            <span>SECURE SUPER ADMIN PORTAL</span>
          </div>
        </div>
      </aside>

      <section className="content">
        <header className="topbar">
          <div className="heading-wrap">
            <button className="burger" onClick={() => setOpen(true)} aria-label="Menu">☰</button>
            <div>
              <div className="heading-label">WIN GROUP / SUPER ADMIN</div>
              <h1>{current}</h1>
              <p>Super Admin Management Portal</p>
            </div>
          </div>

          <div className="top-right">
            <div className="top-status"><i /> System Active</div>
            <button className="theme-btn" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} title="Theme badlein">
              {theme === "dark" ? "☀" : "☾"}
            </button>
            <div style={{ position: "relative" }}>
              <button className="profile-trigger" onClick={() => setDropdown(!dropdown)}>
                <Avatar size={36} />
                <div className="top-user">
                  <strong>{name}</strong>
                  <small>{roleLabel}</small>
                </div>
                <span style={{ fontSize: 9, color: "var(--muted)" }}>{dropdown ? "▲" : "▼"}</span>
              </button>
              {dropdown && (
                <div className="dropdown">
                  <div className="dropdown-heading">
                    <Avatar size={38} />
                    <div>
                      <strong>{name}</strong>
                      <small>{roleLabel}</small>
                    </div>
                  </div>
                  <Link href="/super-admin" className="dd-item"><span>◉</span> Profile & Settings</Link>
                  <button className="dd-item" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
                    <span>◐</span> {theme === "dark" ? "Light Theme" : "Dark Theme"}
                  </button>
                  <button className="dd-item dd-logout" onClick={logout}><span>↪</span> Logout</button>
                </div>
              )}
            </div>
          </div>
        </header>

        <div className="sa-content">{children}</div>
      </section>

      <style jsx global>{`
        .sa-layout {
          --bg: #101010; --side: linear-gradient(180deg,#080808,#141414); --card: linear-gradient(145deg,#202020,#171717);
          --card2: #242424; --line: #383838; --text: #d9d9d9; --muted: #9a9a9a; --strong: #ffffff;
          --btn: #e3e3e3; --btnText: #111111; --glow: radial-gradient(ellipse at 85% 0%,#242424 0%,transparent 38%);
        }
        html.light .sa-layout {
          --bg: #f3f3f3; --side: linear-gradient(180deg,#ffffff,#ececec); --card: linear-gradient(145deg,#ffffff,#f7f7f7);
          --card2: #e8e8e8; --line: #d2d2d2; --text: #2b2b2b; --muted: #666666; --strong: #000000;
          --btn: #151515; --btnText: #ffffff; --glow: radial-gradient(ellipse at 85% 0%,#e2e2e2 0%,transparent 38%);
        }

        /* Saare modules ke rang founder jaise */
        .sa-content .min-h-screen { min-height: auto !important; }
        .sa-content .bg-slate-950 { background: transparent !important; }
        .sa-content .bg-slate-900 { background: var(--card) !important; }
        .sa-content .bg-slate-800, .sa-content .hover\\:bg-slate-800:hover { background: var(--card2) !important; }
        .sa-content .bg-slate-700 { background: var(--line) !important; }
        .sa-content .border-slate-800, .sa-content .border-slate-700 { border-color: var(--line) !important; }
        .sa-content .text-white { color: var(--strong) !important; }
        .sa-content .text-slate-300 { color: var(--text) !important; }
        .sa-content .text-slate-400, .sa-content .text-slate-500 { color: var(--muted) !important; }
        .sa-content .bg-blue-600 { background: var(--btn) !important; color: var(--btnText) !important; }
        .sa-content .text-blue-400 { color: var(--strong) !important; }
        .sa-content input, .sa-content select, .sa-content textarea { color: var(--strong); }
        .sa-content [style*="#0b1020"] { background: transparent !important; color: var(--strong) !important; }
        .sa-content [style*="#151f32"], .sa-content [style*="#17243a"] { background: var(--card) !important; border-color: var(--line) !important; }
        .sa-content [style*="#1e293b"] { background: var(--card2) !important; }
      `}</style>

      <style jsx>{`
        .sa-layout { min-height: 100vh; display: flex; background: var(--bg); color: var(--text); font-family: Arial, sans-serif; }
        .sa-layout :global(*) {
