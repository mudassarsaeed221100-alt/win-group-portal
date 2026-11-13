
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  first_name: string | null;
  surname: string | null;
  role: string;
  team_code: string | null;
  avatar_url: string | null;
};

const menuItems = [
  "Overview",
  "Team Management",
  "Create Staff",
  "Work Tasks",
  "Submissions",
  "Earnings",
  "Notifications",
  "Profile",
  "Support",
];

const menuIcons = ["⌂", "♙", "+", "▤", "✓", "₹", "♢", "⚙", "?"];

export default function SuperAdminDashboard() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeMenu, setActiveMenu] = useState("Overview");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);


useEffect(() => {
  let mounted = true;

  const loadProfile = async () => {
    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError) throw authError;

      if (!authData.user) {
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, surname, role, team_code, avatar_url")
        .eq("id", authData.user.id)
        .single();

      if (error) throw error;

      if (!data) {
        throw new Error("Profile record nahi mila.");
      }

      if (data.role !== "super_admin") {
        throw new Error(
          `Account role "${data.role}" hai, jabke "super_admin" required hai.`
        );
      }

      if (mounted) setProfile(data);
    } catch (error) {
      console.error("Super Admin loading error:", error);

      if (mounted) {
        setLoadError(
          error instanceof Error
            ? error.message
            : "Portal load nahi ho saka."
        );
      }
    } finally {
      if (mounted) setLoading(false);
    }
  };

  loadProfile();

  return () => {
    mounted = false;
  };
}, [router]);


  const logout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/");
  };

  const fullName =
    `${profile?.first_name || ""} ${profile?.surname || ""}`.trim() ||
    "Super Admin";

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loader" />
        <p>Loading Super Admin Portal...</p>
        <style jsx>{`
          .loading-screen {
            min-height: 100vh;
            background: #090b10;
            color: #fff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 15px;
            font-family: Arial, sans-serif;
          }
          .loader {
            width: 36px;
            height: 36px;
            border: 3px solid #303746;
            border-top-color: #5b8cff;
            border-radius: 50%;
            animation: spin 0.8s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  if (loadError) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#090b10",
      color: "white",
      display: "grid",
      placeItems: "center",
      padding: 20
    }}>
      <div>
        <h2>Portal Loading Error</h2>
        <p>{loadError}</p>
        <button onClick={() => window.location.reload()}>
          Try Again
        </button>
      </div>
    </div>
  );
}
  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-logo">WG</div>
          <div>
            <h2>WIN GROUP</h2>
            <span>SUPER ADMIN PORTAL</span>
          </div>
        </div>

        <div className="profile-card">
          <div className="avatar">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Profile" />
            ) : (
              fullName.charAt(0).toUpperCase()
            )}
          </div>
          <div className="profile-info">
            <strong>{fullName}</strong>
            <span>Super Admin</span>
          </div>
          <div className="online-dot" />
        </div>

        <div className="menu-heading">MAIN MENU</div>

        <nav className="navigation">
          {menuItems.map((item, index) => (
            <button
              key={item}
              className={`nav-item ${
                activeMenu === item ? "active" : ""
              }`}
              onClick={() => setActiveMenu(item)}
            >
              <span className="nav-icon">{menuIcons[index]}</span>
              <span>{item}</span>
              {activeMenu === item && <span className="active-line" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="authority-card">
            <div className="authority-icon">✓</div>
            <div>
              <strong>Team Authority</strong>
              <span>Your assigned team</span>
            </div>
          </div>

          <button
            className="logout-button"
            onClick={logout}
            disabled={loggingOut}
          >
            <span>↪</span>
            {loggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div>
            <span className="top-label">WIN GROUP / SUPER ADMIN</span>
            <h3>{activeMenu}</h3>
          </div>

          <div className="top-profile">
            <div className="status-indicator" />
            <span>Online</span>
            <div className="top-avatar">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" />
              ) : (
                fullName.charAt(0).toUpperCase()
              )}
            </div>
          </div>
        </header>

        <section className="page-content">
          {activeMenu === "Overview" ? (
            <>
              <div className="welcome-section">
                <div>
                  <span className="welcome-label">DASHBOARD OVERVIEW</span>
                  <h1>Welcome back, {profile?.first_name || "Admin"}!</h1>
                  <p>
                    Manage your team and monitor your work from one place.
                  </p>
                </div>
                <div className="welcome-badge">SUPER ADMIN</div>
              </div>

              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-top">
                    <span>Team Members</span>
                    <span className="stat-icon blue">♙</span>
                  </div>
                  <h2>—</h2>
                  <p>Members in your team</p>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Active Tasks</span>
                    <span className="stat-icon purple">▤</span>
                  </div>
                  <h2>—</h2>
                  <p>Tasks currently assigned</p>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Submissions</span>
                    <span className="stat-icon green">✓</span>
                  </div>
                  <h2>—</h2>
                  <p>Submitted work records</p>
                </div>

                <div className="stat-card">
                  <div className="stat-top">
                    <span>Total Earnings</span>
                    <span className="stat-icon orange">₹</span>
                  </div>
                  <h2>Rs. —</h2>
                  <p>Your team earnings</p>
                </div>
              </div>

              <div className="content-grid">
                <div className="panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Quick Actions</h3>
                      <p>Access your important tools</p>
                    </div>
                  </div>

                  <div className="quick-actions">
                    {[
                      ["＋", "Create Staff", "Add a new team member"],
                      ["▤", "Work Tasks", "Manage assigned work"],
                      ["✓", "Submissions", "Review submitted work"],
                      ["₹", "Earnings", "Check team earnings"],
                    ].map(([icon, title, description]) => (
                      <button
                        key={title}
                        className="quick-action"
                        onClick={() => setActiveMenu(title)}
                      >
                        <span className="quick-icon">{icon}</span>
                        <span className="quick-text">
                          <strong>{title}</strong>
                          <small>{description}</small>
                        </span>
                        <span className="arrow">›</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="panel account-panel">
                  <div className="panel-heading">
                    <div>
                      <h3>Account Information</h3>
                      <p>Your portal details</p>
                    </div>
                  </div>

                  <div className="account-row">
                    <span>Full Name</span>
                    <strong>{fullName}</strong>
                  </div>
                  <div className="account-row">
                    <span>Role</span>
                    <strong>Super Admin</strong>
                  </div>
                  <div className="account-row">
                    <span>Team Code</span>
                    <strong>{profile?.team_code || "Not assigned"}</strong>
                  </div>
                  <div className="account-row">
                    <span>Account Status</span>
                    <strong className="active-status">Active</strong>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="module-panel">
              <div className="module-symbol">
                {menuIcons[menuItems.indexOf(activeMenu)]}
              </div>
              <h2>{activeMenu}</h2>
              <p>
                {activeMenu} module is ready for development.
                Its functionality will be added here without changing
                the other dashboard sections.
              </p>
              <button
                className="back-button"
                onClick={() => setActiveMenu("Overview")}
              >
                Back to Overview
              </button>
            </div>
          )}
        </section>
      </main>

      <style jsx>{`
        * { box-sizing: border-box; }

        .dashboard {
          min-height: 100vh;
          display: flex;
          background: #0b0e14;
          color: #eef1f7;
          font-family: Arial, sans-serif;
        }

        .sidebar {
          width: 260px;
          min-height: 100vh;
          background: #11151e;
          border-right: 1px solid #252b38;
          padding: 25px 17px;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 2px 7px 28px;
          border-bottom: 1px solid #252b38;
        }

        .brand-logo {
          width: 43px;
          height: 43px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: #2864d9;
          font-weight: 800;
          font-size: 16px;
        }

        .brand h2 { font-size: 16px; margin: 0 0 5px; }
        .brand span { color: #8993a5; font-size: 9px; letter-spacing: 1.2px; }

        .profile-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 20px 5px;
          border-bottom: 1px solid #252b38;
        }

        .avatar, .top-avatar {
          width: 39px;
          height: 39px;
          border-radius: 50%;
          background: #273c63;
          display: grid;
          place-items: center;
          font-weight: 700;
          overflow: hidden;
        }

        .avatar img, .top-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .profile-info { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
        .profile-info strong { font-size: 12px; overflow: hidden; text-overflow: ellipsis; }
        .profile-info span { font-size: 11px; color: #8d99ad; }
        .online-dot { width: 8px; height: 8px; border-radius: 50%; background: #36c98b; margin-left: auto; }

        .menu-heading {
          font-size: 10px;
          color: #768197;
          letter-spacing: 1.5px;
          margin: 25px 10px 12px;
        }

        .navigation { display: flex; flex-direction: column; gap: 5px; }

        .nav-item {
          position: relative;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 13px;
          border: 0;
          border-radius: 8px;
          background: transparent;
          color: #aab3c2;
          padding: 12px 13px;
          text-align: left;
          font-size: 13px;
          cursor: pointer;
        }

        .nav-item:hover { background: #1b2332; color: white; }
        .nav-item.active { background: #1c3155; color: #72a5ff; }
        .nav-icon { width: 18px; font-size: 17px; text-align: center; }
        .active-line { position: absolute; right: 0; top: 9px; bottom: 9px; width: 3px; border-radius: 4px; background: #5790ff; }

        .sidebar-bottom { margin-top: auto; }
        .authority-card {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #191f2b;
          border: 1px solid #2a3343;
          border-radius: 9px;
          padding: 13px 10px;
          margin-bottom: 14px;
        }

        .authority-icon { width: 28px; height: 28px; border-radius: 8px; background: #193d35; color: #52d6a4; display: grid; place-items: center; }
        .authority-card div:last-child { display: flex; flex-direction: column; gap: 4px; }
        .authority-card strong { font-size: 11px; }
        .authority-card span { color: #8994a7; font-size: 10px; }

        .logout-button {
          width: 100%;
          padding: 12px;
          border: 1px solid #303746;
          border-radius: 8px;
          background: transparent;
          color: #c1c8d4;
          cursor: pointer;
          text-align: left;
          font-size: 12px;
        }

        .logout-button span { margin-right: 10px; font-size: 16px; }
        .logout-button:hover { background: #291d24; color: #ff929c; }

        .main-content { flex: 1; min-width: 0; }
        .topbar {
          height: 83px;
          border-bottom: 1px solid #252b38;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 34px;
          background: #10141c;
        }

        .top-label { color: #77849a; font-size: 9px; letter-spacing: 1.3px; }
        .topbar h3 { font-size: 17px; margin: 5px 0 0; }
        .top-profile { display: flex; align-items: center; gap: 9px; color: #aab4c4; font-size: 11px; }
        .status-indicator { width: 7px; height: 7px; border-radius: 50%; background: #38c98d; }
        .top-avatar { width: 35px; height: 35px; margin-left: 9px; }

        .page-content { padding: 34px; max-width: 1500px; margin: auto; }
        .welcome-section { display: flex; align-items: center; justify-content: space-between; gap: 15px; margin-bottom: 28px; }
        .welcome-label { font-size: 10px; color: #6498ff; letter-spacing: 1.5px; }
        .welcome-section h1 { font-size: 25px; margin: 10px 0 7px; }
        .welcome-section p { color: #929daf; font-size: 13px; margin: 0; }
        .welcome-badge { border: 1px solid #35558a; color: #80aaff; background: #172641; padding: 9px 13px; border-radius: 7px; font-size: 10px; letter-spacing: 1px; }

        .stats-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 15px; margin-bottom: 22px; }
        .stat-card, .panel, .module-panel { background: #121823; border: 1px solid #272f3e; border-radius: 11px; }
        .stat-card { padding: 19px; }
        .stat-top { display: flex; justify-content: space-between; align-items: center; color: #aab4c4; font-size: 12px; }
        .stat-icon { width: 34px; height: 34px; border-radius: 9px; display: grid; place-items: center; font-size: 17px; }
        .blue { background: #1b3154; color: #76aaff; }
        .purple { background: #30264e; color: #b59aff; }
        .green { background: #183d34; color: #57d7a6; }
        .orange { background: #44301f; color: #ffbd79; }
        .stat-card h2 { font-size: 25px; margin: 19px 0 6px; }
        .stat-card p { color: #7f8b9f; font-size: 11px; margin: 0; }

        .content-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 17px; }
        .panel { padding: 21px; }
        .panel-heading h3 { font-size: 15px; margin: 0 0 6px; }
        .panel-heading p { color: #8490a3; font-size: 11px; margin: 0; }
        .quick-actions { margin-top: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .quick-action { display: flex; align-items: center; gap: 10px; padding: 13px 10px; border: 1px solid #293244; background: #171e2b; border-radius: 8px; color: white; text-align: left; cursor: pointer; min-width: 0; }
        .quick-action:hover { border-color: #527fc9; background: #1b2940; }
        .quick-icon { width: 30px; height: 30px; display: grid; place-items: center; border-radius: 7px; background: #253653; color: #8bb4ff; flex-shrink: 0; }
        .quick-text { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
        .quick-text strong { font-size: 11px; }
        .quick-text small { font-size: 9px; color: #8490a3; }
        .arrow { margin-left: auto; color: #8490a3; font-size: 20px; }

        .account-panel { min-width: 0; }
        .account-row { display: flex; justify-content: space-between; gap: 10px; padding: 15px 0; border-bottom: 1px solid #252d3b; font-size: 11px; }
        .account-row:first-of-type { margin-top: 12px; }
        .account-row:last-child { border-bottom: 0; }
        .account-row span { color: #8490a3; }
        .account-row strong { text-align: right; overflow-wrap: anywhere; }
        .active-status { color: #4dd6a0; }

        .module-panel { min-height: 330px; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 30px; }
        .module-symbol { width: 55px; height: 55px; display: grid; place-items: center; border-radius: 14px; background: #1c3155; color: #80aaff; font-size: 25px; }
        .module-panel h2 { margin: 20px 0 8px; }
        .module-panel p { max-width: 440px; color: #929daf; font-size: 13px; line-height: 1.7; }
        .back-button { margin-top: 14px; background: #2864d9; color: white; border: 0; padding: 11px 17px; border-radius: 7px; cursor: pointer; }

        @media (max-width: 1050px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
          .content-grid { grid-template-columns: 1fr; }
        }

        @media (max-width: 700px) {
          .dashboard { flex-direction: column; }
          .sidebar { width: 100%; min-height: auto; padding: 15px; }
          .brand { padding-bottom: 15px; }
          .profile-card, .menu-heading, .sidebar-bottom { display: none; }
          .navigation { flex-direction: row; overflow-x: auto; padding: 14px 0 2px; }
          .nav-item { width: auto; flex-shrink: 0; padding: 10px 12px; font-size: 11px; }
          .nav-icon { display: none; }
          .active-line { display: none; }
          .topbar { height: 68px; padding: 0 17px; }
          .page-content { padding: 22px 15px; }
          .welcome-section h1 { font-size: 20px; }
          .welcome-section p { line-height: 1.5; }
          .welcome-badge { font-size: 8px; }
          .stats-grid { gap: 10px; }
          .stat-card { padding: 14px; }
          .stat-card h2 { font-size: 21px; }
          .quick-actions { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
