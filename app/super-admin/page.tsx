
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

/* ══════════════════════════════════════════
   TYPES
══════════════════════════════════════════ */

type Profile = {
  id: string;
  username: string | null;
  first_name: string | null;
  surname: string | null;
  role: string;
  phone: string | null;
  phone_verified: boolean | null;
  team_code: string | null;
  referred_by: string | null;
  avatar_url: string | null;
  created_at: string;
};

type WorkTask = {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  status: string;
  deadline: string | null;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
  target_roles: string[];
};

type Submission = {
  id: string;
  task_id: string;
  user_id: string;
  work_description: string;
  proof_url: string | null;
  status: "pending" | "approved" | "rejected";
  earning_amount: number;
  created_at: string;
};

type Earning = {
  id: string;
  submission_id: string;
  user_id: string;
  amount: number;
  payment_status: "unpaid" | "paid";
  paid_by: string | null;
  paid_at: string | null;
  created_at: string;
};

type Notification = {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  is_read: boolean;
  target_role: string | null;
  created_at: string;
};

type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: string;
  priority: string;
  admin_reply: string | null;
  created_at: string;
  updated_at: string;
};

/* ══════════════════════════════════════════
   MENU ITEMS
══════════════════════════════════════════ */

const menuItems = [
  { key: "overview", label: "Overview", icon: "📊" },
  { key: "team", label: "Team Members", icon: "👥" },
  { key: "create-staff", label: "Create Staff", icon: "➕" },
  { key: "tasks", label: "Work Tasks", icon: "📋" },
  { key: "submissions", label: "Work Submissions", icon: "✅" },
  { key: "earnings", label: "Earnings", icon: "💰" },
  { key: "notifications", label: "Notifications", icon: "🔔" },
  { key: "profile", label: "My Profile", icon: "👤" },
  { key: "support", label: "Support", icon: "🆘" },
];

/* ══════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════ */

