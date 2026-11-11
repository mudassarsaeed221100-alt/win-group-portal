
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

type DashboardStats = {
  availableTasks: number;
  submittedWork: number;
  totalEarnings: number;
  notificationCount: number;
  weeklyActivity: number[];
};

/* ───────── Menu Config ───────── */

const menuItems: { id: MenuKey; label: string; icon: string }[] = [
  { id: "overview", label: "Overview", icon: "⌂" },
  { id: "tasks", label: "Available Work Tasks", icon: "📋" },
  { id: "submit", label: "Submit Work & Proof", icon: "⇧" },
  { id: "earnings", label: "My Earnings", icon: "💰" },
  { id: "notifications", label: "Notifications", icon: "🔔" },
  { id: "profile", label: "My Profile", icon: "👤" },
  { id: "support", label: "Support", icon: "🎧" },
];

/* ───────── Avatar Component ───────── */

function ProfileAvatar({
  src,
  name,
  size = 44,
}: {
  src: string | null;
  name: string;
  size?: number;
}) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  const initial = name.trim().charAt(0).toUpperCase() || "S";

  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: "50%",
        overflow: "hidden",
        border: "2px solid #3b82f6",
        background: "#202b40",
        display: "grid",
        placeItems: "center",
        color: "#fff",
        fontSize: size * 0.42,
        fontWeight: 700,
        flexShrink: 0,
      }}
    >
      {src && !broken ? (
        <img
          src={src}
          alt="avatar"
          onError={() => setBroken(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        initial
      )}
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

  /* Dashboard Stats */
  const [stats, setStats] = useState<DashboardStats>({
    availableTasks: 0,
    submittedWork: 0,
    totalEarnings: 0,
    notificationCount: 0,
    weeklyActivity: [0, 0, 0, 0, 0, 0, 0],
  });

  /* ── Auth + Profile Load ── */
  useEffect(() => {
    let active = true;

    async function checkStaff() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (!user) { router.replace("/"); return; }

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, surname, role, avatar_url, team_code, created_at")
        .eq("id", user.id)
        .single();

      if (!active) return;
      if (error || !data || data.role !== "staff") {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      setProfile(data as StaffProfile);

      if (data.team_code) {
        const { data: saData } = await supabase
          .from("profiles")
          .select("first_name, surname, team_code")
          .eq("role", "super_admin")
          .eq("team_code", data.team_code)
          .maybeSingle();
        if (!active) return;
        setSuperAdmin(saData);
      }

      /* Fetch Dashboard Stats */
      await fetchDashboardStats(user.id, data.role);

      if (active) setLoading(false);
    }

    checkStaff();
    return () => { active = false; };
  }, [router]);

  /* ── Fetch Real Dashboard Stats ── */
  async function fetchDashboardStats(userId: string, role: string) {
    try {
      /* Available Tasks */
      const { count: taskCount } = await supabase
        .from("work_tasks")
        .select("*", { count: "exact", head: true })
        .eq("status", "active");

      /* Submitted Work */
      const { count: submitCount } = await supabase
        .from("work_submissions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);

      /* Total Earnings */
      const { data: earningsData } = await supabase
        .from("earnings_ledger")
        .select("amount")
        .eq("user_id", userId)
        .eq("type", "earning");

      const totalEarnings = (earningsData || []).reduce(
        (sum: number, row: { amount: number }) => sum + (row.amount || 0),
        0
      );

      /* Notifications */
      const { count: notifCount } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("status", "active")
        .contains("recipient_roles", [role]);

      /* Weekly Activity (submissions in last 7 days) */
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: activityData } = await supabase
        .from("work_submissions")
        .select("created_at")
        .eq("user_id", userId)
        .gte("created_at", sevenDaysAgo.toISOString());

      const weeklyArr = [0, 0, 0, 0, 0, 0, 0];
      (activityData || []).forEach((row: { created_at: string }) => {
        const day = new Date(row.created_at).getDay();
        const idx = day === 0 ? 6 : day - 1;
        weeklyArr[idx]++;
      });

      setStats({
        availableTasks: taskCount || 0,
        submittedWork: submitCount || 0,
        totalEarnings,
        notificationCount: notifCount || 0,
        weeklyActivity: weeklyArr,
      });
    } catch (err) {
      console.error("Stats fetch error:", err);
    }
  }

  /* ── Logout ── */
  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  /* ── Menu Navigation ── */
  function openMenu(menu: MenuKey) {
    setActiveMenu(menu);
    setSidebarOpen(false);
  }

  /* ── Loading Screen ── */
  if (loading) {
    return (
      <div style={s.loadingScreen}>
        <div style={{ textAlign: "center" }}>
          <div style={s.loadingLogo}>W</div>
          <p style={{ color: "#8190aa", marginTop: 14 }}>Loading Staff Portal...</p>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  const fullName =
    [profile.first_name, profile.surname].filter(Boolean).join(" ") || "Staff Member";

  const superAdminName = superAdmin
    ? [superAdmin.first_name, superAdmin.surname].filter(Boolean).join(" ")
    : "Not assigned";

  /* ── Activity Chart Max ── */
  const chartMax = Math.max(...stats.weeklyActivity, 3);
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  /* ───────── Dashboard Overview Content ───────── */
  function renderDashboard() {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Welcome Banner */}
        <div style={s.welcomeBanner}>
          <div style={s.welcomeOverlay}>
            <div>
              <p style={{ color: "#aeb4bd", fontSize: 14, margin: 0 }}>Welcome Back,</p>
              <h2 style={s.welcomeName}>{fullName}!</h2>
              <p style={{ color: "#8190aa", fontSize: 13, margin: "8px 0 0" }}>
                Together we grow stronger — WIN GROUP
              </p>
            </div>
            <div style={s.welcomeLogo}>
              <div style={s.welcomeLogoMark}>W</div>
              <div>
                <strong style={{ color: "#fff", fontSize: 16, letterSpacing: 1 }}>WIN GROUP</strong>
                <p style={{ color: "#8190aa", fontSize: 8, margin: "3px 0 0", letterSpacing: 0.5 }}>
                  WOLF INDEPENDENT NATIONAL GROUP
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Stats Cards */}
        <div style={s.statsGrid}>
          <div style={s.statCard} onClick={() => openMenu("tasks")}>
            <div style={{ ...s.statIcon, background: "#1e3a5f" }}>📋</div>
            <div>
              <div style={s.statValue}>{stats.availableTasks}</div>
              <div style={s.statLabel}>Available Tasks</div>
            </div>
          </div>

          <div style={s.statCard} onClick={() => openMenu("submit")}>
            <div style={{ ...s.statIcon, background: "#1c3a2a" }}>✅</div>
            <div>
              <div style={s.statValue}>{stats.submittedWork}</div>
              <div style={s.statLabel}>Submitted Work</div>
            </div>
          </div>

          <div style={s.statCard} onClick={() => openMenu("earnings")}>
            <div style={{ ...s.statIcon, background: "#2d1f3d" }}>💰</div>
            <div>
              <div style={s.statValue}>Rs. {stats.totalEarnings}</div>
              <div style={s.statLabel}>Total Earnings</div>
            </div>
          </div>

          <div style={s.statCard} onClick={() => openMenu("notifications")}>
            <div style={{ ...s.statIcon, background: "#3a2e1a" }}>🔔</div>
            <div>
              <div style={s.statValue}>{stats.notificationCount}</div>
              <div style={s.statLabel}>Notifications</div>
            </div>
          </div>
        </div>

        {/* Activity Chart + Quick Access Row */}
        <div style={s.chartQuickRow}>
          {/* Activity Chart */}
          <div style={s.chartCard}>
            <div style={s.chartHeader}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>📊</span>
                <strong>Your Activity Overview</strong>
              </div>
              <span style={s.chartPeriod}>Last 7 Days</span>
            </div>

            <div style={s.chartArea}>
              {/* Y-axis labels */}
              <div style={s.yAxis}>
                {Array.from({ length: chartMax + 1 }, (_, i) => chartMax - i).map((v) => (
                  <span key={v} style={s.yLabel}>{v}</span>
                ))}
              </div>

              {/* Bars */}
              <div style={s.barsContainer}>
                {stats.weeklyActivity.map((val, idx) => (
                  <div key={idx} style={s.barCol}>
                    <div style={s.barTrack}>
                      <div
                        style={{
                          ...s.barFill,
                          height: chartMax > 0 ? `${(val / chartMax) * 100}%` : "0%",
                        }}
                      />
                      {/* Dot on top */}
                      <div
                        style={{
                          ...s.barDot,
                          bottom: chartMax > 0 ? `${(val / chartMax) * 100}%` : "0%",
                        }}
                      />
                    </div>
                    <span style={s.barLabel}>{dayLabels[idx]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Access */}
          <div style={s.quickCard}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <span style={{ fontSize: 16 }}>⚡</span>
              <strong>Quick Access</strong>
            </div>

            {[
              { label: "View Tasks", icon: "📋", menu: "tasks" as MenuKey },
              { label: "Check Earnings", icon: "💰", menu: "earnings" as MenuKey },
              { label: "Update Profile", icon: "👤", menu: "profile" as MenuKey },
              { label: "Get Support", icon: "🎧", menu: "support" as MenuKey },
            ].map((item) => (
              <button
                key={item.menu}
                onClick={() => openMenu(item.menu)}
                style={s.quickItem}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </span>
                <span style={{ color: "#6b7280" }}>→</span>
              </button>
            ))}
          </div>
        </div>

        {/* Stay Productive Banner */}
        <div style={s.motivBanner}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>ℹ️</span>
              <strong style={{ fontSize: 16 }}>Stay Productive!</strong>
            </div>
            <p style={{ color: "#aeb4bd", fontSize: 13, margin: "8px 0 0", lineHeight: 1.6 }}>
              Complete more tasks, earn more, and be a valuable part of WIN GROUP.
            </p>
          </div>
          <button onClick={() => openMenu("tasks")} style={s.motivBtn}>
            View Tasks →
          </button>
        </div>
      </div>
    );
  }

  /* ───────── Render Content ───────── */
  function renderContent() {
    switch (activeMenu) {
      case "overview":
        return renderDashboard();
      case "tasks":
        return (
          <AvailableWorkTasks
            onSelectTask={(task) => {
              setSelectedTask(task);
              setActiveMenu("submit");
            }}
          />
        );
      case "submit":
        return (
          <SubmitWork
            selectedTask={selectedTask}
            onBackToTasks={() => setActiveMenu("tasks")}
          />
        );
      case "earnings":
        return <MyEarnings />;
      case "notifications":
        return <Notifications />;
      case "profile":
        return (
          <MyProfile
            profile={profile}
            superAdmin={superAdmin}
            onProfileUpdate={async () => {
              const { data: { user } } = await supabase.auth.getUser();
              if (!user) return;
              const { data } = await supabase
                .from("profiles")
                .select("first_name, surname, role, avatar_url, team_code, created_at")
                .eq("id", user.id)
                .single();
              if (data) setProfile(data as StaffProfile);
            }}
          />
        );
      case "support":
        return <Support />;
      default:
        return renderDashboard();
    }
  }

  /* ───────── RENDER ───────── */

  const sidebarWidth = 260;
  const showSidebar = sidebarOpen;

  return (
    <div style={s.layout}>
      {/* ── SIDEBAR ── */}
      <aside
        style={{
          ...s.sidebar,
          width: sidebarWidth,
          marginLeft: showSidebar ? 0 : -sidebarWidth,
        }}
      >
        {/* Brand */}
        <div style={s.brand}>
          <div style={s.brandMark}>W</div>
          <div>
            <h2 style={s.brandTitle}>WIN GROUP</h2>
            <p style={s.brandSub}>WOLF INDEPENDENT NATIONAL GROUP</p>
          </div>
        </div>

        {/* User Box */}
        <div style={s.userBox}>
          <ProfileAvatar src={profile.avatar_url} name={fullName} size={44} />
          <div style={{ minWidth: 0 }}>
            <strong style={s.userName}>{fullName}</strong>
            <p style={s.userRole}>Staff Member</p>
          </div>
        </div>

        {/* Navigation */}
        <nav style={s.nav}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => openMenu(item.id)}
              style={{
                ...s.menuBtn,
                ...(activeMenu === item.id ? s.menuBtnActive : {}),
              }}
            >
              <span style={s.menuIcon}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>

              {/* Notification Badge */}
              {item.id === "notifications" && stats.notificationCount > 0 && (
                <span style={s.notifBadge}>{stats.notificationCount}</span>
              )}

              {activeMenu === item.id && <span style={s.activeBar} />}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ marginTop: "auto", paddingTop: 20 }}>
          <button onClick={logout} style={s.logoutBtn}>
            <span>↪</span> Logout
          </button>
          <p style={s.sideFooter}>WIN GROUP STAFF PORTAL</p>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main
        style={{
          ...s.main,
          marginLeft: showSidebar ? sidebarWidth : 0,
        }}
      >
        {/* Top Header */}
        <header style={s.topbar}>
          <div style={s.headerLeft}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={s.hamburger}
              aria-label="Toggle sidebar"
            >
              ☰
            </button>

            <div>
              <strong style={{ color: "#fff", fontSize: 16, letterSpacing: 1 }}>WIN GROUP</strong>
              <p style={{ color: "#71819d", fontSize: 8, margin: "2px 0 0", letterSpacing: 0.8 }}>
                WOLF INDEPENDENT NATIONAL GROUP
              </p>
            </div>

            <div style={s.headerDivider} />

            <div>
              <strong style={{ color: "#fff", fontSize: 14 }}>Staff Portal</strong>
              <p style={{ color: "#71819d", fontSize: 10, margin: "2px 0 0" }}>Staff Workspace</p>
            </div>
          </div>

          <div style={s.headerRight}>
            <ProfileAvatar src={profile.avatar_url} name={fullName} size={38} />
            <div style={{ minWidth: 0 }}>
              <strong style={{ color: "#fff", fontSize: 13, display: "block" }}>{fullName}</strong>
              <span style={{ color: "#8190aa", fontSize: 10 }}>Staff Member</span>
            </div>
            <div style={s.headerMeta}>
              <span style={{ color: "#71819d", fontSize: 9 }}>Admin: {superAdminName}</span>
              <span style={{ color: "#71819d", fontSize: 9 }}>Code: {superAdmin?.team_code || "N/A"}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div style={s.pageContent}>{renderContent()}</div>

        {/* Footer */}
        <footer style={s.footer}>
          <span>WIN GROUP STAFF PORTAL</span>
          <span>Staff Workspace</span>
        </footer>
      </main>
    </div>
  );
}

