
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import TaskManagement from "./TaskManagement";

type Section =
  | "Overview"
  | "Staff Management"
  | "Task Management"
  | "Departments"
  | "Business Records"
  | "Reports"
  | "Settings";

type Staff = {
  id: string;
  username: string;
  role: string;
  created_at: string;
};

export default function AdminDashboard() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<Section>("Overview");

  const [staff, setStaff] = useState<Staff[]>([]);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffError, setStaffError] = useState("");

  const [staffUsername, setStaffUsername] = useState("");
  const [staffEmail, setStaffEmail] = useState("");
  const [staffPassword, setStaffPassword] = useState("");
  const [message, setMessage] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function checkUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("username, role")
        .eq("id", user.id)
        .single();

      if (error || !data || data.role !== "admin") {
        router.replace("/");
        return;
      }

      setUsername(data.username);
      setLoading(false);
    }

    checkUser();
  }, [router]);

  async function loadStaff() {
    setStaffLoading(true);
    setStaffError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setStaffError("Please login again.");
        return;
      }

      const response = await fetch("/api/admin/users", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        setStaffError(result.error || "Unable to load Staff.");
        return;
      }

      setStaff(result.staff || []);
    } catch {
      setStaffError("Something went wrong while loading Staff.");
    } finally {
      setStaffLoading(false);
    }
  }

  async function createStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");
    setCreating(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setMessage("Please login again.");
        return;
      }

      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          username: staffUsername,
          email: staffEmail,
          password: staffPassword,
          role: "staff",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Account creation failed.");
        return;
      }

      setMessage("Staff account created successfully!");
      setStaffUsername("");
      setStaffEmail("");
      setStaffPassword("");

      await loadStaff();
    } catch {
      setMessage("Something went wrong. Please try again.");
    } finally {
      setCreating(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  const menuItems: { name: Section; icon: string }[] = [
    { name: "Overview", icon: "◫" },
    { name: "Staff Management", icon: "♙" },
    { name: "Task Management", icon: "✓" },
    { name: "Departments", icon: "▦" },
    { name: "Business Records", icon: "▤" },
    { name: "Reports", icon: "▥" },
    { name: "Settings", icon: "⚙" },
  ];

  function openSection(section: Section) {
    setActiveSection(section);
    setMessage("");

    if (section === "Staff Management") {
      loadStaff();
    }
  }

  if (loading) {
    return <main className="loading">Preparing your workspace...</main>;
  }

  return (
    <main className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">W</div>
          <div>
            <h2>WIN GROUP</h2>
            <span>ADMIN PORTAL</span>
          </div>
        </div>

        <div className="menu-label">WORKSPACE</div>

        <nav className="navigation">
          {menuItems.map((item) => (
            <button
              key={item.name}
              className={activeSection === item.name ? "nav-item active" : "nav-item"}
              onClick={() => openSection(item.name)}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.name}
              {activeSection === item.name && <span className="active-dot" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="support-card">
            <strong>Need assistance?</strong>
            <p>Contact your system administrator.</p>
          </div>
          <button className="logout-button" onClick={logout}>
            ↪ Sign Out
          </button>
        </div>
      </aside>

      <section className="main-area">
        <header className="topbar">
          <div>
            <div className="breadcrumb">WIN GROUP / ADMIN</div>
            <h2>{activeSection}</h2>
          </div>

          <div className="top-user">
            <div className="status-dot" />
            <div className="user-avatar">
              {username.charAt(0).toUpperCase()}
            </div>
            <div className="user-details">
              <strong>{username}</strong>
              <span>Administrator</span>
            </div>
          </div>
        </header>

        <div className="content">
          {activeSection === "Overview" && (
            <>
              <div className="welcome">
                <div>
                  <span className="eyebrow">ADMINISTRATOR WORKSPACE</span>
                  <h1>Welcome back, {username}.</h1>
                  <p>
                    Manage your team and access your WIN GROUP workspace
                    from one place.
                  </p>
                </div>
                <div className="welcome-mark">WIN</div>
              </div>

              <div className="section-heading">
                <div>
                  <h3>Workspace Overview</h3>
                  <p>Your administrative control center</p>
                </div>
                <span className="live-status">● Account Active</span>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <span>TEAM MEMBERS</span>
                  <h2>{staff.length}</h2>
                  <p>Staff accounts currently registered</p>
                  <button onClick={() => openSection("Staff Management")}>
                    Manage Staff →
                  </button>
                </div>

                <div className="stat-card">
                  <span>ORGANIZATION</span>
                  <h2>Departments</h2>
                  <p>Company department workspace</p>
                  <button onClick={() => openSection("Departments")}>
                    Explore Departments →
                  </button>
                </div>

                <div className="stat-card">
                  <span>OPERATIONS</span>
                  <h2>Business Records</h2>
                  <p>Company information and records</p>
                  <button onClick={() => openSection("Business Records")}>
                    View Records →
                  </button>
                </div>
              </div>

              <div className="bottom-grid">
                <div className="panel">
                  <h3>Quick Actions</h3>
                  <p>Choose an action to continue.</p>

                  <button
                    className="quick-action"
                    onClick={() => openSection("Staff Management")}
                  >
                    <strong>+ Create Staff Account</strong>
                    <span>→</span>
                  </button>

                  <button
                    className="quick-action"
                    onClick={() => openSection("Task Management")}
                  >
                    <strong>✓ Assign Staff Task</strong>
                    <span>→</span>
                  </button>

                  <button
                    className="quick-action"
                    onClick={() => openSection("Settings")}
                  >
                    <strong>⚙ Account Settings</strong>
                    <span>→</span>
                  </button>
                </div>

                <div className="panel account-panel">
                  <h3>Account Overview</h3>
                  <div className="account-avatar">
                    {username.charAt(0).toUpperCase()}
                  </div>
                  <strong>{username}</strong>
                  <span>Administrator</span>
                  <div className="verified">✓ Authorized Account</div>
                </div>
              </div>
            </>
          )}

          {activeSection === "Staff Management" && (
            <>
              <div className="panel form-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Create Staff Account</h3>
                    <p>Admin can create Staff accounts only.</p>
                  </div>
                  <span className="role-label">STAFF ACCESS</span>
                </div>

                <form onSubmit={createStaff}>
                  <label>Staff Username</label>
                  <input
                    value={staffUsername}
                    onChange={(e) => setStaffUsername(e.target.value)}
                    placeholder="Enter staff username"
                    required
                  />

                  <label>Email Address</label>
                  <input
                    type="email"
                    value={staffEmail}
                    onChange={(e) => setStaffEmail(e.target.value)}
                    placeholder="Enter email address"
                    required
                  />

                  <label>Temporary Password</label>
                  <input
                    type="password"
                    value={staffPassword}
                    onChange={(e) => setStaffPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    minLength={8}
                    required
                  />

                  <label>Account Role</label>
                  <input value="Staff" disabled />

                  <button className="primary-button" type="submit" disabled={creating}>
                    {creating ? "Creating Account..." : "Create Staff Account"}
                  </button>

                  {message && <div className="form-message">{message}</div>}
                </form>
              </div>

              <div className="panel staff-panel">
                <div className="panel-heading">
                  <div>
                    <h3>Staff Directory</h3>
                    <p>Registered Staff accounts in WIN GROUP</p>
                  </div>
                  <button
                    className="refresh-button"
                    onClick={loadStaff}
                    disabled={staffLoading}
                  >
                    {staffLoading ? "Loading..." : "↻ Refresh"}
                  </button>
                </div>

                <div className="staff-count">
                  <strong>{staff.length}</strong>
                  <span>Total Staff Accounts</span>
                </div>

                {staffLoading ? (
                  <p className="list-message">Loading Staff accounts...</p>
                ) : staffError ? (
                  <p className="error-message">{staffError}</p>
                ) : staff.length === 0 ? (
                  <p className="list-message">
                    No Staff accounts found yet.
                  </p>
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Username</th>
                          <th>Role</th>
                          <th>Joining Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {staff.map((member) => (
                          <tr key={member.id}>
                            <td>{member.username}</td>
                            <td><span className="staff-badge">Staff</span></td>
                            <td>
                              {new Date(member.created_at).toLocaleDateString(
                                "en-PK",
                                {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                }
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          {activeSection === "Task Management" && (
            <TaskManagement />
          )}

          {activeSection === "Departments" && (
            <ModulePlaceholder
              title="Departments"
              description="Department management will be added to this workspace."
            />
          )}

          {activeSection === "Business Records" && (
            <ModulePlaceholder
              title="Business Records"
              description="Business record management will be added to this workspace."
            />
          )}

          {activeSection === "Reports" && (
            <ModulePlaceholder
              title="Reports & Analytics"
              description="Reports and business analytics will be developed in a later stage."
            />
          )}

          {activeSection === "Settings" && (
            <div className="panel settings-panel">
              <h3>Account Information</h3>
              <p>Administrator profile details</p>
              <div className="setting-row">
                <span>Username</span><strong>{username}</strong>
              </div>
              <div className="setting-row">
                <span>Account Role</span><strong>Admin</strong>
              </div>
              <div className="setting-row">
                <span>Organization</span><strong>WIN GROUP</strong>
              </div>
              <div className="setting-row">
                <span>Account Status</span><strong className="green-text">Active</strong>
              </div>
            </div>
          )}
        </div>

        <footer>
          <span>© WIN GROUP</span>
          <span>Wolf Independent National Group · Admin Portal</span>
        </footer>
      </section>

      <style jsx>{`
        * { box-sizing: border-box; }
        .app { min-height: 100vh; display: flex; background: #f3f6fb; color: #172c48; font-family: Arial, sans-serif; }
        .loading { min-height: 100vh; display: grid; place-items: center; background: #f3f6fb; color: #142d4e; font-family: Arial; }
        .sidebar { width: 255px; min-height: 100vh; background: #10233f; color: white; padding: 25px 16px; display: flex; flex-direction: column; flex-shrink: 0; }
        .brand { display: flex; align-items: center; gap: 12px; padding: 5px 8px 30px; border-bottom: 1px solid #293d59; }
        .brand-logo { width: 43px; height: 43px; border-radius: 12px; background: #3477db; display: grid; place-items: center; font-size: 23px; font-weight: bold; }
        .brand h2 { margin: 0; font-size: 17px; letter-spacing: 1px; }
        .brand span { color: #9db2ce; font-size: 10px; letter-spacing: 2px; }
        .menu-label { color: #849ab7; font-size: 10px; letter-spacing: 1.5px; margin: 30px 10px 12px; }
        .navigation { display: grid; gap: 7px; }
        .nav-item { display: flex; align-items: center; gap: 12px; padding: 13px 12px; width: 100%; border: 0; border-radius: 8px; background: transparent; color: #c1cde0; font-size: 13px; text-align: left; cursor: pointer; }
        .nav-item:hover { background: #1b3455; color: white; }
        .nav-item.active { background: #285ca5; color: white; font-weight: bold; }
        .nav-icon { width: 20px; text-align: center; font-size: 17px; }
        .active-dot { width: 6px; height: 6px; background: white; border-radius: 50%; margin-left: auto; }
        .sidebar-bottom { margin-top: auto; }
        .support-card { background: #1a3456; padding: 15px; border-radius: 10px; margin: 25px 0 15px; }
        .support-card strong { font-size: 12px; }
        .support-card p { color: #aebed3; font-size: 11px; line-height: 1.5; margin-bottom: 0; }
        .logout-button { width: 100%; padding: 13px; background: transparent; border: 1px solid #425775; border-radius: 8px; color: white; text-align: left; cursor: pointer; }
        .main-area { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .topbar { min-height: 88px; background: white; border-bottom: 1px solid #e4eaf2; padding: 17px 35px; display: flex; justify-content: space-between; align-items: center; gap: 15px; }
        .breadcrumb { font-size: 10px; color: #8292a8; letter-spacing: 1px; }
        .topbar h2 { margin: 6px 0 0; font-size: 20px; }
        .top-user { display: flex; align-items: center; gap: 10px; }
        .status-dot { width: 8px; height: 8px; background: #22b879; border-radius: 50%; }
        .user-avatar, .account-avatar { display: grid; place-items: center; border-radius: 50%; background: #e5efff; color: #2459a2; font-weight: bold; }
        .user-avatar { width: 38px; height: 38px; }
        .user-details { display: grid; gap: 4px; }
        .user-details strong { font-size: 12px; }
        .user-details span { color: #8292a8; font-size: 11px; }
        .content { padding: 30px 35px; flex: 1; }
        .welcome { background: linear-gradient(115deg, #17375f, #2868b7); color: white; padding: 30px; border-radius: 14px; display: flex; align-items: center; justify-content: space-between; min-height: 175px; }
        .eyebrow { color: #bad5ff; font-size: 10px; letter-spacing: 1.5px; }
        .welcome h1 { font-size: 25px; margin: 12px 0 8px; }
        .welcome p { color: #d5e4f8; font-size: 13px; line-height: 1.6; max-width: 480px; }
        .welcome-mark { font-size: 58px; font-weight: bold; color: #ffffff20; letter-spacing: 4px; }
        .section-heading { display: flex; justify-content: space-between; align-items: center; margin: 30px 0 17px; gap: 10px; }
        .section-heading h3, .panel h3 { margin: 0; font-size: 17px; }
        .section-heading p, .panel > p { margin: 6px 0 0; color: #8492a7; font-size: 12px; }
        .live-status { color: #16885c; font-size: 11px; background: #e3f7ee; padding: 8px 11px; border-radius: 20px; white-space: nowrap; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
        .stat-card, .panel { background: white; border: 1px solid #e5eaf1; border-radius: 11px; padding: 21px; }
        .stat-card > span { color: #8a98aa; font-size: 9px; letter-spacing: 1px; }
        .stat-card h2 { font-size: 21px; margin: 20px 0 6px; }
        .stat-card p { font-size: 12px; color: #8794a7; min-height: 30px; }
        .stat-card button { background: transparent; border: 0; padding: 8px 0 0; color: #2868b7; font-size: 11px; font-weight: bold; cursor: pointer; }
        .bottom-grid { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; margin-top: 18px; }
        .panel > p { margin-bottom: 17px; }
        .quick-action { display: flex; width: 100%; justify-content: space-between; padding: 15px 0; background: white; border: 0; border-top: 1px solid #edf0f5; text-align: left; cursor: pointer; color: #233b59; font-size: 12px; }
        .account-panel { display: flex; flex-direction: column; align-items: center; text-align: center; }
        .account-avatar { width: 55px; height: 55px; font-size: 22px; margin: 15px 0 10px; }
        .account-panel > strong { font-size: 13px; }
        .account-panel > span { font-size: 11px; color: #8492a7; margin-top: 5px; }
        .verified { color: #18885b; background: #e5f7ee; padding: 7px 12px; border-radius: 20px; font-size: 10px; margin: 12px 0; }
        .form-panel { max-width: 680px; margin-bottom: 20px; }
        .panel-heading { display: flex; justify-content: space-between; gap: 10px; align-items: center; margin-bottom: 20px; }
        .panel-heading h3 { font-size: 19px; }
        .panel-heading p { color: #8492a7; font-size: 12px; }
        .role-label { background: #e9f1ff; color: #2868b7; padding: 8px 11px; border-radius: 20px; font-size: 9px; white-space: nowrap; }
        form { display: grid; gap: 10px; }
        form label { font-size: 12px; font-weight: bold; color: #42546c; margin-top: 5px; }
        form input { width: 100%; padding: 13px; border: 1px solid #dce4ee; border-radius: 7px; font-size: 13px; outline: none; }
        form input:focus { border-color: #3477db; }
        form input:disabled { background: #f1f4f8; color: #65758a; }
        .primary-button { margin-top: 12px; padding: 14px; border: 0; border-radius: 7px; background: #1c579d; color: white; font-weight: bold; cursor: pointer; }
        .primary-button:disabled, .refresh-button:disabled { opacity: 0.6; cursor: not-allowed; }
        .form-message { padding: 12px; background: #eef5ff; color: #2459a2; border-radius: 7px; font-size: 12px; overflow-wrap: anywhere; }
        .staff-panel { margin-top: 20px; }
        .refresh-button { border: 1px solid #dce4ee; background: white; padding: 9px 13px; border-radius: 7px; color: #2459a2; cursor: pointer; font-size: 12px; }
        .staff-count { display: flex; align-items: center; gap: 12px; background: #f3f7fd; padding: 14px; border-radius: 8px; margin-bottom: 18px; }
        .staff-count strong { font-size: 24px; color: #2459a2; }
        .staff-count span { color: #718096; font-size: 12px; }
        .table-wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; text-align: left; min-width: 420px; }
        th { color: #8292a8; font-size: 10px; text-transform: uppercase; letter-spacing: 1px; background: #f8fafd; }
        th, td { padding: 14px 12px; border-bottom: 1px solid #edf0f5; font-size: 12px; }
        td { color: #42546c; }
        .staff-badge { color: #18885b; background: #e5f7ee; padding: 5px 9px; border-radius: 15px; font-size: 10px; }
        .list-message { color: #718096; font-size: 12px; padding: 15px 0; }
        .error-message { color: #bd3333; font-size: 12px; padding: 12px; background: #fff0f0; border-radius: 7px; }
        .placeholder { max-width: 700px; padding: 40px; text-align: center; }
        .placeholder h3 { font-size: 20px; }
        .placeholder p { color: #8492a7; font-size: 13px; line-height: 1.6; }
        .coming-soon { display: inline-block; margin-top: 12px; padding: 8px 13px; background: #edf4ff; color: #2868b7; border-radius: 20px; font-size: 10px; font-weight: bold; }
        .setting-row { display: flex; justify-content: space-between; gap: 15px; padding: 17px 0; border-top: 1px solid #edf0f5; font-size: 13px; }
        .setting-row span { color: #8492a7; }
        .green-text { color: #18885b; }
        footer { display: flex; justify-content: space-between; gap: 10px; padding: 18px 35px; border-top: 1px solid #e5eaf1; color: #94a0b0; font-size: 10px; }
        @media (max-width: 900px) {
          .sidebar { width: 215px; }
          .content { padding: 22px; }
          .topbar { padding: 17px 22px; }
          .stats-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          .bottom-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 600px) {
          .app { flex-direction: column; }
          .sidebar { width: 100%; min-height: auto; padding: 14px; }
          .brand { padding: 3px 5px 13px; }
          .menu-label, .sidebar-bottom { display: none; }
          .navigation { display: flex; overflow-x: auto; gap: 6px; padding-top: 12px; }
          .nav-item { width: auto; flex-shrink: 0; padding: 10px; font-size: 11px; }
          .nav-icon, .active-dot { display: none; }
          .topbar { padding: 15px; }
          .topbar h2 { font-size: 17px; }
          .user-details { display: none; }
          .content { padding: 15px; }
          .welcome { padding: 22px; min-height: 150px; }
          .welcome h1 { font-size: 20px; }
          .welcome-mark { font-size: 32px; }
          .stats-grid { grid-template-columns: 1fr; }
          .section-heading { align-items: flex-start; }
          footer { padding: 15px; flex-wrap: wrap; }
          .form-panel { padding: 17px; }
          .panel-heading { align-items: flex-start; }
          .setting-row { font-size: 11px; }
        }
      `}</style>
    </main>
  );
}

function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="panel placeholder">
      <h3>{title}</h3>
      <p>{description}</p>
      <span className="coming-soon">MODULE IN DEVELOPMENT</span>
    </div>
  );
}
