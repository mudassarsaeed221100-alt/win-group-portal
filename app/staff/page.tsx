
"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

import StaffOverview from "./StaffOverview";
import AvailableWorkTasks from "./AvailableWorkTasks";
import SubmitWork from "./SubmitWork";
import MyEarnings from "./MyEarnings";
import Notifications from "./Notifications";
import MyProfile from "./MyProfile";
import Support from "./Support";

/* ───────── Types ───────── */

type MenuKey =
  | "overview"
  | "tasks"
  | "submit"
  | "earnings"
  | "notifications"
  | "profile"
  | "support";

type StaffProfile = {
  first_name: string | null;
  surname: string | null;
  role: string;
  avatar_url: string | null;
  team_code: string | null;
  created_at?: string | null;
};

type SuperAdminProfile = {
  first_name: string | null;
  surname: string | null;
  team_code: string | null;
};

type SelectedTask = {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  deadline: string | null;
  created_at: string;
};

type DashStats = {
  availableTasks: number;
  submittedWork: number;
  totalEarnings: number;
  notifCount: number;
  weeklyActivity: number[];
};

/* ───────── Menu Items ───────── */

const menuItems: { id: MenuKey; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "🏠" },
  { id: "tasks", label: "Available Work Tasks", icon: "📋" },
  { id: "submit", label: "Submit Work & Proof", icon: "📤" },
  { id: "earnings", label: "My Earnings", icon: "💰" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "profile", label: "My Profile", icon: "👤" },
  { id: "support", label: "Support", icon: "🎧" },
];

/* 🐺 Wolf Logo URL */
const WOLF_LOGO = "https://eubrfvhinrubkmgwmdaf.supabase.co/storage/v1/object/public/avatars/download.jpeg";

/* ───────── Avatar ───────── */