/* ───────── STYLES ───────── */

const s: Record<string, CSSProperties> = {
  layout: {
    minHeight: "100vh",
    background: "#0a0f1e",
    color: "#eef2ff",
    fontFamily: "Arial, sans-serif",
    display: "flex",
    overflow: "hidden",
  },

  /* Loading */
  loadingScreen: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#0a0f1e",
    color: "#fff",
  },
  loadingLogo: {
    width: 60,
    height: 60,
    margin: "0 auto",
    borderRadius: 16,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg,#2563eb,#1e40af)",
    color: "#fff",
    fontSize: 24,
    fontWeight: 800,
  },

  /* Sidebar */
  sidebar: {
    flexShrink: 0,
    background: "#0d1526",
    borderRight: "1px solid #1e2d45",
    padding: "18px 14px",
    boxSizing: "border-box",
    display: "flex",
    flexDirection: "column",
    overflowY: "auto",
    transition: "margin-left 0.3s ease, width 0.3s ease",
    height: "100vh",
    position: "sticky",
    top: 0,
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    paddingBottom: 18,
    borderBottom: "1px solid #1e2d45",
  },
  brandMark: {
    width: 40,
    height: 40,
    minWidth: 40,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg,#2563eb,#1e40af)",
    color: "#fff",
    fontSize: 20,
    fontWeight: 800,
  },
  brandTitle: {
    margin: 0,
    fontSize: 17,
    letterSpacing: 1.5,
    color: "#fff",
  },
  brandSub: {
    fontSize: 7,
    letterSpacing: 0.6,
    color: "#6b7a94",
    margin: "3px 0 0",
  },

  /* User Box */
  userBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "16px 4px",
    borderBottom: "1px solid #1e2d45",
  },
  userName: {
    display: "block",
    color: "#fff",
    fontSize: 13,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  userRole: {
    color: "#6b7a94",
    fontSize: 11,
    margin: "3px 0 0",
  },

  /* Nav */
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    marginTop: 18,
    flex: 1,
  },
  menuBtn: {
    position: "relative",
    width: "100%",
    padding: "11px 10px",
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: "1px solid transparent",
    borderRadius: 8,
    background: "transparent",
    color: "#8d9bb3",
    textAlign: "left",
    fontSize: 13,
    cursor: "pointer",
  },
  menuBtnActive: {
    background: "#162544",
    border: "1px solid #264680",
    color: "#fff",
    fontWeight: 700,
  },
  menuIcon: {
    width: 22,
    height: 22,
    display: "grid",
    placeItems: "center",
    fontSize: 14,
  },
  activeBar: {
    position: "absolute",
    right: 0,
    top: 8,
    bottom: 8,
    width: 3,
    borderRadius: 4,
    background: "#3b82f6",
  },
  notifBadge: {
    padding: "2px 7px",
    borderRadius: 10,
    fontSize: 10,
    fontWeight: 700,
    background: "#e74c3c",
    color: "#fff",
    marginLeft: "auto",
  },

  /* Logout */
  logoutBtn: {
    width: "100%",
    padding: 11,
    border: "1px solid #4a2030",
    borderRadius: 8,
    background: "#2a1520",
    color: "#ffb6c5",
    fontWeight: 700,
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    gap: 8,
    alignItems: "center",
    fontSize: 13,
  },
  sideFooter: {
    textAlign: "center",
    color: "#4a5568",
    fontSize: 8,
    letterSpacing: 1,
    margin: "14px 0 0",
  },

  /* Main */
  main: {
    flex: 1,
    minHeight: "100vh",
    display: "flex",
    flexDirection: "column",
    transition: "margin-left 0.3s ease",
    overflow: "auto",
  },

  /* Topbar */
  topbar: {
    background: "#0d1526",
    borderBottom: "1px solid #1e2d45",
    padding: "12px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    minHeight: 64,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  hamburger: {
    width: 38,
    height: 36,
    border: "1px solid #2a3a55",
    background: "#131d33",
    color: "#fff",
    borderRadius: 8,
    fontSize: 18,
    cursor: "pointer",
    flexShrink: 0,
  },
  headerDivider: {
    width: 1,
    height: 30,
    background: "#2a3a55",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginLeft: "auto",
    flexWrap: "wrap",
  },
  headerMeta: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },

  /* Page Content */
  pageContent: {
    padding: 20,
    flex: 1,
    maxWidth: 1400,
    width: "100%",
    margin: "0 auto",
    boxSizing: "border-box",
  },

  /* Footer */
  footer: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    padding: "14px 20px",
    borderTop: "1px solid #1e2d45",
    color: "#4a5568",
    fontSize: 10,
    letterSpacing: 0.8,
  },

  /* ── DASHBOARD STYLES ── */

  /* Welcome Banner */
  welcomeBanner: {
    background: "linear-gradient(135deg, #0d1a30 0%, #162544 50%, #1a2e50 100%)",
    borderRadius: 14,
    border: "1px solid #1e2d45",
    overflow: "hidden",
    position: "relative",
  },
  welcomeOverlay: {
    padding: "28px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 16,
    backgroundImage:
      "repeating-linear-gradient(135deg, transparent, transparent 40px, rgba(255,255,255,0.015) 40px, rgba(255,255,255,0.015) 41px)",
  },
  welcomeName: {
    fontSize: 26,
    margin: "6px 0 0",
    color: "#60a5fa",
    fontWeight: 700,
  },
  welcomeLogo: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  welcomeLogoMark: {
    width: 44,
    height: 44,
    borderRadius: 12,
    display: "grid",
    placeItems: "center",
    background: "linear-gradient(135deg,#2563eb,#1e40af)",
    color: "#fff",
    fontSize: 22,
    fontWeight: 800,
  },

  /* Stats Grid */
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 14,
  },
  statCard: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    padding: 18,
    background: "#111a2d",
    border: "1px solid #1e2d45",
    borderRadius: 12,
    cursor: "pointer",
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    fontSize: 20,
    flexShrink: 0,
  },
  statValue: {
    fontSize: 22,
    fontWeight: 700,
    color: "#fff",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7a94",
    marginTop: 2,
  },

  /* Chart + Quick Access Row */
  chartQuickRow: {
    display: "grid",
    gridTemplateColumns: "1fr 280px",
    gap: 14,
  },
  chartCard: {
    background: "#111a2d",
    border: "1px solid #1e2d45",
    borderRadius: 12,
    padding: 20,
  },
  chartHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  chartPeriod: {
    padding: "5px 12px",
    borderRadius: 16,
    fontSize: 11,
    background: "#1a2540",
    border: "1px solid #2a3a55",
    color: "#8190aa",
  },
  chartArea: {
    display: "flex",
    gap: 8,
    height: 160,
  },
  yAxis: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    paddingBottom: 22,
  },
  yLabel: {
    fontSize: 10,
    color: "#4a5568",
    textAlign: "right",
    width: 16,
  },
  barsContainer: {
    flex: 1,
    display: "flex",
    justifyContent: "space-around",
    alignItems: "flex-end",
    gap: 4,
    paddingBottom: 22,
    borderBottom: "1px solid #1e2d45",
    position: "relative",
  },
  barCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  barTrack: {
    width: "100%",
    maxWidth: 40,
    height: "100%",
    position: "relative",
    display: "flex",
    alignItems: "flex-end",
  },
  barFill: {
    width: "100%",
    borderRadius: "4px 4px 0 0",
    background: "linear-gradient(180deg, #3b82f6, #1e40af)",
    transition: "height 0.5s ease",
    minHeight: 2,
  },
  barDot: {
    position: "absolute",
    left: "50%",
    transform: "translateX(-50%) translateY(50%)",
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#60a5fa",
    border: "2px solid #111a2d",
  },
  barLabel: {
    fontSize: 11,
    color: "#6b7a94",
    position: "absolute",
    bottom: 0,
    transform: "translateY(100%)",
    paddingTop: 4,
  },

  /* Quick Access */
  quickCard: {
    background: "#111a2d",
    border: "1px solid #1e2d45",
    borderRadius: 12,
    padding: 18,
  },
  quickItem: {
    width: "100%",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "12px 10px",
    border: "none",
    borderBottom: "1px solid #1e2d45",
    background: "transparent",
    color: "#d1d9e8",
    cursor: "pointer",
    fontSize: 13,
  },

  /* Motivational Banner */
  motivBanner: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 14,
    padding: "20px 24px",
    background: "#111a2d",
    border: "1px solid #264680",
    borderRadius: 12,
  },
  motivBtn: {
    padding: "10px 20px",
    border: "none",
    borderRadius: 8,
    background: "#2563eb",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
    whiteSpace: "nowrap",
  },
};

