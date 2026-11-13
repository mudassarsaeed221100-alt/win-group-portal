"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

/* ═══════ TYPES ═══════ */

type Profile = {
  id: string; username: string | null; first_name: string | null; surname: string | null;
  role: string; phone: string | null; phone_verified: boolean | null; team_code: string | null;
  referred_by: string | null; avatar_url: string | null; created_at: string;
};
type WorkTask = {
  id: string; title: string; description: string | null; reward_amount: number;
  status: string; deadline: string | null; created_by: string; created_at: string;
  deleted_at: string | null; target_roles: string[];
};
type Submission = {
  id: string; task_id: string; user_id: string; work_description: string;
  proof_url: string | null; status: "pending" | "approved" | "rejected";
  earning_amount: number; created_at: string;
};
type Earning = {
  id: string; submission_id: string; user_id: string; amount: number;
  payment_status: "unpaid" | "paid"; paid_by: string | null; paid_at: string | null; created_at: string;
};
type Notification = {
  id: string; title: string; message: string; notification_type: string;
  is_read: boolean; target_role: string | null; created_at: string;
};
type SupportTicket = {
  id: string; user_id: string; subject: string; message: string;
  status: string; priority: string; admin_reply: string | null;
  created_at: string; updated_at: string;
};

/* ═══════ MENU ═══════ */

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

/* ═══════ MAIN COMPONENT ═══════ */

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
      const [m, t, s, e, n, tk] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("work_tasks").select("*").is("deleted_at", null).order("created_at", { ascending: false }),
        supabase.from("work_submissions").select("*").order("created_at", { ascending: false }),
        supabase.from("earnings_ledger").select("*").order("created_at", { ascending: false }),
        supabase.from("notifications").select("*").order("created_at", { ascending: false }),
        supabase.from("support_tickets").select("*").order("created_at", { ascending: false }),
      ]);
      setMembers((m.data || []) as Profile[]);
      setTasks((t.data || []) as WorkTask[]);
      setSubmissions((s.data || []) as Submission[]);
      setEarnings((e.data || []) as Earning[]);
      setNotifications((n.data || []) as Notification[]);
      setTickets((tk.data || []) as SupportTicket[]);
    } catch (err: any) { showNotice(err.message || "Load failed", "error"); }
  }

  function showNotice(msg: string, type: "success" | "error" = "success") {
    setNotice(msg); setNoticeType(type); setTimeout(() => setNotice(""), 4000);
  }

  function getUserName(uid: string | null) {
    if (!uid) return "Unknown";
    const u = members.find((m) => m.id === uid);
    if (u) { const n = `${u.first_name || ""} ${u.surname || ""}`.trim(); return n || u.username || uid.slice(0, 8); }
    return uid.slice(0, 8);
  }

  function getTaskTitle(tid: string | null) {
    if (!tid) return "Unknown Task";
    return tasks.find((t) => t.id === tid)?.title || tid.slice(0, 8);
  }

  async function logout() { await supabase.auth.signOut(); router.replace("/"); }

  const stats = {
    totalMembers: members.length,
    staffCount: members.filter((m) => m.role === "staff").length,
    adminCount: members.filter((m) => m.role === "admin").length,
    activeTasks: tasks.filter((t) => t.status === "active").length,
    pendingSubmissions: submissions.filter((s) => s.status === "pending").length,
    totalEarnings: earnings.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    unpaidEarnings: earnings.filter((e) => e.payment_status === "unpaid").reduce((sum, e) => sum + Number(e.amount || 0), 0),
    unreadNotifs: notifications.filter((n) => !n.is_read).length,
    openTickets: tickets.filter((t) => t.status === "open" || t.status === "pending").length,
  };

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: "Arial" }}>
      Loading Super Admin Portal...
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "#0f0f0f", display: "flex", color: "#e9e9e9", fontFamily: "Arial, sans-serif" }}>
      {/* SIDEBAR */}
      <aside style={{ width: sidebarOpen ? "240px" : "0px", minWidth: sidebarOpen ? "240px" : "0px", background: "#1a1a1a", borderRight: sidebarOpen ? "1px solid #333" : "none", transition: "all 0.3s", overflow: "hidden", position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 100 }}>
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
              {item.key === "notifications" && stats.unreadNotifs > 0 && (
                <span style={{ marginLeft: "auto", background: "#ef4444", color: "#fff", borderRadius: "10px", padding: "2px 6px", fontSize: "10px", fontWeight: "bold" }}>{stats.unreadNotifs}</span>
              )}
            </button>
          ))}
          <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", background: "transparent", color: "#ef4444", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px", textAlign: "left", marginTop: "16px" }}>
            <span>🚪</span><span>Logout</span>
          </button>
        </nav>
      </aside>

      {sidebarOpen && <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }} />}

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

        {notice && <div style={{ margin: "12px 20px 0", padding: "12px 16px", background: noticeType === "success" ? "#064e3b" : "#7f1d1d", color: noticeType === "success" ? "#86efac" : "#fca5a5", borderRadius: "6px", fontSize: "12px" }}>{noticeType === "success" ? "✓" : "✕"} {notice}</div>}

        <div style={{ padding: "20px" }}>
          {activeModule === "overview" && <OverviewModule stats={stats} setActiveModule={setActiveModule} />}
          {activeModule === "team" && <TeamModule members={members} showNotice={showNotice} loadAllData={loadAllData} />}
          {activeModule === "create-staff" && <CreateStaffModule showNotice={showNotice} loadAllData={loadAllData} />}
          {activeModule === "tasks" && <TasksModule tasks={tasks} showNotice={showNotice} loadAllData={loadAllData} userId={userId} />}
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

