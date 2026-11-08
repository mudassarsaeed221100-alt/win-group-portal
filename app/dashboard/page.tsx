
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

const menuItems = [
  "Overview",
  "User Management",
  "Departments",
  "Business Records",
  "Reports",
  "Activity Logs",
  "Security",
  "System Settings",
];

export default function Dashboard() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [activeMenu, setActiveMenu] = useState("Overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("username, role")
        .eq("id", user.id)
        .single();

      if (error || !data || data.role !== "founder_owner") {
        router.replace("/");
        return;
      }

      setUsername(data.username);
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return <main className="loading">Loading Founder Dashboard...</main>;
  }

  return (
    <main className="layout">
      <aside className="sidebar">
        <div className="brand">
          <h2>WIN GROUP</h2>
          <span>Wolf Independent National Group</span>
        </div>

        <div className="profile">
          <div className="avatar">F</div>
          <div>
            <strong>Founder / Owner</strong>
            <small>{username}</small>
          </div>
        </div>

        <p className="menu-title">MAIN MENU</p>

        <nav>
          {menuItems.map((item) => (
            <button
              key={item}
              className={activeMenu === item ? "menu active" : "menu"}
              onClick={() => setActiveMenu(item)}
            >
              {item === "Overview" ? "⌂" : "▣"} 
              <span>{item}</span>
            </button>
          ))}
        </nav>

        <button className="logout" onClick={logout}>
          Logout
        </button>
      </aside>

      <section className="content">
        <header className="topbar">
          <div>
            <h1>{activeMenu}</h1>
            <p>WIN GROUP Management Portal</p>
          </div>
          <div className="top-profile">
            <div className="avatar small">F</div>
            <strong>Founder</strong>
          </div>
        </header>

        {activeMenu === "Overview" ? (
          <>
            <div className="welcome">
              <h2>Welcome, {username}</h2>
              <p>
                Your Founder / Owner control panel is ready.
                Manage your organization from one place.
              </p>
            </div>

            <h3 className="section-heading">Company Overview</h3>

            <div className="stats">
              <div className="stat-card">
                <span>Total Users</span>
                <h2>0</h2>
                <small>Registered accounts</small>
              </div>

              <div className="stat-card">
                <span>Departments</span>
                <h2>0</h2>
                <small>Company departments</small>
              </div>

              <div className="stat-card">
                <span>Business Records</span>
                <h2>0</h2>
                <small>Company records</small>
              </div>

              <div className="stat-card">
                <span>System Status</span>
                <h2 className="online">Active</h2>
                <small>Portal connected</small>
              </div>
            </div>

            <div className="panel">
              <h3>Management Structure</h3>
              <div className="hierarchy">
                <div className="level founder">
                  Founder / Owner
                  <small>Ultimate System Authority</small>
                </div>
                <div className="level">Boss</div>
                <div className="level">Super Admin</div>
                <div className="level">Admin</div>
                <div className="level">Staff</div>
              </div>
            </div>

            <div className="panel">
              <h3>Founder Authority</h3>
              <p>
                Founder / Owner has the highest level of control
                over the WIN GROUP portal.
              </p>
              <ul>
                <li>Manage organizational structure</li>
                <li>Control user roles and permissions</li>
                <li>Manage company records and reports</li>
                <li>Monitor system activities</li>
              </ul>
            </div>
          </>
        ) : (
          <div className="panel coming">
            <h2>{activeMenu}</h2>
            <p>
              This section will be developed and connected
              to the database in the next development steps.
            </p>
            <small>Founder / Owner access</small>
          </div>
        )}
      </section>

      <style jsx>{`
        * {
          box-sizing: border-box;
        }

        .layout {
          min-height: 100vh;
          display: flex;
          background: #f3f6fa;
          color: #182b45;
          font-family: Arial, sans-serif;
        }

        .loading {
          padding: 40px;
          font-family: Arial;
        }

        .sidebar {
          width: 260px;
          min-height: 100vh;
          background: #102b50;
          color: white;
          padding: 25px 17px;
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
        }

        .brand {
          padding: 5px 8px 25px;
          border-bottom: 1px solid #ffffff25;
        }

        .brand h2 {
          margin: 0 0 7px;
          font-size: 24px;
          letter-spacing: 1px;
        }

        .brand span {
          color: #c5d2e2;
          font-size: 11px;
        }

        .profile {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 23px 5px;
        }

        .profile strong,
        .profile small {
          display: block;
        }

        .profile strong {
          font-size: 13px;
        }

        .profile small {
          color: #c5d2e2;
          margin-top: 5px;
          font-size: 11px;
        }

        .avatar {
          background: #ffffff;
          color: #102b50;
          border-radius: 50%;
          width: 42px;
          height: 42px;
          display: grid;
          place-items: center;
          font-weight: bold;
          font-size: 20px;
        }

        .menu-title {
          color: #9fb2ca;
          font-size: 10px;
          padding-left: 9px;
          margin-top: 5px;
        }

        nav {
          display: grid;
          gap: 7px;
        }

        .menu {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 12px;
          border: none;
          border-radius: 7px;
          color: #d9e3ef;
          background: transparent;
          text-align: left;
          cursor: pointer;
          font-size: 13px;
        }

        .menu.active {
          color: white;
          background: #24476f;
        }

        .logout {
          margin-top: auto;
          background: #ffffff;
          color: #102b50;
          border: none;
          padding: 13px;
          border-radius: 7px;
          cursor: pointer;
          font-weight: bold;
        }

        .content {
          flex: 1;
          min-width: 0;
          padding: 30px;
        }

        .topbar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #dce3ec;
          padding-bottom: 20px;
          gap: 15px;
        }

        .topbar h1 {
          font-size: 24px;
          margin: 0;
          color: #102b50;
        }

        .topbar p {
          margin: 6px 0 0;
          color: #718096;
          font-size: 12px;
        }

        .top-profile {
          display: flex;
          align-items: center;
          gap: 9px;
          font-size: 13px;
        }

        .avatar.small {
          width: 34px;
          height: 34px;
          font-size: 15px;
          background: #102b50;
          color: white;
        }

        .welcome {
          background: #102b50;
          color: white;
          border-radius: 12px;
          padding: 27px;
          margin-top: 25px;
        }

        .welcome h2 {
          margin: 0 0 9px;
          font-size: 22px;
        }

        .welcome p {
          color: #d3dfed;
          margin: 0;
          font-size: 13px;
          line-height: 1.6;
        }

        .section-heading {
          margin: 30px 0 15px;
          font-size: 17px;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 15px;
        }

        .stat-card,
        .panel {
          background: white;
          border: 1px solid #e4eaf1;
          border-radius: 10px;
          padding: 20px;
        }

        .stat-card span {
          color: #68788d;
          font-size: 12px;
        }

        .stat-card h2 {
          font-size: 27px;
          margin: 13px 0 7px;
          color: #102b50;
        }

        .stat-card small {
          color: #8592a3;
          font-size: 11px;
        }

        .online {
          color: #16834b !important;
          font-size: 21px !important;
        }

        .panel {
          margin-top: 20px;
          line-height: 1.7;
          font-size: 13px;
          color: #536277;
        }

        .panel h3,
        .panel h2 {
          color: #102b50;
          margin-top: 0;
        }

        .hierarchy {
          display: grid;
          gap: 8px;
          max-width: 500px;
          margin: 18px auto 0;
          text-align: center;
        }

        .level {
          padding: 12px;
          border: 1px solid #dce4ee;
          border-radius: 7px;
          color: #102b50;
          font-weight: bold;
          background: #f8fafc;
        }

        .level.founder {
          background: #102b50;
          color: white;
        }

        .level small {
          display: block;
          font-weight: normal;
          font-size: 11px;
          margin-top: 4px;
          color: #d3dfed;
        }

        .coming {
          margin-top: 30px;
          padding: 35px;
        }

        @media (max-width: 900px) {
          .stats {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 650px) {
          .layout {
            flex-direction: column;
          }

          .sidebar {
            width: 100%;
            min-height: auto;
          }

          nav {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .logout {
            margin-top: 18px;
          }

          .content {
            padding: 18px;
          }

          .topbar h1 {
            font-size: 20px;
          }

          .stats {
            grid-template-columns: 1fr 1fr;
            gap: 9px;
          }

          .stat-card {
            padding: 14px;
          }
        }
      `}</style>
    </main>
  );
}