export default function SuperAdminDashboard() {
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const [activeModule, setActiveModule] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [members, setMembers] = useState<Profile[]>([]);
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");

  useEffect(() => { checkAuth(); }, []);

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/"); return; }

    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    if (error || !data || data.role !== "super_admin") { router.replace("/"); return; }

    setUserId(user.id);
    setMyProfile(data as Profile);
    setLoading(false);
    loadAllData();
  }

  async function loadAllData() {
    try {
      const [membersRes, tasksRes, subsRes, earningsRes, notifsRes, ticketsRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("work_tasks").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("work_submissions").select("*").order("created_at", { ascending: false }),
        supabase.from("earnings_ledger").select("*").order("created_at", { ascending: false }),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }),
        supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
      ]);
      setMembers((membersRes.data || []) as Profile[]);
      setTasks((tasksRes.data || []) as WorkTask[]);
      setSubmissions((subsRes.data || []) as Submission[]);
      setEarnings((earningsRes.data || []) as Earning[]);
      setNotifications((notifsRes.data || []) as Notification[]);
      setTickets((ticketsRes.data || []) as SupportTicket[]);
    } catch (err: any) { showNotice(err.message || "Data load nahi hua", "error"); }
  }

  function showNotice(msg: string, type: "success" | "error" = "success") {
    setNotice(msg); setNoticeType(type);
    setTimeout(() => setNotice(""), 4000);
  }

  function getUserName(uid: string | null) {
    if (!uid) return "Unknown";
    const user = members.find((m) => m.id === uid);
    if (user) { const name = `${user.first_name || ""} ${user.surname || ""}`.trim(); return name || user.username || uid.slice(0, 8); }
    return uid.slice(0, 8);
  }

  function getTaskTitle(taskId: string | null) {
    if (!taskId) return "Unknown Task";
    const task = tasks.find((t) => t.id === taskId);
    return task?.title || taskId.slice(0, 8);
  }

  async function logout() { await supabase.auth.signOut(); router.replace("/"); }

  const stats = {
    totalMembers: members.length,
    staffCount: members.filter((m) => m.role === "staff").length,
    adminCount: members.filter((m) => m.role === "admin").length,
    activeTasks: tasks.filter((t) => t.status === "active").length,
    pendingSubmissions: submissions.filter((s) => s.status === "pending").length,
    approvedSubmissions: submissions.filter((s) => s.status === "approved").length,
    totalEarnings: earnings.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    unpaidEarnings: earnings.filter((e) => e.payment_status === "unpaid").reduce((sum, e) => sum + Number(e.amount || 0), 0),
    unreadNotifications: notifications.filter((n) => !n.is_read).length,
    openTickets: tickets.filter((t) => t.status === "open" || t.status === "pending").length,
  };

  if (loading) {
    return (<div style={{ minHeight: "100vh", background: "#0f0f0f", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff" }}>Loading Super Admin Portal...</div>);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", display: "flex", color: "#e9e9e9", fontFamily: "Arial, sans-serif" }}>

      {/* SIDEBAR */}
      <aside style={{ width: sidebarOpen ? "240px" : "0px", minWidth: sidebarOpen ? "240px" : "0px", background: "#1a1a1a", borderRight: sidebarOpen ? "1px solid #333" : "none", transition: "all 0.3s ease", overflow: "hidden", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100 }}>
        <div style={{ padding: "20px", borderBottom: "1px solid #333" }}>
          <div style={{ fontSize: "18px", fontWeight: "bold", color: "#fff" }}>🐺 WIN GROUP</div>
          <div style={{ fontSize: "10px", color: "#888", letterSpacing: "1px", marginTop: "4px" }}>SUPER ADMIN PORTAL</div>
        </div>
        <div style={{ padding: "16px" }}>
          <div style={{ fontSize: "12px", color: "#fff", fontWeight: "bold" }}>{myProfile?.first_name || myProfile?.username || "Super Admin"}</div>
          <div style={{ fontSize: "10px", color: "#888", marginTop: "2px" }}>Super Admin</div>
        </div>
        <nav style={{ padding: "8px" }}>
          {menuItems.map((item) => (
            <button key={item.key} onClick={() => { setActiveModule(item.key); setSidebarOpen(false); }} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", background: activeModule === item.key ? "#2563eb" : "transparent", color: activeModule === item.key ? "#fff" : "#aaa", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: activeModule === item.key ? "bold" : "normal", textAlign: "left", marginBottom: "2px" }}>
              <span>{item.icon}</span><span>{item.label}</span>
              {item.key === "notifications" && stats.unreadNotifications > 0 && (<span style={{ marginLeft: "auto", background: "#ef4444", color: "#fff", borderRadius: "10px", padding: "2px 6px", fontSize: "10px", fontWeight: "bold" }}>{stats.unreadNotifications}</span>)}
            </button>
          ))}
          <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", background: "transparent", color: "#ef4444", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", textAlign: "left", marginTop: "16px" }}>
            <span>🚪</span><span>Logout</span>
          </button>
        </nav>
      </aside>

      {sidebarOpen && (<div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }} />)}

      {/* MAIN */}
      <main style={{ flex: 1, minWidth: 0 }}>
        <header style={{ padding: "12px 20px", background: "#1a1a1a", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", color: "#fff", fontSize: "20px", cursor: "pointer", padding: "4px" }}>☰</button>
            <div>
              <div style={{ fontSize: "14px", fontWeight: "bold", color: "#fff" }}>🐺 WIN GROUP — Super Admin</div>
              <div style={{ fontSize: "10px", color: "#888" }}>{menuItems.find((m) => m.key === activeModule)?.label || "Overview"}</div>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={loadAllData} style={{ padding: "6px 12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>🔄 Refresh</button>
            <div style={{ fontSize: "11px", color: "#aaa" }}>{myProfile?.first_name || myProfile?.username}</div>
          </div>
        </header>

        {notice && (<div style={{ margin: "12px 20px 0", padding: "12px 16px", background: noticeType === "success" ? "#064e3b" : "#7f1d1d", color: noticeType === "success" ? "#86efac" : "#fca5a5", borderRadius: "6px", fontSize: "12px" }}>{noticeType === "success" ? "✓" : "✕"} {notice}</div>)}

        <div style={{ padding: "20px" }}>
          {activeModule === "overview" && <OverviewModule stats={stats} setActiveModule={setActiveModule} />}
          {activeModule === "team" && <TeamModule members={members} getUserName={getUserName} showNotice={showNotice} loadAllData={loadAllData} />}
          {activeModule === "create-staff" && <CreateStaffModule showNotice={showNotice} loadAllData={loadAllData} />}
          {activeModule === "tasks" && <TasksModule tasks={tasks} getUserName={getUserName} showNotice={showNotice} loadAllData={loadAllData} userId={userId} />}
          {activeModule === "submissions" && <SubmissionsModule submissions={submissions} getUserName={getUserName} getTaskTitle={getTaskTitle} showNotice={showNotice} loadAllData={loadAllData} tasks={tasks} />}
          {activeModule === "earnings" && <EarningsModule earnings={earnings} getUserName={getUserName} showNotice={showNotice} loadAllData={loadAllData} />}
          {activeModule === "notifications" && <NotificationsModule notifications={notifications} showNotice={showNotice} loadAllData={loadAllData} />}
          {activeModule === "profile" && <ProfileModule myProfile={myProfile} showNotice={showNotice} loadAllData={loadAllData} />}
          {activeModule === "support" && <SupportModule tickets={tickets} getUserName={getUserName} showNotice={showNotice} loadAllData={loadAllData} />}
        </div>
      </main>
    </div>
  );
}

/* ══════════════════════════════════════════
   MODULE: OVERVIEW
══════════════════════════════════════════ */

function OverviewModule({ stats, setActiveModule }: { stats: any; setActiveModule: (m: string) => void }) {
  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>OVERVIEW</div>
        <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Super Admin Dashboard</h2>
        <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "12px" }}>Team management aur work operations ka complete overview.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {[
          { label: "Total Members", value: stats.totalMembers, color: "#3b82f6", module: "team" },
          { label: "Staff Members", value: stats.staffCount, color: "#06b6d4", module: "team" },
          { label: "Active Tasks", value: stats.activeTasks, color: "#10b981", module: "tasks" },
          { label: "Pending Reviews", value: stats.pendingSubmissions, color: "#f59e0b", module: "submissions" },
          { label: "Total Earnings", value: `Rs. ${stats.totalEarnings.toLocaleString()}`, color: "#8b5cf6", module: "earnings" },
          { label: "Unpaid Earnings", value: `Rs. ${stats.unpaidEarnings.toLocaleString()}`, color: "#ef4444", module: "earnings" },
          { label: "Unread Notifications", value: stats.unreadNotifications, color: "#f59e0b", module: "notifications" },
          { label: "Open Tickets", value: stats.openTickets, color: "#ef4444", module: "support" },
        ].map((card) => (
          <div key={card.label} onClick={() => setActiveModule(card.module)} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "16px", cursor: "pointer" }}>
            <div style={{ fontSize: "11px", color: "#888" }}>{card.label}</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: card.color, marginTop: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{card.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
        {[
          { label: "👥 Manage Team", desc: "Staff members ko manage karein", module: "team" },
          { label: "➕ Create Staff", desc: "Naya staff account banayein", module: "create-staff" },
          { label: "📋 Work Tasks", desc: "Tasks assign aur manage karein", module: "tasks" },
          { label: "✅ Review Work", desc: "Staff submissions review karein", module: "submissions" },
          { label: "💰 Earnings", desc: "Staff earnings track karein", module: "earnings" },
          { label: "🆘 Support", desc: "Help tickets manage karein", module: "support" },
        ].map((item) => (
          <div key={item.label} onClick={() => setActiveModule(item.module)} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "16px", cursor: "pointer" }}>
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#fff" }}>{item.label}</div>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>{item.desc}</div>
            <div style={{ fontSize: "11px", color: "#2563eb", marginTop: "8px" }}>Open →</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MODULE: TEAM MEMBERS
══════════════════════════════════════════ */

function TeamModule({ members, getUserName, showNotice, loadAllData }: any) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null);
  const itemsPerPage = 10;

  const filtered = members.filter((m: Profile) => {
    const name = `${m.first_name || ""} ${m.surname || ""} ${m.username || ""}`.toLowerCase();
    return (!search || name.includes(search.toLowerCase())) && (roleFilter === "all" || m.role === roleFilter);
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  async function updateRole(memberId: string, newRole: string) {
    if (!window.confirm(`Role change to ${newRole}?`)) return;
    const { error } = await supabase.from("profiles").update({ role: newRole }).eq("id", memberId);
    if (error) { showNotice(error.message, "error"); } else { showNotice("Role updated.", "success"); await loadAllData(); }
  }

  function getDisplayName(m: Profile) { const name = `${m.first_name || ""} ${m.surname || ""}`.trim(); return name || m.username || "Unnamed"; }
  function getRoleName(r: string) { switch (r) { case "founder_owner": return "Founder"; case "super_admin": return "Super Admin"; case "admin": return "Admin"; case "staff": return "Staff"; default: return r; } }

  const roleStats = { total: members.length, founder: members.filter((m: Profile) => m.role === "founder_owner").length, superAdmin: members.filter((m: Profile) => m.role === "super_admin").length, admin: members.filter((m: Profile) => m.role === "admin").length, staff: members.filter((m: Profile) => m.role === "staff").length };

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>TEAM MEMBERS</div>
        <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Team Management</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {[{ label: "Total", value: roleStats.total, color: "#3b82f6" }, { label: "Founders", value: roleStats.founder, color: "#8b5cf6" }, { label: "Super Admins", value: roleStats.superAdmin, color: "#f59e0b" }, { label: "Admins", value: roleStats.admin, color: "#10b981" }, { label: "Staff", value: roleStats.staff, color: "#06b6d4" }].map((s) => (
          <div key={s.label} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "12px" }}>
            <div style={{ fontSize: "11px", color: "#888" }}>{s.label}</div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: s.color, marginTop: "4px" }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <input type="text" placeholder="Search members..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} />
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }}>
            <option value="all">All Roles</option>
            <option value="founder_owner">Founder</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="staff">Staff</option>
          </select>
        </div>
        {paginated.length === 0 ? (<div style={{ textAlign: "center", color: "#888", padding: "40px" }}>Koi member nahi mila.</div>) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead><tr style={{ borderBottom: "1px solid #333", background: "#252525" }}>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Member</th>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Role</th>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Phone</th>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Joined</th>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Actions</th>
              </tr></thead>
              <tbody>
                {paginated.map((m: Profile) => (
                  <tr key={m.id} style={{ borderBottom: "1px solid #333" }}>
                    <td style={{ padding: "12px" }}><div style={{ color: "#fff", fontWeight: "bold" }}>{getDisplayName(m)}</div><div style={{ fontSize: "11px", color: "#888" }}>@{m.username || "N/A"}</div></td>
                    <td style={{ padding: "12px" }}><span style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", background: m.role === "founder_owner" ? "#8b5cf620" : m.role === "super_admin" ? "#f59e0b20" : m.role === "admin" ? "#10b98120" : "#06b6d420", color: m.role === "founder_owner" ? "#d8b4fe" : m.role === "super_admin" ? "#fbbf24" : m.role === "admin" ? "#86efac" : "#67e8f9" }}>{getRoleName(m.role)}</span></td>
                    <td style={{ padding: "12px", color: "#aaa" }}>{m.phone || "N/A"}</td>
                    <td style={{ padding: "12px", color: "#aaa", fontSize: "11px" }}>{new Date(m.created_at).toLocaleDateString("en-PK")}</td>
                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <button onClick={() => setSelectedMember(m)} style={{ padding: "6px 10px", background: "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>👁️ View</button>
                        {m.role === "staff" && (<button onClick={() => updateRole(m.id, "admin")} style={{ padding: "6px 10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>⬆️ Promote</button>)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (<div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={{ padding: "6px 10px", background: page === 1 ? "#333" : "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: "11px" }}>← Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (<button key={p} onClick={() => setPage(p)} style={{ padding: "6px 10px", background: page === p ? "#2563eb" : "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: page === p ? "bold" : "normal" }}>{p}</button>))}
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={{ padding: "6px 10px", background: page === totalPages ? "#333" : "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: "11px" }}>Next →</button>
        </div>)}
      </div>
      {selectedMember && (
        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px", marginTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Member Details</h3>
            <button onClick={() => setSelectedMember(null)} style={{ padding: "6px 12px", background: "#444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Close</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            {[{ label: "Name", value: getDisplayName(selectedMember) }, { label: "Username", value: selectedMember.username || "N/A" }, { label: "Role", value: getRoleName(selectedMember.role) }, { label: "Phone", value: selectedMember.phone || "N/A" }, { label: "Team Code", value: selectedMember.team_code || "N/A" }, { label: "Joined", value: new Date(selectedMember.created_at).toLocaleString("en-PK") }].map((item) => (
              <div key={item.label}><div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>{item.label}</div><div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>{item.value}</div></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   MODULE: CREATE STAFF
══════════════════════════════════════════ */

function CreateStaffModule({ showNotice, loadAllData }: any) {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creating, setCreating] = useState(false);

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) { showNotice("Sab fields fill karein.", "error"); return; }
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { showNotice("Session expire.", "error"); return; }
      const response = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ username: username.trim(), email: email.trim(), password: password.trim(), role: "staff" }) });
      const result = await response.json();
      if (!response.ok) { showNotice(result.error || "Failed.", "error"); return; }
      showNotice("Staff account created!", "success"); setUsername(""); setEmail(""); setPassword(""); await loadAllData();
    } catch (err: any) { showNotice(err.message || "Error.", "error"); }
    setCreating(false);
  }

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>CREATE STAFF</div>
        <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Create New Staff Account</h2>
        <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "12px" }}>Super Admin sirf Staff accounts bana sakta hai.</p>
      </div>
      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px", maxWidth: "500px" }}>
        <form onSubmit={createStaff} style={{ display: "grid", gap: "16px" }}>
          <div><label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Username *</label><input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Enter username" required style={{ width: "100%", padding: "10px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} /></div>
          <div><label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Email *</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter email" required style={{ width: "100%", padding: "10px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} /></div>
          <div><label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Password *</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 characters" minLength={8} required style={{ width: "100%", padding: "10px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} /></div>
          <div><label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Role</label><input value="Staff" disabled style={{ width: "100%", padding: "10px 12px", background: "#1a1a1a", border: "1px solid #444", borderRadius: "6px", color: "#888", fontSize: "12px" }} /></div>
          <button type="submit" disabled={creating} style={{ padding: "12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", opacity: creating ? 0.6 : 1 }}>{creating ? "Creating..." : "Create Staff Account"}</button>
        </form>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MODULE: WORK TASKS
══════════════════════════════════════════ */

function TasksModule({ tasks, getUserName, showNotice, loadAllData, userId }: any) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reward, setReward] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const itemsPerPage = 10;

  const filtered = tasks.filter((t: WorkTask) => (!search || t.title.toLowerCase().includes(search.toLowerCase())) && (statusFilter === "all" || t.status === statusFilter));
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !reward) { showNotice("Title aur reward enter karein.", "error"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("work_tasks").insert({ title: title.trim(), description: description.trim() || null, reward_amount: Number(reward), deadline: deadline || null, status: "active", created_by: userId, target_roles: ["staff"] });
      if (error) throw error;
      showNotice("Task created.", "success"); setTitle(""); setDescription(""); setReward(""); setDeadline(""); setShowForm(false); await loadAllData();
    } catch (err: any) { showNotice(err.message, "error"); }
    setSaving(false);
  }

  async function toggleTaskStatus(taskId: string, currentStatus: string) {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const { error } = await supabase.from("work_tasks").update({ status: newStatus }).eq("id", taskId);
    if (error) { showNotice(error.message, "error"); } else { showNotice(`Task ${newStatus}.`, "success"); await loadAllData(); }
  }

  return (
    <div>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: "12px" }}>
        <div><div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>WORK TASKS</div><h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Task Management</h2></div>
        <button onClick={() => setShowForm(!showForm)} style={{ padding: "10px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>{showForm ? "Cancel" : "➕ New Task"}</button>
      </div>
      {showForm && (
        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "16px", color: "#fff" }}>Create New Task</h3>
          <form onSubmit={createTask} style={{ display: "grid", gap: "12px" }}>
            <div><label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Title *</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task title" required style={{ width: "100%", padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} /></div>
            <div><label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details" rows={3} style={{ width: "100%", padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px", resize: "vertical" }} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div><label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Reward (Rs.) *</label><input type="number" value={reward} onChange={(e) => setReward(e.target.value)} placeholder="0" min="0" required style={{ width: "100%", padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} /></div>
              <div><label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Deadline</label><input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} /></div>
            </div>
            <button type="submit" disabled={saving} style={{ padding: "10px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", opacity: saving ? 0.6 : 1 }}>{saving ? "Creating..." : "Create Task"}</button>
          </form>
        </div>
      )}
      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <input type="text" placeholder="Search tasks..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }}><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        </div>
        {paginated.length === 0 ? (<div style={{ textAlign: "center", color: "#888", padding: "40px" }}>Koi task nahi mila.</div>) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead><tr style={{ borderBottom: "1px solid #333", background: "#252525" }}>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Task</th>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Reward</th>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Status</th>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Created</th>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Actions</th>
              </tr></thead>
              <tbody>{paginated.map((t: WorkTask) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #333" }}>
                  <td style={{ padding: "12px" }}><div style={{ color: "#fff", fontWeight: "bold" }}>{t.title}</div><div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>{t.description?.slice(0, 50) || "No description"}</div></td>
                  <td style={{ padding: "12px", color: "#10b981", fontWeight: "bold" }}>Rs. {Number(t.reward_amount).toLocaleString()}</td>
                  <td style={{ padding: "12px" }}><span style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", background: t.status === "active" ? "#10b98120" : "#ef444420", color: t.status === "active" ? "#86efac" : "#f87171" }}>{t.status.toUpperCase()}</span></td>
                  <td style={{ padding: "12px", color: "#aaa", fontSize: "11px" }}>{new Date(t.created_at).toLocaleDateString("en-PK")}</td>
                  <td style={{ padding: "12px" }}><button onClick={() => toggleTaskStatus(t.id, t.status)} style={{ padding: "6px 10px", background: t.status === "active" ? "#f59e0b" : "#10b981", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>{t.status === "active" ? "⏸ Pause" : "▶ Activate"}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (<div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={{ padding: "6px 10px", background: page === 1 ? "#333" : "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: "11px" }}>← Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (<button key={p} onClick={() => setPage(p)} style={{ padding: "6px 10px", background: page === p ? "#2563eb" : "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: page === p ? "bold" : "normal" }}>{p}</button>))}
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={{ padding: "6px 10px", background: page === totalPages ? "#333" : "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: "11px" }}>Next →</button>
        </div>)}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MODULE: WORK SUBMISSIONS
══════════════════════════════════════════ */

function SubmissionsModule({ submissions, getUserName, getTaskTitle, showNotice, loadAllData, tasks }: any) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedSub, setSelectedSub] = useState<Submission | null>(null);
  const [approvalAmount, setApprovalAmount] = useState("");
  const [processing, setProcessing] = useState(false);
  const itemsPerPage = 10;

  const filtered = submissions.filter((s: Submission) => (statusFilter === "all" || s.status === statusFilter) && (!search || getUserName(s.user_id).toLowerCase().includes(search.toLowerCase())));
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  async function approveSubmission(subId: string, amount: number) {
    if (amount <= 0) { showNotice("Amount 0 se zyada hona chahiye.", "error"); return; }
    if (!window.confirm(`Rs. ${amount} ke saath approve?`)) return;
    setProcessing(true);
    const { error } = await supabase.from("work_submissions").update({ status: "approved", earning_amount: amount }).eq("id", subId);
    if (error) { showNotice(error.message, "error"); } else { showNotice("Approved.", "success"); setSelectedSub(null); setApprovalAmount(""); await loadAllData(); }
    setProcessing(false);
  }

  async function rejectSubmission(subId: string) {
    if (!window.confirm("Reject?")) return;
    setProcessing(true);
    const { error } = await supabase.from("work_submissions").update({ status: "rejected", earning_amount: 0 }).eq("id", subId);
    if (error) { showNotice(error.message, "error"); } else { showNotice("Rejected.", "success"); setSelectedSub(null); await loadAllData(); }
    setProcessing(false);
  }

  const subStats = { total: submissions.length, pending: submissions.filter((s: Submission) => s.status === "pending").length, approved: submissions.filter((s: Submission) => s.status === "approved").length, rejected: submissions.filter((s: Submission) => s.status === "rejected").length };

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>WORK SUBMISSIONS</div>
        <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Submissions Review</h2>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {[{ label: "Total", value: subStats.total, color: "#3b82f6" }, { label: "Pending", value: subStats.pending, color: "#f59e0b" }, { label: "Approved", value: subStats.approved, color: "#10b981" }, { label: "Rejected", value: subStats.rejected, color: "#ef4444" }].map((s) => (
          <div key={s.label} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "12px" }}>
            <div style={{ fontSize: "11px", color: "#888" }}>{s.label}</div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: s.color, marginTop: "4px" }}>{s.value}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <input type="text" placeholder="Search by user..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }}><option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
        </div>
        {paginated.length === 0 ? (<div style={{ textAlign: "center", color: "#888", padding: "40px" }}>Koi submission nahi mila.</div>) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead><tr style={{ borderBottom: "1px solid #333", background: "#252525" }}>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>User</th>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Task</th>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Status</th>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Earning</th>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Date</th>
                <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Actions</th>
              </tr></thead>
              <tbody>{paginated.map((s: Submission) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #333" }}>
                  <td style={{ padding: "12px", color: "#fff", fontWeight: "bold" }}>{getUserName(s.user_id)}</td>
                  <td style={{ padding: "12px", color: "#aaa" }}>{getTaskTitle(s.task_id)}</td>
                  <td style={{ padding: "12px" }}><span style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", background: s.status === "pending" ? "#f59e0b20" : s.status === "approved" ? "#10b98120" : "#ef444420", color: s.status === "pending" ? "#fbbf24" : s.status === "approved" ? "#86efac" : "#f87171" }}>{s.status.toUpperCase()}</span></td>
                  <td style={{ padding: "12px", color: "#fff", fontWeight: "bold" }}>Rs. {Number(s.earning_amount).toLocaleString()}</td>
                  <td style={{ padding: "12px", color: "#aaa", fontSize: "11px" }}>{new Date(s.created_at).toLocaleDateString("en-PK")}</td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {s.status === "pending" && (<><button onClick={() => { setSelectedSub(s); setApprovalAmount(String(tasks.find((t: WorkTask) => t.id === s.task_id)?.reward_amount || 0)); }} style={{ padding: "6px 10px", background: "#10b981", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>✓ Approve</button><button onClick={() => rejectSubmission(s.id)} disabled={processing} style={{ padding: "6px 10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>✕ Reject</button></>)}
                      <button onClick={() => setSelectedSub(s)} style={{ padding: "6px 10px", background: "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>👁️ View</button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {totalPages > 1 && (<div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={{ padding: "6px 10px", background: page === 1 ? "#333" : "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: "11px" }}>← Prev</button>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (<button key={p} onClick={() => setPage(p)} style={{ padding: "6px 10px", background: page === p ? "#2563eb" : "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: page === p ? "bold" : "normal" }}>{p}</button>))}
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={{ padding: "6px 10px", background: page === totalPages ? "#333" : "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: "11px" }}>Next →</button>
        </div>)}
      </div>
       
/* ══════════════════════════════════════════
   MODULE: WORK SUBMISSIONS (Continue)
   Yeh Part 1 ke SubmissionsModule ke andar paste karein
══════════════════════════════════════════ */

      {selectedSub && (
        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px", marginTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Submission Details</h3>
            <button onClick={() => { setSelectedSub(null); setApprovalAmount(""); }} style={{ padding: "6px 12px", background: "#444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Close</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "16px" }}>
            {[
              { label: "User", value: getUserName(selectedSub.user_id) },
              { label: "Task", value: getTaskTitle(selectedSub.task_id) },
              { label: "Status", value: selectedSub.status.toUpperCase() },
              { label: "Earning", value: `Rs. ${Number(selectedSub.earning_amount).toLocaleString()}` },
              { label: "Date", value: new Date(selectedSub.created_at).toLocaleString("en-PK") },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>{item.label}</div>
                <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>{item.value}</div>
              </div>
            ))}
          </div>
          <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #333" }}>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px", fontWeight: "bold" }}>Work Description</div>
            <div style={{ fontSize: "13px", color: "#aaa", lineHeight: "1.6" }}>{selectedSub.work_description}</div>
          </div>
          {selectedSub.proof_url && (
            <div style={{ marginBottom: "16px", paddingBottom: "16px", borderBottom: "1px solid #333" }}>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px", fontWeight: "bold" }}>Proof</div>
              <a href={selectedSub.proof_url} target="_blank" rel="noreferrer" style={{ color: "#3b82f6", textDecoration: "underline", fontSize: "12px" }}>View Proof →</a>
            </div>
          )}
          {selectedSub.status === "pending" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#888", marginBottom: "4px" }}>Approval Amount (Rs.)</label>
                <input type="number" value={approvalAmount} onChange={(e) => setApprovalAmount(e.target.value)} min="0" style={{ width: "100%", padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} />
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
                <button onClick={() => approveSubmission(selectedSub.id, Number(approvalAmount))} disabled={processing || !approvalAmount} style={{ flex: 1, padding: "8px 12px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", opacity: processing || !approvalAmount ? 0.6 : 1 }}>✓ Approve</button>
                <button onClick={() => rejectSubmission(selectedSub.id)} disabled={processing} style={{ flex: 1, padding: "8px 12px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", opacity: processing ? 0.6 : 1 }}>✕ Reject</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   MODULE: EARNINGS
══════════════════════════════════════════ */

function EarningsModule({ earnings, getUserName, showNotice, loadAllData }: any) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [processing, setProcessing] = useState(false);
  const itemsPerPage = 10;

  const filtered = earnings.filter((e: Earning) => {
    const matchSearch = !search || getUserName(e.user_id).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || e.payment_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  const earningStats = {
    total: earnings.reduce((sum: number, e: Earning) => sum + Number(e.amount || 0), 0),
    paid: earnings.filter((e: Earning) => e.payment_status === "paid").reduce((sum: number, e: Earning) => sum + Number(e.amount || 0), 0),
    unpaid: earnings.filter((e: Earning) => e.payment_status === "unpaid").reduce((sum: number, e: Earning) => sum + Number(e.amount || 0), 0),
  };

  async function markAsPaid(earningId: string) {
    if (!window.confirm("Mark as paid?")) return;

    setProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();

    const { error } = await supabase
      .from("earnings_ledger")
      .update({ payment_status: "paid", paid_by: user?.id || null, paid_at: new Date().toISOString() })
      .eq("id", earningId);

    if (error) { showNotice(error.message, "error"); }
    else { showNotice("Payment marked as paid.", "success"); await loadAllData(); }
    setProcessing(false);
  }

  function exportCSV() {
    const headers = ["User", "Amount", "Status", "Date"];
    const rows = filtered.map((e: Earning) => [getUserName(e.user_id), e.amount, e.payment_status, new Date(e.created_at).toLocaleDateString("en-PK")]);
    const csv = [headers, ...rows].map((r: any) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `earnings-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>EARNINGS</div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Earnings Management</h2>
        </div>
        <button onClick={exportCSV} style={{ padding: "10px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>📥 Export CSV</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Total Earnings", value: `Rs. ${earningStats.total.toLocaleString()}`, color: "#3b82f6" },
          { label: "Paid", value: `Rs. ${earningStats.paid.toLocaleString()}`, color: "#10b981" },
          { label: "Unpaid", value: `Rs. ${earningStats.unpaid.toLocaleString()}`, color: "#ef4444" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "12px" }}>
            <div style={{ fontSize: "11px", color: "#888" }}>{s.label}</div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: s.color, marginTop: "4px" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <input type="text" placeholder="Search by user..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }}>
            <option value="all">All Status</option>
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        {paginated.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>Koi earning record nahi mila.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #333", background: "#252525" }}>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>User</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Amount</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Status</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Date</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map((e: Earning) => (
                  <tr key={e.id} style={{ borderBottom: "1px solid #333" }}>
                    <td style={{ padding: "12px", color: "#fff", fontWeight: "bold" }}>{getUserName(e.user_id)}</td>
                    <td style={{ padding: "12px", color: "#10b981", fontWeight: "bold" }}>Rs. {Number(e.amount).toLocaleString()}</td>
                    <td style={{ padding: "12px" }}>
                      <span style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", background: e.payment_status === "paid" ? "#10b98120" : "#ef444420", color: e.payment_status === "paid" ? "#86efac" : "#f87171" }}>
                        {e.payment_status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "12px", color: "#aaa", fontSize: "11px" }}>{new Date(e.created_at).toLocaleDateString("en-PK")}</td>
                    <td style={{ padding: "12px" }}>
                      {e.payment_status === "unpaid" && (
                        <button onClick={() => markAsPaid(e.id)} disabled={processing} style={{ padding: "6px 10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold", opacity: processing ? 0.6 : 1 }}>💳 Mark Paid</button>
                      )}
                      {e.payment_status === "paid" && (
                        <span style={{ fontSize: "11px", color: "#86efac" }}>✓ Paid {e.paid_at ? new Date(e.paid_at).toLocaleDateString("en-PK") : ""}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={{ padding: "6px 10px", background: page === 1 ? "#333" : "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: "11px" }}>← Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} style={{ padding: "6px 10px", background: page === p ? "#2563eb" : "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: page === p ? "bold" : "normal" }}>{p}</button>
            ))}
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={{ padding: "6px 10px", background: page === totalPages ? "#333" : "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: "11px" }}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MODULE: NOTIFICATIONS
══════════════════════════════════════════ */

function NotificationsModule({ notifications, showNotice, loadAllData }: any) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [nType, setNType] = useState("general");
  const [targetRole, setTargetRole] = useState("all");
  const [saving, setSaving] = useState(false);
  const itemsPerPage = 10;

  const filtered = notifications.filter((n: Notification) => {
    const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "all" || n.notification_type === typeFilter;
    return matchSearch && matchType;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  async function createNotification(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) { showNotice("Title aur message fill karein.", "error"); return; }

    setSaving(true);
    const { error } = await supabase.from("notifications").insert({
      title: title.trim(),
      message: message.trim(),
      notification_type: nType,
      target_role: targetRole === "all" ? null : targetRole,
      is_read: false,
    });

    if (error) { showNotice(error.message, "error"); }
    else { showNotice("Notification sent.", "success"); setTitle(""); setMessage(""); setShowForm(false); await loadAllData(); }
    setSaving(false);
  }

  async function markAllRead() {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    if (error) { showNotice(error.message, "error"); }
    else { showNotice("All marked as read.", "success"); await loadAllData(); }
  }

  return (
    <div>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>NOTIFICATIONS</div>
          <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Notifications</h2>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={markAllRead} style={{ padding: "10px 16px", background: "#444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>✓ Mark All Read</button>
          <button onClick={() => setShowForm(!showForm)} style={{ padding: "10px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px" }}>{showForm ? "Cancel" : "➕ New Notification"}</button>
        </div>
      </div>

      {showForm && (
        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "16px", color: "#fff" }}>Send Notification</h3>
          <form onSubmit={createNotification} style={{ display: "grid", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" required style={{ width: "100%", padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Message *</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Notification message" rows={3} required style={{ width: "100%", padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px", resize: "vertical" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Type</label>
                <select value={nType} onChange={(e) => setNType(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }}>
                  <option value="general">General</option>
                  <option value="alert">Alert</option>
                  <option value="update">Update</option>
                  <option value="task">Task</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Target Role</label>
                <select value={targetRole} onChange={(e) => setTargetRole(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }}>
                  <option value="all">All Users</option>
                  <option value="staff">Staff Only</option>
                  <option value="admin">Admin Only</option>
                </select>
              </div>
            </div>
            <button type="submit" disabled={saving} style={{ padding: "10px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Sending..." : "Send Notification"}
            </button>
          </form>
        </div>
      )}

      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <input type="text" placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} />
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }}>
            <option value="all">All Types</option>
            <option value="general">General</option>
            <option value="alert">Alert</option>
            <option value="update">Update</option>
            <option value="task">Task</option>
          </select>
        </div>

        {paginated.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>Koi notification nahi mili.</div>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {paginated.map((n: Notification) => (
              <div key={n.id} style={{ background: n.is_read ? "#252525" : "#1e293b", border: `1px solid ${n.is_read ? "#333" : "#2563eb"}`, borderRadius: "8px", padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "bold", color: "#fff" }}>
                    {!n.is_read && <span style={{ color: "#3b82f6", marginRight: "6px" }}>●</span>}
                    {n.title}
                  </div>
                  <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "10px", background: "#444", color: "#aaa" }}>{n.notification_type}</span>
                </div>
                <div style={{ fontSize: "12px", color: "#aaa", lineHeight: "1.5" }}>{n.message}</div>
                <div style={{ fontSize: "10px", color: "#666", marginTop: "6px" }}>
                  {new Date(n.created_at).toLocaleString("en-PK")}
                  {n.target_role && <span> • Target: {n.target_role}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={{ padding: "6px 10px", background: page === 1 ? "#333" : "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: "11px" }}>← Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} style={{ padding: "6px 10px", background: page === p ? "#2563eb" : "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: page === p ? "bold" : "normal" }}>{p}</button>
            ))}
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={{ padding: "6px 10px", background: page === totalPages ? "#333" : "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: "11px" }}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MODULE: MY PROFILE
══════════════════════════════════════════ */

function ProfileModule({ myProfile, showNotice, loadAllData }: any) {
  const [firstName, setFirstName] = useState(myProfile?.first_name || "");
  const [surname, setSurname] = useState(myProfile?.surname || "");
  const [phone, setPhone] = useState(myProfile?.phone || "");
  const [saving, setSaving] = useState(false);

  async function updateProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim() || null,
        surname: surname.trim() || null,
        phone: phone.trim() || null,
      })
      .eq("id", myProfile.id);

    if (error) { showNotice(error.message, "error"); }
    else { showNotice("Profile updated successfully.", "success"); await loadAllData(); }
    setSaving(false);
  }

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>MY PROFILE</div>
        <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Profile Settings</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "16px", color: "#fff" }}>Account Information</h3>
          <div style={{ display: "grid", gap: "12px" }}>
            {[
              { label: "Username", value: myProfile?.username || "N/A" },
              { label: "Role", value: "Super Admin" },
              { label: "Team Code", value: myProfile?.team_code || "N/A" },
              { label: "Joined", value: myProfile?.created_at ? new Date(myProfile.created_at).toLocaleString("en-PK") : "N/A" },
            ].map((item) => (
              <div key={item.label}>
                <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>{item.label}</div>
                <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>{item.value}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "16px", color: "#fff" }}>Edit Profile</h3>
          <form onSubmit={updateProfile} style={{ display: "grid", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>First Name</label>
              <input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" style={{ width: "100%", padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Surname</label>
              <input value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Surname" style={{ width: "100%", padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" style={{ width: "100%", padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} />
            </div>
            <button type="submit" disabled={saving} style={{ padding: "10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", opacity: saving ? 0.6 : 1 }}>
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════
   MODULE: SUPPORT
══════════════════════════════════════════ */

function SupportModule({ tickets, getUserName, showNotice, loadAllData }: any) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState("");
  const [processing, setProcessing] = useState(false);
  const itemsPerPage = 10;

  const filtered = tickets.filter((t: SupportTicket) => {
    const matchSearch = !search || t.subject.toLowerCase().includes(search.toLowerCase()) || getUserName(t.user_id).toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || t.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginated = filtered.slice((page - 1) * itemsPerPage, page * itemsPerPage);

  async function replyToTicket(ticketId: string) {
    if (!reply.trim()) { showNotice("Reply likhein.", "error"); return; }

    setProcessing(true);
    const { error } = await supabase
      .from("support_tickets")
      .update({ admin_reply: reply.trim(), status: "resolved", updated_at: new Date().toISOString() })
      .eq("id", ticketId);

    if (error) { showNotice(error.message, "error"); }
    else { showNotice("Reply sent aur ticket resolved.", "success"); setSelectedTicket(null); setReply(""); await loadAllData(); }
    setProcessing(false);
  }

  async function closeTicket(ticketId: string) {
    const { error } = await supabase.from("support_tickets").update({ status: "closed", updated_at: new Date().toISOString() }).eq("id", ticketId);
    if (error) { showNotice(error.message, "error"); }
    else { showNotice("Ticket closed.", "success"); await loadAllData(); }
  }

  const ticketStats = {
    total: tickets.length,
    open: tickets.filter((t: SupportTicket) => t.status === "open" || t.status === "pending").length,
    resolved: tickets.filter((t: SupportTicket) => t.status === "resolved").length,
    closed: tickets.filter((t: SupportTicket) => t.status === "closed").length,
  };

  return (
    <div>
      <div style={{ marginBottom: "20px" }}>
        <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>SUPPORT</div>
        <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Support Tickets</h2>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {[
          { label: "Total", value: ticketStats.total, color: "#3b82f6" },
          { label: "Open", value: ticketStats.open, color: "#f59e0b" },
          { label: "Resolved", value: ticketStats.resolved, color: "#10b981" },
          { label: "Closed", value: ticketStats.closed, color: "#888" },
        ].map((s) => (
          <div key={s.label} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "12px" }}>
            <div style={{ fontSize: "11px", color: "#888" }}>{s.label}</div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: s.color, marginTop: "4px" }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <input type="text" placeholder="Search tickets..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }}>
            <option value="all">All Status</option>
            <option value="open">Open</option>
            <option value="pending">Pending</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>

        {paginated.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>Koi ticket nahi mila.</div>
        ) : (
          <div style={{ display: "grid", gap: "8px" }}>
            {paginated.map((t: SupportTicket) => (
              <div key={t.id} style={{ background: "#252525", border: "1px solid #333", borderRadius: "8px", padding: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "8px" }}>
                  <div>
                    <div style={{ fontSize: "13px", fontWeight: "bold", color: "#fff" }}>{t.subject}</div>
                    <div style={{ fontSize: "11px", color: "#888", marginTop: "2px" }}>By: {getUserName(t.user_id)}</div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <span style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "10px", fontWeight: "bold", background: t.status === "open" || t.status === "pending" ? "#f59e0b20" : t.status === "resolved" ? "#10b98120" : "#44444420", color: t.status === "open" || t.status === "pending" ? "#fbbf24" : t.status === "resolved" ? "#86efac" : "#888" }}>
                      {t.status.toUpperCase()}
                    </span>
                    <span style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "10px", background: t.priority === "high" ? "#ef444420" : t.priority === "medium" ? "#f59e0b20" : "#44444420", color: t.priority === "high" ? "#f87171" : t.priority === "medium" ? "#fbbf24" : "#888" }}>
                      {t.priority?.toUpperCase() || "NORMAL"}
                    </span>
                  </div>
                </div>
                <div style={{ fontSize: "12px", color: "#aaa", marginBottom: "8px" }}>{t.message.slice(0, 100)}{t.message.length > 100 ? "..." : ""}</div>
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  <button onClick={() => { setSelectedTicket(t); setReply(""); }} style={{ padding: "6px 10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>💬 Reply</button>
                  {(t.status === "open" || t.status === "pending") && (
                    <button onClick={() => closeTicket(t.id)} style={{ padding: "6px 10px", background: "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>✕ Close</button>
                  )}
                </div>
                <div style={{ fontSize: "10px", color: "#666", marginTop: "6px" }}>{new Date(t.created_at).toLocaleString("en-PK")}</div>
              </div>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
            <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={{ padding: "6px 10px", background: page === 1 ? "#333" : "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: "11px" }}>← Prev</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} style={{ padding: "6px 10px", background: page === p ? "#2563eb" : "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: page === p ? "bold" : "normal" }}>{p}</button>
            ))}
            <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} style={{ padding: "6px 10px", background: page === totalPages ? "#333" : "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: page === totalPages ? "not-allowed" : "pointer", fontSize: "11px" }}>Next →</button>
          </div>
        )}
      </div>

      {selectedTicket && (
        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px", marginTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Ticket: {selectedTicket.subject}</h3>
            <button onClick={() => setSelectedTicket(null)} style={{ padding: "6px 12px", background: "#444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Close</button>
          </div>
          <div style={{ marginBottom: "16px" }}>
            <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>From: {getUserName(selectedTicket.user_id)}</div>
            <div style={{ fontSize: "13px", color: "#aaa", lineHeight: "1.6", padding: "12px", background: "#252525", borderRadius: "6px" }}>{selectedTicket.message}</div>
          </div>
          {selectedTicket.admin_reply && (
            <div style={{ marginBottom: "16px" }}>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Admin Reply:</div>
              <div style={{ fontSize: "13px", color: "#86efac", lineHeight: "1.6", padding: "12px", background: "#064e3b", borderRadius: "6px" }}>{selectedTicket.admin_reply}</div>
            </div>
          )}
          {(selectedTicket.status === "open" || selectedTicket.status === "pending") && (
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Your Reply</label>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply likhein..." rows={3} style={{ width: "100%", padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px", resize: "vertical", marginBottom: "12px" }} />
              <button onClick={() => replyToTicket(selectedTicket.id)} disabled={processing} style={{ padding: "10px 16px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", opacity: processing ? 0.6 : 1 }}>
                {processing ? "Sending..." : "Send Reply & Resolve"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