/* ═══════ OVERVIEW ═══════ */

function OverviewModule({ stats, setActiveModule }: any) {
  const cards = [
    { label: "Total Members", value: stats.totalMembers, color: "#3b82f6", mod: "team" },
    { label: "Staff", value: stats.staffCount, color: "#06b6d4", mod: "team" },
    { label: "Active Tasks", value: stats.activeTasks, color: "#10b981", mod: "tasks" },
    { label: "Pending Reviews", value: stats.pendingSubmissions, color: "#f59e0b", mod: "submissions" },
    { label: "Total Earnings", value: `Rs. ${stats.totalEarnings.toLocaleString()}`, color: "#8b5cf6", mod: "earnings" },
    { label: "Unpaid", value: `Rs. ${stats.unpaidEarnings.toLocaleString()}`, color: "#ef4444", mod: "earnings" },
    { label: "Unread Notifs", value: stats.unreadNotifs, color: "#f59e0b", mod: "notifications" },
    { label: "Open Tickets", value: stats.openTickets, color: "#ef4444", mod: "support" },
  ];
  const quick = [
    { label: "👥 Manage Team", desc: "Staff members manage karein", mod: "team" },
    { label: "➕ Create Staff", desc: "Naya staff account", mod: "create-staff" },
    { label: "📋 Work Tasks", desc: "Tasks assign karein", mod: "tasks" },
    { label: "✅ Review Work", desc: "Submissions review", mod: "submissions" },
    { label: "💰 Earnings", desc: "Earnings track karein", mod: "earnings" },
    { label: "🆘 Support", desc: "Help tickets", mod: "support" },
  ];
  return (
    <div>
      <div style={{ marginBottom: "24px" }}>
        <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>OVERVIEW</div>
        <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Super Admin Dashboard</h2>
        <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "12px" }}>Team management aur work operations ka overview.</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "24px" }}>
        {cards.map((c) => (
          <div key={c.label} onClick={() => setActiveModule(c.mod)} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "16px", cursor: "pointer" }}>
            <div style={{ fontSize: "11px", color: "#888" }}>{c.label}</div>
            <div style={{ fontSize: "18px", fontWeight: "bold", color: c.color, marginTop: "8px" }}>{c.value}</div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
        {quick.map((q) => (
          <div key={q.label} onClick={() => setActiveModule(q.mod)} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "16px", cursor: "pointer" }}>
            <div style={{ fontSize: "14px", fontWeight: "bold", color: "#fff" }}>{q.label}</div>
            <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>{q.desc}</div>
            <div style={{ fontSize: "11px", color: "#2563eb", marginTop: "8px" }}>Open →</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════ TEAM MEMBERS ═══════ */

function TeamModule({ members, showNotice, loadAllData }: any) {
  const [search, setSearch] = useState(""); const [roleFilter, setRoleFilter] = useState("all");
  const [page, setPage] = useState(1); const [sel, setSel] = useState<Profile | null>(null);
  const pp = 10;
  const filtered = members.filter((m: Profile) => {
    const n = `${m.first_name || ""} ${m.surname || ""} ${m.username || ""}`.toLowerCase();
    return (!search || n.includes(search.toLowerCase())) && (roleFilter === "all" || m.role === roleFilter);
  });
  const tp = Math.ceil(filtered.length / pp);
  const pg = filtered.slice((page - 1) * pp, page * pp);
  function dn(m: Profile) { return `${m.first_name || ""} ${m.surname || ""}`.trim() || m.username || "Unnamed"; }
  function rn(r: string) { return r === "founder_owner" ? "Founder" : r === "super_admin" ? "Super Admin" : r === "admin" ? "Admin" : r === "staff" ? "Staff" : r; }
  async function updateRole(id: string, nr: string) {
    if (!window.confirm(`Role change to ${nr}?`)) return;
    const { error } = await supabase.from("profiles").update({ role: nr }).eq("id", id);
    if (error) showNotice(error.message, "error"); else { showNotice("Role updated.", "success"); await loadAllData(); }
  }
  const rs = { total: members.length, founder: members.filter((m: Profile) => m.role === "founder_owner").length, sa: members.filter((m: Profile) => m.role === "super_admin").length, admin: members.filter((m: Profile) => m.role === "admin").length, staff: members.filter((m: Profile) => m.role === "staff").length };
  return (
    <div>
      <div style={{ marginBottom: "20px" }}><div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>TEAM</div><h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Team Management</h2></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {[{ l: "Total", v: rs.total, c: "#3b82f6" }, { l: "Founders", v: rs.founder, c: "#8b5cf6" }, { l: "Super Admins", v: rs.sa, c: "#f59e0b" }, { l: "Admins", v: rs.admin, c: "#10b981" }, { l: "Staff", v: rs.staff, c: "#06b6d4" }].map((s) => (
          <div key={s.l} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "12px" }}>
            <div style={{ fontSize: "11px", color: "#888" }}>{s.l}</div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: s.c, marginTop: "4px" }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <input placeholder="Search..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} />
          <select value={roleFilter} onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }}>
            <option value="all">All Roles</option><option value="founder_owner">Founder</option><option value="super_admin">Super Admin</option><option value="admin">Admin</option><option value="staff">Staff</option>
          </select>
        </div>
        {pg.length === 0 ? <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>No members found.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead><tr style={{ borderBottom: "1px solid #333", background: "#252525" }}>
                {["Member", "Role", "Phone", "Joined", "Actions"].map((h) => <th key={h} style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>{h}</th>)}
              </tr></thead>
              <tbody>{pg.map((m: Profile) => (
                <tr key={m.id} style={{ borderBottom: "1px solid #333" }}>
                  <td style={{ padding: "12px" }}><div style={{ color: "#fff", fontWeight: "bold" }}>{dn(m)}</div><div style={{ fontSize: "11px", color: "#888" }}>@{m.username || "N/A"}</div></td>
                  <td style={{ padding: "12px" }}><span style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", background: m.role === "founder_owner" ? "#8b5cf620" : m.role === "super_admin" ? "#f59e0b20" : m.role === "admin" ? "#10b98120" : "#06b6d420", color: m.role === "founder_owner" ? "#d8b4fe" : m.role === "super_admin" ? "#fbbf24" : m.role === "admin" ? "#86efac" : "#67e8f9" }}>{rn(m.role)}</span></td>
                  <td style={{ padding: "12px", color: "#aaa" }}>{m.phone || "N/A"}</td>
                  <td style={{ padding: "12px", color: "#aaa", fontSize: "11px" }}>{new Date(m.created_at).toLocaleDateString("en-PK")}</td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <button onClick={() => setSel(m)} style={{ padding: "6px 10px", background: "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}>👁️ View</button>
                      {m.role === "staff" && <button onClick={() => updateRole(m.id, "admin")} style={{ padding: "6px 10px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}>⬆️ Promote</button>}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {tp > 1 && <Pager page={page} total={tp} setPage={setPage} />}
      </div>
      {sel && (
        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px", marginTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Member Details</h3>
            <button onClick={() => setSel(null)} style={{ padding: "6px 12px", background: "#444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Close</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px" }}>
            {[{ l: "Name", v: dn(sel) }, { l: "Username", v: sel.username || "N/A" }, { l: "Role", v: rn(sel.role) }, { l: "Phone", v: sel.phone || "N/A" }, { l: "Team Code", v: sel.team_code || "N/A" }, { l: "Joined", v: new Date(sel.created_at).toLocaleString("en-PK") }].map((i) => (
              <div key={i.l}><div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>{i.l}</div><div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>{i.v}</div></div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════ CREATE STAFF ═══════ */

function CreateStaffModule({ showNotice, loadAllData }: any) {
  const [username, setUsername] = useState(""); const [email, setEmail] = useState("");
  const [password, setPassword] = useState(""); const [creating, setCreating] = useState(false);
  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !email.trim() || !password.trim()) { showNotice("Fill all fields.", "error"); return; }
    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { showNotice("Session expired.", "error"); return; }
      const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ username: username.trim(), email: email.trim(), password: password.trim(), role: "staff" }) });
      const result = await res.json();
      if (!res.ok) { showNotice(result.error || "Failed.", "error"); return; }
      showNotice("Staff created!", "success"); setUsername(""); setEmail(""); setPassword(""); await loadAllData();
    } catch (err: any) { showNotice(err.message, "error"); }
    setCreating(false);
  }
  return (
    <div>
      <div style={{ marginBottom: "20px" }}><div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>CREATE STAFF</div><h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Create New Staff Account</h2></div>
      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px", maxWidth: "500px" }}>
        <form onSubmit={create} style={{ display: "grid", gap: "16px" }}>
          {[{ l: "Username", v: username, s: setUsername, t: "text", p: "Enter username" }, { l: "Email", v: email, s: setEmail, t: "email", p: "Enter email" }, { l: "Password", v: password, s: setPassword, t: "password", p: "Min 8 characters" }].map((f) => (
            <div key={f.l}><label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>{f.l} *</label><input type={f.t} value={f.v} onChange={(e) => f.s(e.target.value)} placeholder={f.p} required style={{ width: "100%", padding: "10px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} /></div>
          ))}
          <div><label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Role</label><input value="Staff" disabled style={{ width: "100%", padding: "10px 12px", background: "#1a1a1a", border: "1px solid #444", borderRadius: "6px", color: "#888", fontSize: "12px" }} /></div>
          <button type="submit" disabled={creating} style={{ padding: "12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", opacity: creating ? 0.6 : 1 }}>{creating ? "Creating..." : "Create Staff Account"}</button>
        </form>
      </div>
    </div>
  );
}

/* ═══════ SHARED PAGER ═══════ */

function Pager({ page, total, setPage }: { page: number; total: number; setPage: (p: number) => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
      <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} style={{ padding: "6px 10px", background: page === 1 ? "#333" : "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: page === 1 ? "not-allowed" : "pointer", fontSize: "11px" }}>← Prev</button>
      {Array.from({ length: total }, (_, i) => i + 1).map((p) => (
        <button key={p} onClick={() => setPage(p)} style={{ padding: "6px 10px", background: page === p ? "#2563eb" : "#333", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: page === p ? "bold" : "normal" }}>{p}</button>
      ))}
      <button onClick={() => setPage(Math.min(total, page + 1))} disabled={page === total} style={{ padding: "6px 10px", background: page === total ? "#333" : "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: page === total ? "not-allowed" : "pointer", fontSize: "11px" }}>Next →</button>
    </div>
  );
}

/* ═══════ WORK TASKS ═══════ */

function TasksModule({ tasks, showNotice, loadAllData, userId }: any) {
  const [search, setSearch] = useState(""); const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1); const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState(""); const [description, setDescription] = useState("");
  const [reward, setReward] = useState(""); const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const pp = 10;
  const filtered = tasks.filter((t: WorkTask) => (!search || t.title.toLowerCase().includes(search.toLowerCase())) && (statusFilter === "all" || t.status === statusFilter));
  const tp = Math.ceil(filtered.length / pp);
  const pg = filtered.slice((page - 1) * pp, page * pp);

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

  async function toggleStatus(id: string, cur: string) {
    const ns = cur === "active" ? "inactive" : "active";
    const { error } = await supabase.from("work_tasks").update({ status: ns }).eq("id", id);
    if (error) showNotice(error.message, "error"); else { showNotice(`Task ${ns}.`, "success"); await loadAllData(); }
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <input placeholder="Search tasks..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }}><option value="all">All</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
        </div>
        {pg.length === 0 ? <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>No tasks found.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead><tr style={{ borderBottom: "1px solid #333", background: "#252525" }}>
                {["Task", "Reward", "Status", "Created", "Actions"].map((h) => <th key={h} style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>{h}</th>)}
              </tr></thead>
              <tbody>{pg.map((t: WorkTask) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #333" }}>
                  <td style={{ padding: "12px" }}><div style={{ color: "#fff", fontWeight: "bold" }}>{t.title}</div><div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>{t.description?.slice(0, 50) || "No description"}</div></td>
                  <td style={{ padding: "12px", color: "#10b981", fontWeight: "bold" }}>Rs. {Number(t.reward_amount).toLocaleString()}</td>
                  <td style={{ padding: "12px" }}><span style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", background: t.status === "active" ? "#10b98120" : "#ef444420", color: t.status === "active" ? "#86efac" : "#f87171" }}>{t.status.toUpperCase()}</span></td>
                  <td style={{ padding: "12px", color: "#aaa", fontSize: "11px" }}>{new Date(t.created_at).toLocaleDateString("en-PK")}</td>
                  <td style={{ padding: "12px" }}><button onClick={() => toggleStatus(t.id, t.status)} style={{ padding: "6px 10px", background: t.status === "active" ? "#f59e0b" : "#10b981", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>{t.status === "active" ? "⏸ Pause" : "▶ Activate"}</button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {tp > 1 && <Pager page={page} total={tp} setPage={setPage} />}
      </div>
    </div>
  );
}

/* ═══════ SUBMISSIONS ═══════ */

function SubmissionsModule({ submissions, getUserName, getTaskTitle, showNotice, loadAllData, tasks }: any) {
  const [statusFilter, setStatusFilter] = useState("all"); const [search, setSearch] = useState("");
  const [page, setPage] = useState(1); const [sel, setSel] = useState<Submission | null>(null);
  const [amt, setAmt] = useState(""); const [processing, setProcessing] = useState(false);
  const pp = 10;
  const filtered = submissions.filter((s: Submission) => (statusFilter === "all" || s.status === statusFilter) && (!search || getUserName(s.user_id).toLowerCase().includes(search.toLowerCase())));
  const tp = Math.ceil(filtered.length / pp);
  const pg = filtered.slice((page - 1) * pp, page * pp);

  async function approve(id: string, amount: number) {
    if (amount <= 0) { showNotice("Amount 0 se zyada hona chahiye.", "error"); return; }
    if (!window.confirm(`Rs. ${amount} approve?`)) return;
    setProcessing(true);
    const { error } = await supabase.from("work_submissions").update({ status: "approved", earning_amount: amount }).eq("id", id);
    if (error) showNotice(error.message, "error"); else { showNotice("Approved.", "success"); setSel(null); setAmt(""); await loadAllData(); }
    setProcessing(false);
  }

  async function reject(id: string) {
    if (!window.confirm("Reject?")) return;
    setProcessing(true);
    const { error } = await supabase.from("work_submissions").update({ status: "rejected", earning_amount: 0 }).eq("id", id);
    if (error) showNotice(error.message, "error"); else { showNotice("Rejected.", "success"); setSel(null); await loadAllData(); }
    setProcessing(false);
  }

  async function viewProof(url: string | null) {
    if (!url) { showNotice("No proof attached.", "error"); return; }
    try {
      const { data, error } = await supabase.storage.from("work-proofs").createSignedUrl(url, 300);
      if (error || !data?.signedUrl) { showNotice("Proof load failed.", "error"); return; }
      window.open(data.signedUrl, "_blank");
    } catch { showNotice("Error opening proof.", "error"); }
  }

  const ss = { total: submissions.length, pending: submissions.filter((s: Submission) => s.status === "pending").length, approved: submissions.filter((s: Submission) => s.status === "approved").length, rejected: submissions.filter((s: Submission) => s.status === "rejected").length };

  return (
    <div>
      <div style={{ marginBottom: "20px" }}><div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>SUBMISSIONS</div><h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Submissions Review</h2></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {[{ l: "Total", v: ss.total, c: "#3b82f6" }, { l: "Pending", v: ss.pending, c: "#f59e0b" }, { l: "Approved", v: ss.approved, c: "#10b981" }, { l: "Rejected", v: ss.rejected, c: "#ef4444" }].map((s) => (
          <div key={s.l} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "12px" }}>
            <div style={{ fontSize: "11px", color: "#888" }}>{s.l}</div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: s.c, marginTop: "4px" }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <input placeholder="Search by user..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }}><option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select>
        </div>
        {pg.length === 0 ? <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>No submissions found.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead><tr style={{ borderBottom: "1px solid #333", background: "#252525" }}>
                {["User", "Task", "Status", "Earning", "Date", "Actions"].map((h) => <th key={h} style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>{h}</th>)}
              </tr></thead>
              <tbody>{pg.map((s: Submission) => (
                <tr key={s.id} style={{ borderBottom: "1px solid #333" }}>
                  <td style={{ padding: "12px", color: "#fff", fontWeight: "bold" }}>{getUserName(s.user_id)}</td>
                  <td style={{ padding: "12px", color: "#aaa" }}>{getTaskTitle(s.task_id)}</td>
                  <td style={{ padding: "12px" }}><span style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", background: s.status === "pending" ? "#f59e0b20" : s.status === "approved" ? "#10b98120" : "#ef444420", color: s.status === "pending" ? "#fbbf24" : s.status === "approved" ? "#86efac" : "#f87171" }}>{s.status.toUpperCase()}</span></td>
                  <td style={{ padding: "12px", color: "#fff", fontWeight: "bold" }}>Rs. {Number(s.earning_amount).toLocaleString()}</td>
                  <td style={{ padding: "12px", color: "#aaa", fontSize: "11px" }}>{new Date(s.created_at).toLocaleDateString("en-PK")}</td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      {s.proof_url && <button onClick={() => viewProof(s.proof_url)} style={{ padding: "6px 10px", background: "#6366f1", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}>📎 Proof</button>}
                      {s.status === "pending" && (
                        <>
                          <button onClick={() => { setSel(s); setAmt(String(tasks.find((t: WorkTask) => t.id === s.task_id)?.reward_amount || 0)); }} style={{ padding: "6px 10px", background: "#10b981", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}>✓ Approve</button>
                          <button onClick={() => reject(s.id)} disabled={processing} style={{ padding: "6px 10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}>✕ Reject</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {tp > 1 && <Pager page={page} total={tp} setPage={setPage} />}
      </div>
      {sel && sel.status === "pending" && (
        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px", marginTop: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "16px", color: "#fff" }}>Approve Submission</h3>
          <div style={{ marginBottom: "12px" }}><div style={{ fontSize: "11px", color: "#888" }}>User: <span style={{ color: "#fff" }}>{getUserName(sel.user_id)}</span></div><div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>Task: <span style={{ color: "#fff" }}>{getTaskTitle(sel.task_id)}</span></div></div>
          <div style={{ display: "flex", gap: "12px", alignItems: "end", flexWrap: "wrap" }}>
            <div><label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Amount (Rs.)</label><input type="number" value={amt} onChange={(e) => setAmt(e.target.value)} min="1" style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px", width: "150px" }} /></div>
            <button onClick={() => approve(sel.id, Number(amt))} disabled={processing} style={{ padding: "10px 20px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", opacity: processing ? 0.6 : 1 }}>{processing ? "Processing..." : "✓ Confirm Approve"}</button>
            <button onClick={() => setSel(null)} style={{ padding: "10px 20px", background: "#444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════ EARNINGS ═══════ */

function EarningsModule({ earnings, getUserName, showNotice, loadAllData }: any) {
  const [statusFilter, setStatusFilter] = useState("all"); const [search, setSearch] = useState("");
  const [page, setPage] = useState(1); const [processing, setProcessing] = useState(false);
  const pp = 10;
  const filtered = earnings.filter((e: Earning) => (statusFilter === "all" || e.payment_status === statusFilter) && (!search || getUserName(e.user_id).toLowerCase().includes(search.toLowerCase())));
  const tp = Math.ceil(filtered.length / pp);
  const pg = filtered.slice((page - 1) * pp, page * pp);

  const totalEarnings = earnings.reduce((s: number, e: Earning) => s + Number(e.amount || 0), 0);
  const paidTotal = earnings.filter((e: Earning) => e.payment_status === "paid").reduce((s: number, e: Earning) => s + Number(e.amount || 0), 0);
  const unpaidTotal = earnings.filter((e: Earning) => e.payment_status === "unpaid").reduce((s: number, e: Earning) => s + Number(e.amount || 0), 0);

  async function markPaid(id: string) {
    if (!window.confirm("Mark as paid?")) return;
    setProcessing(true);
    const { error } = await supabase.from("earnings_ledger").update({ payment_status: "paid", paid_at: new Date().toISOString() }).eq("id", id);
    if (error) showNotice(error.message, "error"); else { showNotice("Marked paid.", "success"); await loadAllData(); }
    setProcessing(false);
  }

  return (
    <div>
      <div style={{ marginBottom: "20px" }}><div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>EARNINGS</div><h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Earnings Ledger</h2></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {[{ l: "Total Earnings", v: `Rs. ${totalEarnings.toLocaleString()}`, c: "#3b82f6" }, { l: "Paid", v: `Rs. ${paidTotal.toLocaleString()}`, c: "#10b981" }, { l: "Unpaid", v: `Rs. ${unpaidTotal.toLocaleString()}`, c: "#ef4444" }, { l: "Records", v: earnings.length, c: "#8b5cf6" }].map((s) => (
          <div key={s.l} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "12px" }}>
            <div style={{ fontSize: "11px", color: "#888" }}>{s.l}</div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: s.c, marginTop: "4px" }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <input placeholder="Search by user..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }}><option value="all">All</option><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select>
        </div>
        {pg.length === 0 ? <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>No earnings found.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead><tr style={{ borderBottom: "1px solid #333", background: "#252525" }}>
                {["User", "Amount", "Status", "Date", "Actions"].map((h) => <th key={h} style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>{h}</th>)}
              </tr></thead>
              <tbody>{pg.map((e: Earning) => (
                <tr key={e.id} style={{ borderBottom: "1px solid #333" }}>
                  <td style={{ padding: "12px", color: "#fff", fontWeight: "bold" }}>{getUserName(e.user_id)}</td>
                  <td style={{ padding: "12px", color: "#10b981", fontWeight: "bold" }}>Rs. {Number(e.amount).toLocaleString()}</td>
                  <td style={{ padding: "12px" }}><span style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", background: e.payment_status === "paid" ? "#10b98120" : "#ef444420", color: e.payment_status === "paid" ? "#86efac" : "#f87171" }}>{e.payment_status.toUpperCase()}</span></td>
                  <td style={{ padding: "12px", color: "#aaa", fontSize: "11px" }}>{new Date(e.created_at).toLocaleDateString("en-PK")}</td>
                  <td style={{ padding: "12px" }}>{e.payment_status === "unpaid" && <button onClick={() => markPaid(e.id)} disabled={processing} style={{ padding: "6px 10px", background: "#10b981", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px", fontWeight: "bold" }}>💵 Mark Paid</button>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {tp > 1 && <Pager page={page} total={tp} setPage={setPage} />}
      </div>
    </div>
  );
}


/* ═══════ NOTIFICATIONS ═══════ */

function NotificationsModule({ notifications, showNotice, loadAllData }: any) {
  const [search, setSearch] = useState(""); const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1); const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState(""); const [message, setMessage] = useState("");
  const [nType, setNType] = useState("general"); const [targetRole, setTargetRole] = useState("all");
  const [saving, setSaving] = useState(false);
  const pp = 10;
  const filtered = notifications.filter((n: Notification) => (!search || n.title.toLowerCase().includes(search.toLowerCase()) || n.message.toLowerCase().includes(search.toLowerCase())) && (typeFilter === "all" || n.notification_type === typeFilter));
  const tp = Math.ceil(filtered.length / pp);
  const pg = filtered.slice((page - 1) * pp, page * pp);

  async function createNotification(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !message.trim()) { showNotice("Title aur message fill karein.", "error"); return; }
    setSaving(true);
    try {
      const { error } = await supabase.from("notifications").insert({ title: title.trim(), message: message.trim(), notification_type: nType, target_role: targetRole === "all" ? null : targetRole, is_read: false });
      if (error) throw error;
      showNotice("Notification sent!", "success"); setTitle(""); setMessage(""); setNType("general"); setTargetRole("all"); setShowForm(false); await loadAllData();
    } catch (err: any) { showNotice(err.message, "error"); }
    setSaving(false);
  }

  async function markRead(id: string) {
    const { error } = await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    if (error) showNotice(error.message, "error"); else { showNotice("Marked read.", "success"); await loadAllData(); }
  }

  async function markAllRead() {
    const unread = notifications.filter((n: Notification) => !n.is_read).map((n: Notification) => n.id);
    if (unread.length === 0) { showNotice("Sab already read hain.", "error"); return; }
    const { error } = await supabase.from("notifications").update({ is_read: true }).in("id", unread);
    if (error) showNotice(error.message, "error"); else { showNotice("All marked read.", "success"); await loadAllData(); }
  }

  async function deleteNotification(id: string) {
    if (!window.confirm("Delete?")) return;
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) showNotice(error.message, "error"); else { showNotice("Deleted.", "success"); await loadAllData(); }
  }

  const unreadCount = notifications.filter((n: Notification) => !n.is_read).length;

  return (
    <div>
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: "12px" }}>
        <div><div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>NOTIFICATIONS</div><h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Notifications ({unreadCount} unread)</h2></div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={markAllRead} style={{ padding: "8px 14px", background: "#444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "11px" }}>✓ Mark All Read</button>
          <button onClick={() => setShowForm(!showForm)} style={{ padding: "8px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "11px" }}>{showForm ? "Cancel" : "➕ New Notification"}</button>
        </div>
      </div>
      {showForm && (
        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px", marginBottom: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "16px", color: "#fff" }}>Send Notification</h3>
          <form onSubmit={createNotification} style={{ display: "grid", gap: "12px" }}>
            <div><label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Title *</label><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" required style={{ width: "100%", padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} /></div>
            <div><label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Message *</label><textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Notification message" rows={3} required style={{ width: "100%", padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px", resize: "vertical" }} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div><label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Type</label><select value={nType} onChange={(e) => setNType(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }}><option value="general">General</option><option value="alert">Alert</option><option value="update">Update</option><option value="task">Task</option></select></div>
              <div><label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Target Role</label><select value={targetRole} onChange={(e) => setTargetRole(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }}><option value="all">All Users</option><option value="staff">Staff Only</option><option value="admin">Admin Only</option></select></div>
            </div>
            <button type="submit" disabled={saving} style={{ padding: "10px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", opacity: saving ? 0.6 : 1 }}>{saving ? "Sending..." : "Send Notification"}</button>
          </form>
        </div>
      )}
      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <input placeholder="Search notifications..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} />
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }}><option value="all">All Types</option><option value="general">General</option><option value="alert">Alert</option><option value="update">Update</option><option value="task">Task</option></select>
        </div>
        {pg.length === 0 ? <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>No notifications.</div> : (
          <div style={{ display: "grid", gap: "8px" }}>
            {pg.map((n: Notification) => (
              <div key={n.id} style={{ padding: "14px", background: n.is_read ? "#1f1f1f" : "#1a2332", border: `1px solid ${n.is_read ? "#333" : "#2563eb44"}`, borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "start", gap: "12px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                    {!n.is_read && <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#2563eb", flexShrink: 0 }} />}
                    <span style={{ fontSize: "13px", fontWeight: "bold", color: "#fff" }}>{n.title}</span>
                    <span style={{ padding: "2px 8px", borderRadius: "4px", fontSize: "10px", background: n.notification_type === "alert" ? "#ef444420" : n.notification_type === "update" ? "#3b82f620" : n.notification_type === "task" ? "#f59e0b20" : "#33333380", color: n.notification_type === "alert" ? "#f87171" : n.notification_type === "update" ? "#60a5fa" : n.notification_type === "task" ? "#fbbf24" : "#aaa" }}>{n.notification_type}</span>
                  </div>
                  <div style={{ fontSize: "12px", color: "#aaa", lineHeight: "1.5" }}>{n.message}</div>
                  <div style={{ fontSize: "10px", color: "#666", marginTop: "6px" }}>{new Date(n.created_at).toLocaleString("en-PK")} {n.target_role && `• ${n.target_role}`}</div>
                </div>
                <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
                  {!n.is_read && <button onClick={() => markRead(n.id)} style={{ padding: "5px 8px", background: "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "10px" }}>✓ Read</button>}
                  <button onClick={() => deleteNotification(n.id)} style={{ padding: "5px 8px", background: "#7f1d1d", color: "#fca5a5", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "10px" }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
        {tp > 1 && <Pager page={page} total={tp} setPage={setPage} />}
      </div>
    </div>
  );
}

/* ═══════ PROFILE ═══════ */

function ProfileModule({ myProfile, showNotice, loadAllData }: any) {
  const [firstName, setFirstName] = useState(myProfile?.first_name || "");
  const [surname, setSurname] = useState(myProfile?.surname || "");
  const [phone, setPhone] = useState(myProfile?.phone || "");
  const [saving, setSaving] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ first_name: firstName.trim() || null, surname: surname.trim() || null, phone: phone.trim() || null }).eq("id", myProfile.id);
    if (error) showNotice(error.message, "error"); else { showNotice("Profile updated!", "success"); await loadAllData(); }
    setSaving(false);
  }

  function getRoleName(r: string) { return r === "founder_owner" ? "Founder / Owner" : r === "super_admin" ? "Super Admin" : r === "admin" ? "Admin" : r === "staff" ? "Staff" : r; }

  return (
    <div>
      <div style={{ marginBottom: "20px" }}><div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>PROFILE</div><h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>My Profile</h2></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "16px", color: "#fff" }}>Profile Info</h3>
          <div style={{ display: "grid", gap: "12px" }}>
            {[{ l: "Username", v: myProfile?.username || "N/A" }, { l: "Role", v: getRoleName(myProfile?.role || "") }, { l: "Team Code", v: myProfile?.team_code || "N/A" }, { l: "Joined", v: myProfile?.created_at ? new Date(myProfile.created_at).toLocaleString("en-PK") : "N/A" }].map((i) => (
              <div key={i.l}><div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>{i.l}</div><div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold", padding: "8px 12px", background: "#252525", borderRadius: "6px" }}>{i.v}</div></div>
            ))}
          </div>
        </div>
        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
          <h3 style={{ margin: "0 0 16px", fontSize: "16px", color: "#fff" }}>Edit Profile</h3>
          <form onSubmit={saveProfile} style={{ display: "grid", gap: "12px" }}>
            <div><label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>First Name</label><input value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" style={{ width: "100%", padding: "10px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} /></div>
            <div><label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Surname</label><input value={surname} onChange={(e) => setSurname(e.target.value)} placeholder="Surname" style={{ width: "100%", padding: "10px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} /></div>
            <div><label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Phone</label><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone number" style={{ width: "100%", padding: "10px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} /></div>
            <button type="submit" disabled={saving} style={{ padding: "12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", opacity: saving ? 0.6 : 1 }}>{saving ? "Saving..." : "Save Changes"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}

/* ═══════ SUPPORT ═══════ */

function SupportModule({ tickets, getUserName, showNotice, loadAllData }: any) {
  const [statusFilter, setStatusFilter] = useState("all"); const [search, setSearch] = useState("");
  const [page, setPage] = useState(1); const [sel, setSel] = useState<SupportTicket | null>(null);
  const [reply, setReply] = useState(""); const [processing, setProcessing] = useState(false);
  const pp = 10;
  const filtered = tickets.filter((t: SupportTicket) => (statusFilter === "all" || t.status === statusFilter) && (!search || t.subject.toLowerCase().includes(search.toLowerCase()) || getUserName(t.user_id).toLowerCase().includes(search.toLowerCase())));
  const tp = Math.ceil(filtered.length / pp);
  const pg = filtered.slice((page - 1) * pp, page * pp);

  async function sendReply(id: string) {
    if (!reply.trim()) { showNotice("Reply likhein.", "error"); return; }
    setProcessing(true);
    const { error } = await supabase.from("support_tickets").update({ admin_reply: reply.trim(), status: "resolved", updated_at: new Date().toISOString() }).eq("id", id);
    if (error) showNotice(error.message, "error"); else { showNotice("Reply sent.", "success"); setSel(null); setReply(""); await loadAllData(); }
    setProcessing(false);
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase.from("support_tickets").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) showNotice(error.message, "error"); else { showNotice(`Status: ${status}`, "success"); await loadAllData(); }
  }

  const ts = { total: tickets.length, open: tickets.filter((t: SupportTicket) => t.status === "open" || t.status === "pending").length, resolved: tickets.filter((t: SupportTicket) => t.status === "resolved").length, closed: tickets.filter((t: SupportTicket) => t.status === "closed").length };

  return (
    <div>
      <div style={{ marginBottom: "20px" }}><div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>SUPPORT</div><h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Support Tickets</h2></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: "12px", marginBottom: "20px" }}>
        {[{ l: "Total", v: ts.total, c: "#3b82f6" }, { l: "Open", v: ts.open, c: "#f59e0b" }, { l: "Resolved", v: ts.resolved, c: "#10b981" }, { l: "Closed", v: ts.closed, c: "#888" }].map((s) => (
          <div key={s.l} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "12px" }}>
            <div style={{ fontSize: "11px", color: "#888" }}>{s.l}</div>
            <div style={{ fontSize: "16px", fontWeight: "bold", color: s.c, marginTop: "4px" }}>{s.v}</div>
          </div>
        ))}
      </div>
      <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <input placeholder="Search tickets..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }} />
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px" }}><option value="all">All</option><option value="open">Open</option><option value="pending">Pending</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select>
        </div>
        {pg.length === 0 ? <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>No tickets found.</div> : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead><tr style={{ borderBottom: "1px solid #333", background: "#252525" }}>
                {["User", "Subject", "Priority", "Status", "Date", "Actions"].map((h) => <th key={h} style={{ padding: "12px", textAlign: "left", color: "#aaa" }}>{h}</th>)}
              </tr></thead>
              <tbody>{pg.map((t: SupportTicket) => (
                <tr key={t.id} style={{ borderBottom: "1px solid #333" }}>
                  <td style={{ padding: "12px", color: "#fff", fontWeight: "bold" }}>{getUserName(t.user_id)}</td>
                  <td style={{ padding: "12px", color: "#aaa" }}>{t.subject}</td>
                  <td style={{ padding: "12px" }}><span style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", background: t.priority === "high" ? "#ef444420" : t.priority === "medium" ? "#f59e0b20" : "#33333380", color: t.priority === "high" ? "#f87171" : t.priority === "medium" ? "#fbbf24" : "#aaa" }}>{(t.priority || "normal").toUpperCase()}</span></td>
                  <td style={{ padding: "12px" }}><span style={{ padding: "4px 10px", borderRadius: "4px", fontSize: "11px", fontWeight: "bold", background: t.status === "open" || t.status === "pending" ? "#f59e0b20" : t.status === "resolved" ? "#10b98120" : "#33333380", color: t.status === "open" || t.status === "pending" ? "#fbbf24" : t.status === "resolved" ? "#86efac" : "#aaa" }}>{t.status.toUpperCase()}</span></td>
                  <td style={{ padding: "12px", color: "#aaa", fontSize: "11px" }}>{new Date(t.created_at).toLocaleDateString("en-PK")}</td>
                  <td style={{ padding: "12px" }}>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <button onClick={() => { setSel(t); setReply(t.admin_reply || ""); }} style={{ padding: "6px 10px", background: "#444", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}>👁️ View</button>
                      {(t.status === "open" || t.status === "pending") && <button onClick={() => updateStatus(t.id, "closed")} style={{ padding: "6px 10px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "11px" }}>Close</button>}
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {tp > 1 && <Pager page={page} total={tp} setPage={setPage} />}
      </div>
      {sel && (
        <div style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: "8px", padding: "20px", marginTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Ticket Details</h3>
            <button onClick={() => setSel(null)} style={{ padding: "6px 12px", background: "#444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Close</button>
          </div>
          <div style={{ display: "grid", gap: "12px", marginBottom: "16px" }}>
            <div><div style={{ fontSize: "11px", color: "#888" }}>From</div><div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>{getUserName(sel.user_id)}</div></div>
            <div><div style={{ fontSize: "11px", color: "#888" }}>Subject</div><div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>{sel.subject}</div></div>
            <div><div style={{ fontSize: "11px", color: "#888" }}>Message</div><div style={{ fontSize: "12px", color: "#ccc", background: "#252525", padding: "12px", borderRadius: "6px", lineHeight: "1.6" }}>{sel.message}</div></div>
            {sel.admin_reply && <div><div style={{ fontSize: "11px", color: "#888" }}>Previous Reply</div><div style={{ fontSize: "12px", color: "#86efac", background: "#064e3b", padding: "12px", borderRadius: "6px", lineHeight: "1.6" }}>{sel.admin_reply}</div></div>}
          </div>
          {(sel.status === "open" || sel.status === "pending") && (
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>Reply</label>
              <textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply..." rows={3} style={{ width: "100%", padding: "10px 12px", background: "#252525", border: "1px solid #444", borderRadius: "6px", color: "#fff", fontSize: "12px", resize: "vertical", marginBottom: "12px" }} />
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={() => sendReply(sel.id)} disabled={processing} style={{ padding: "10px 20px", background: "#10b981", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "12px", opacity: processing ? 0.6 : 1 }}>{processing ? "Sending..." : "Send Reply & Resolve"}</button>
                <button onClick={() => updateStatus(sel.id, "closed")} style={{ padding: "10px 20px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}>Close Ticket</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