function Avatar({ src, name, size = 40 }: { src: string | null; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  useEffect(() => setErr(false), [src]);
  const letter = name.trim().charAt(0).toUpperCase() || "S";

  return (
    <div
      style={{
        width: size, height: size, minWidth: size, borderRadius: "50%",
        overflow: "hidden", background: "#1a2540", display: "grid",
        placeItems: "center", color: "#93c5fd", fontSize: size * 0.44,
        fontWeight: 700, border: "2px solid #2a3f65", flexShrink: 0,
      }}
    >
      {src && !err ? (
        <img src={src} alt="" onError={() => setErr(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : letter}
    </div>
  );
}

/* ───────── Main Component ───────── */

export default function StaffDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [activeMenu, setActiveMenu] = useState<MenuKey>("overview");
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [superAdmin, setSuperAdmin] = useState<SuperAdminProfile | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<SelectedTask | null>(null);

  const [stats, setStats] = useState<DashStats>({
    availableTasks: 0, submittedWork: 0, totalEarnings: 0,
    notifCount: 0, weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
  });

  /* ── Auth Check ── */
  useEffect(() => {
    let active = true;
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { router.replace("/"); return; }

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, surname, role, avatar_url, team_code, created_at")
        .eq("id", user.id).single();

      if (!active) return;
      if (error || !data || data.role !== "staff") {
        await supabase.auth.signOut(); router.replace("/"); return;
      }

      setProfile(data as StaffProfile);

      if (data.team_code) {
        const { data: sa } = await supabase
          .from("profiles")
          .select("first_name, surname, team_code")
          .eq("role", "super_admin").eq("team_code", data.team_code).maybeSingle();
        if (!active) return;
        setSuperAdmin(sa);
      }

      await loadStats(user.id, data.role);
      if (active) setLoading(false);
    }
    init();
    return () => { active = false; };
  }, [router]);

  /* ── Load Stats ── */
  async function loadStats(userId: string, role: string) {
    try {
      const { count: tc } = await supabase.from("work_tasks")
        .select("*", { count: "exact", head: true }).eq("status", "active");

      const { count: sc } = await supabase.from("work_submissions")
        .select("*", { count: "exact", head: true }).eq("user_id", userId);

      const { data: ed } = await supabase.from("earnings_ledger")
        .select("amount").eq("user_id", userId).eq("type", "earning");
      const earn = (ed || []).reduce((s: number, r: { amount: number }) => s + (r.amount || 0), 0);

      const { count: nc } = await supabase.from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("status", "active").contains("recipient_roles", [role]);

      const ago = new Date(); ago.setDate(ago.getDate() - 7);
      const { data: ad } = await supabase.from("work_submissions")
        .select("created_at").eq("user_id", userId).gte("created_at", ago.toISOString());

      const w = [0, 0, 0, 0, 0, 0, 0];
      (ad || []).forEach((r: { created_at: string }) => {
        const d = new Date(r.created_at).getDay();
        w[d === 0 ? 6 : d - 1]++;
      });

      setStats({ availableTasks: tc || 0, submittedWork: sc || 0, totalEarnings: earn, notifCount: nc || 0, weeklyActivity: w });
    } catch (e) { console.error(e); }
  }

  async function logout() { await supabase.auth.signOut(); router.replace("/"); }

  function go(m: MenuKey) { setActiveMenu(m); if (window.innerWidth < 768) setSidebarOpen(false); }

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#080d1a", color: "#fff" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ width: 56, height: 56, margin: "0 auto", borderRadius: 14, display: "grid", placeItems: "center", background: "#1e40af", fontSize: 22, fontWeight: 800 }}>W</div>
          <p style={{ color: "#6b7a94", marginTop: 12 }}>Loading Staff Portal...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const fullName = [profile.first_name, profile.surname].filter(Boolean).join(" ") || "Staff Member";
  const saName = superAdmin ? [superAdmin.first_name, superAdmin.surname].filter(Boolean).join(" ") : "";

  const chartMax = Math.max(...stats.weeklyActivity, 3);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  /* ───────── Dashboard Overview ───────── */
  function renderDashboard() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* ══ Welcome Banner with Wolf Background ══ */}
        <div style={{
          borderRadius: 12,
          border: "1px solid #1a2844",
          overflow: "hidden",
          position: "relative",
          minHeight: 150,
          background: "#0c1628",
        }}>
          {/* Background Wolf Image — Full Right Side */}
          <div style={{
            position: "absolute",
            right: 0,
            top: 0,
            bottom: 0,
            width: "45%",
            backgroundImage: `url(${WOLF_LOGO})`,
            backgroundSize: "contain",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center right",
            opacity: 0.15,
          }} />

          {/* Diagonal Lines Overlay */}
          <div style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "repeating-linear-gradient(135deg, transparent, transparent 40px, rgba(255,255,255,0.015) 40px, rgba(255,255,255,0.015) 41px)",
          }} />

          {/* Gradient Overlay */}
          <div style={{
            position: "absolute",
            inset: 0,
            background: "linear-gradient(90deg, #0c1628 55%, transparent 100%)",
          }} />

          {/* Content */}
          <div style={{
            position: "relative",
            zIndex: 2,
            padding: "28px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}>
            {/* Left — Welcome Text */}
            <div>
              <p style={{ color: "#8190aa", fontSize: 14, margin: 0 }}>Welcome Back,</p>
              <h2 style={{ fontSize: 26, margin: "6px 0 0", color: "#60a5fa", fontWeight: 700 }}>{fullName}!</h2>
              <p style={{ color: "#5a6a84", fontSize: 12, margin: "8px 0 0" }}>Together we grow stronger — WIN GROUP</p>
            </div>

            {/* Right — Wolf Logo + Text (Visible) */}
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <img
                src={WOLF_LOGO}
                alt="WIN GROUP"
                style={{
                  width: 80,
                  height: 80,
                  objectFit: "contain",
                  borderRadius: 12,
                  border: "1px solid #1a2844",
                  background: "#0a1020",
                  padding: 6,
                }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
              <div>
                <strong style={{ color: "#fff", fontSize: 15, letterSpacing: 1.5, display: "block" }}>WIN GROUP</strong>
                <p style={{ color: "#4a5a74", fontSize: 8, margin: "3px 0 0", letterSpacing: 0.6 }}>WOLF INDEPENDENT NATIONAL GROUP</p>
              </div>
            </div>
          </div>
        </div>

        {/* ══ 4 Stats Cards ══ */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          {[
            { label: "Available Tasks", value: String(stats.availableTasks), icon: "📋", bg: "#0f2240", menu: "tasks" as MenuKey },
            { label: "Submitted Work", value: String(stats.submittedWork), icon: "✅", bg: "#0f2a1e", menu: "submit" as MenuKey },
            { label: "Total Earnings", value: `Rs. ${stats.totalEarnings}`, icon: "💰", bg: "#1f1530", menu: "earnings" as MenuKey },
            { label: "Notifications", value: String(stats.notifCount), icon: "🔔", bg: "#2a1f0f", menu: "notifications" as MenuKey },
          ].map((c) => (
            <div key={c.label} onClick={() => go(c.menu)} style={{
              display: "flex", alignItems: "center", gap: 12, padding: "16px 14px",
              background: "#0d1526", border: "1px solid #1a2844", borderRadius: 10, cursor: "pointer",
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 8, display: "grid", placeItems: "center", background: c.bg, fontSize: 18, flexShrink: 0 }}>{c.icon}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{c.value}</div>
                <div style={{ fontSize: 11, color: "#5a6a84", marginTop: 1 }}>{c.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ══ Activity Chart + Quick Access ══ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 240px", gap: 12 }}>

          {/* Chart */}
          <div style={{ background: "#0d1526", border: "1px solid #1a2844", borderRadius: 10, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span>📊</span>
                <strong style={{ fontSize: 14 }}>Your Activity Overview</strong>
              </div>
              <span style={{ padding: "4px 10px", borderRadius: 14, fontSize: 10, background: "#111d35", border: "1px solid #1a2844", color: "#6b7a94" }}>Last 30 Days</span>
            </div>

            <div style={{ display: "flex", alignItems: "flex-end", gap: 6, height: 130 }}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", height: "100%", paddingBottom: 18 }}>
                {Array.from({ length: chartMax + 1 }, (_, i) => chartMax - i).map((v) => (
                  <span key={v} style={{ fontSize: 9, color: "#3a4a60", width: 12, textAlign: "right" }}>{v}</span>
                ))}
              </div>

              <div style={{ flex: 1, display: "flex", justifyContent: "space-around", alignItems: "flex-end", height: "100%", borderBottom: "1px solid #1a2844", position: "relative" }}>
                {stats.weeklyActivity.map((val, i) => {
                  const pct = chartMax > 0 ? (val / chartMax) * 100 : 0;
                  return (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", flex: 1, height: "100%", justifyContent: "flex-end", position: "relative" }}>
                      <div style={{
                        width: 8, height: 8, borderRadius: "50%", background: "#3b82f6",
                        border: "2px solid #0d1526", marginBottom: -4, zIndex: 2,
                        position: "absolute", bottom: `${pct}%`,
                      }} />
                      <div style={{
                        width: 24, borderRadius: "3px 3px 0 0", minHeight: 2,
                        background: "linear-gradient(180deg, #3b82f6 0%, #1e3a6e 100%)",
                        height: `${pct}%`, transition: "height 0.4s",
                      }} />
                      <span style={{ fontSize: 10, color: "#5a6a84", marginTop: 4 }}>{days[i]}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Access */}
          <div style={{ background: "#0d1526", border: "1px solid #1a2844", borderRadius: 10, padding: "16px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
              <span>⚡</span>
              <strong style={{ fontSize: 13 }}>Quick Access</strong>
            </div>

            {[
              { label: "View Tasks", icon: "📋", m: "tasks" as MenuKey },
              { label: "Check Earnings", icon: "💰", m: "earnings" as MenuKey },
              { label: "Update Profile", icon: "👤", m: "profile" as MenuKey },
              { label: "Get Support", icon: "🎧", m: "support" as MenuKey },
            ].map((q) => (
              <button key={q.m} onClick={() => go(q.m)} style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 8px", border: "none", borderBottom: "1px solid #1a2844",
                background: "transparent", color: "#c4d0e4", cursor: "pointer", fontSize: 12,
              }}>
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>{q.icon}</span><span>{q.label}</span>
                </span>
                <span style={{ color: "#3a4a60" }}>→</span>
              </button>
            ))}
          </div>
        </div>

        {/* ══ Stay Productive ══ */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12,
          padding: "16px 20px", background: "#0d1526", border: "1px solid #1e3a6e", borderRadius: 10,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span>ℹ️</span>
              <strong style={{ fontSize: 14 }}>Stay Productive!</strong>
            </div>
            <p style={{ color: "#6b7a94", fontSize: 12, margin: "6px 0 0" }}>
              Complete more tasks, earn more, and be a valuable part of WIN GROUP.
            </p>
          </div>
          <button onClick={() => go("tasks")} style={{
            padding: "9px 18px", border: "none", borderRadius: 7,
            background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12,
          }}>View Tasks →</button>
        </div>
      </div>
    );
  }

  /* ───────── Render Content ───────── */
  function renderContent() {
    switch (activeMenu) {
      case "overview": return renderDashboard();
      case "tasks": return <AvailableWorkTasks onSelectTask={(t) => { setSelectedTask(t); setActiveMenu("submit"); }} />;
      case "submit": return <SubmitWork selectedTask={selectedTask} onBackToTasks={() => setActiveMenu("tasks")} />;
      case "earnings": return <MyEarnings />;
      case "notifications": return <Notifications />;
      case "profile": return <MyProfile profile={profile} superAdmin={superAdmin} />;
      case "support": return <Support />;
      default: return renderDashboard();
    }
  }

  /* ───────── RENDER ───────── */

  const SW = 240;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#080d1a", color: "#e8ecf4", fontFamily: "Arial, sans-serif" }}>

      {/* ════════ SIDEBAR ════════ */}
      <aside style={{
        width: sidebarOpen ? SW : 0,
        minWidth: sidebarOpen ? SW : 0,
        overflow: "hidden",
        background: "#0a1020",
        borderRight: sidebarOpen ? "1px solid #151f35" : "none",
        transition: "width 0.25s ease, min-width 0.25s ease",
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        position: "sticky",
        top: 0,
        flexShrink: 0,
      }}>
        <div style={{ padding: "14px 12px", display: "flex", flexDirection: "column", flex: 1, minWidth: SW, overflowY: "auto" }}>

          {/* Brand + Wolf Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 14, borderBottom: "1px solid #151f35" }}>
            <img src={WOLF_LOGO} alt="WIN" style={{ width: 36, height: 36, objectFit: "contain", borderRadius: 8 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <div>
              <strong style={{ color: "#fff", fontSize: 15, letterSpacing: 1.2 }}>WIN GROUP</strong>
              <p style={{ color: "#4a5a74", fontSize: 7, margin: "2px 0 0", letterSpacing: 0.5 }}>WOLF INDEPENDENT NATIONAL GROUP</p>
            </div>
          </div>

          {/* Nav Menu */}
          <nav style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 14, flex: 1 }}>
            {menuItems.map((item) => {
              const isActive = activeMenu === item.id;
              return (
                <button key={item.id} onClick={() => go(item.id)} style={{
                  position: "relative", width: "100%", padding: "10px 10px",
                  display: "flex", alignItems: "center", gap: 9,
                  border: "none", borderRadius: 7,
                  background: isActive ? "#111d35" : "transparent",
                  color: isActive ? "#fff" : "#6b7a94",
                  fontWeight: isActive ? 700 : 400,
                  textAlign: "left", fontSize: 12, cursor: "pointer",
                }}>
                  <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>

                  {item.id === "notifications" && stats.notifCount > 0 && (
                    <span style={{
                      padding: "1px 6px", borderRadius: 8, fontSize: 9,
                      fontWeight: 700, background: "#dc2626", color: "#fff",
                    }}>{stats.notifCount}</span>
                  )}

                  {isActive && (
                    <span style={{
                      position: "absolute", right: 0, top: 6, bottom: 6,
                      width: 3, borderRadius: 3, background: "#3b82f6",
                    }} />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Logout */}
          <button onClick={logout} style={{
            width: "100%", padding: "10px 10px", marginTop: 10,
            border: "1px solid #3a1525", borderRadius: 7,
            background: "#1a0d15", color: "#f87171",
            fontWeight: 700, cursor: "pointer", textAlign: "left",
            display: "flex", gap: 8, alignItems: "center", fontSize: 12,
          }}>
            <span>↪</span> Logout
          </button>
        </div>
      </aside>

      {/* ════════ MAIN ════════ */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: "100vh", transition: "all 0.25s ease" }}>

        {/* ── Top Header ── */}
        <header style={{
          background: "#0a1020", borderBottom: "1px solid #151f35",
          padding: "10px 16px", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: 10, flexWrap: "wrap",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{
              width: 34, height: 32, border: "1px solid #1a2844",
              background: "#0d1526", color: "#fff", borderRadius: 6,
              fontSize: 16, cursor: "pointer", flexShrink: 0,
            }}>☰</button>

            <div>
              <strong style={{ color: "#fff", fontSize: 14, letterSpacing: 1 }}>WIN GROUP</strong>
              <p style={{ color: "#4a5a74", fontSize: 7, margin: "1px 0 0", letterSpacing: 0.6 }}>WOLF INDEPENDENT NATIONAL GROUP</p>
            </div>

            <div style={{ width: 1, height: 26, background: "#1a2844", margin: "0 4px" }} />

            <div>
              <strong style={{ color: "#fff", fontSize: 12 }}>Staff Portal</strong>
              <p style={{ color: "#4a5a74", fontSize: 9, margin: "1px 0 0" }}>Staff Workspace</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
            <Avatar src={profile.avatar_url} name={fullName} size={34} />
            <div>
              <strong style={{ color: "#fff", fontSize: 12, display: "block" }}>{fullName}</strong>
              <span style={{ color: "#4a5a74", fontSize: 9 }}>Staff Member</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 1, marginLeft: 6 }}>
              <span style={{ color: "#4a5a74", fontSize: 8 }}>Admin: {saName || "N/A"}</span>
              <span style={{ color: "#4a5a74", fontSize: 8 }}>Code: {superAdmin?.team_code || "N/A"}</span>
            </div>
          </div>
        </header>

        {/* ── Page Content ── */}
        <div style={{ flex: 1, padding: 16, maxWidth: 1300, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
          {renderContent()}
        </div>

        {/* ── Footer ── */}
        <footer style={{
          display: "flex", justifyContent: "space-between", flexWrap: "wrap",
          gap: 8, padding: "12px 16px", borderTop: "1px solid #151f35",
          color: "#3a4a60", fontSize: 9, letterSpacing: 0.7,
        }}>
          <span>WIN GROUP STAFF PORTAL</span>
          <span>Staff Workspace</span>
        </footer>
      </div>
    </div>
  );
}

