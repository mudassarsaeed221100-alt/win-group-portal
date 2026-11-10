
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Profile = {
  first_name: string | null;
  surname: string | null;
  role: string;
  avatar_url: string | null;
  team_code: string | null;
};

type SuperAdminProfile = {
  first_name: string | null;
  surname: string | null;
  team_code: string | null;
};

type StaffOverviewProps = {
  profile: Profile;
  superAdmin: SuperAdminProfile | null;
};

type DashboardStats = {
  availableTasks: number | null;
  submissions: number | null;
  earnings: number | null;
  notifications: number | null;
};

const initialStats: DashboardStats = {
  availableTasks: null,
  submissions: null,
  earnings: null,
  notifications: null,
};

export default function StaffOverview({
  profile,
  superAdmin,
}: StaffOverviewProps) {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(true);

  const fullName =
    `${profile.first_name || ""} ${profile.surname || ""}`.trim() ||
    "Staff Member";

  const superAdminName =
    `${superAdmin?.first_name || ""} ${superAdmin?.surname || ""}`.trim();

  useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        if (mounted) setLoading(false);
        return;
      }

      const [tasksResult, submissionsResult, earningsResult, notificationsResult] =
        await Promise.all([
          supabase
            .from("work_tasks")
            .select("id", { count: "exact", head: true })
            .eq("status", "active"),

          supabase
            .from("work_submissions")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id),

          supabase
            .from("earnings_ledger")
            .select("amount")
            .eq("user_id", user.id),

          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("status", "active"),
        ]);

      const earningsTotal = earningsResult.error
        ? null
        : (earningsResult.data || []).reduce(
            (total, item) => total + Number(item.amount || 0),
            0
          );

      if (mounted) {
        setStats({
          availableTasks: tasksResult.error ? null : tasksResult.count ?? 0,
          submissions: submissionsResult.error
            ? null
            : submissionsResult.count ?? 0,
          earnings: earningsTotal,
          notifications: notificationsResult.error
            ? null
            : notificationsResult.count ?? 0,
        });

        setLoading(false);
      }
    }

    loadDashboardData();

    return () => {
      mounted = false;
    };
  }, []);

  const showNumber = (value: number | null) => {
    if (loading) return "Loading...";
    if (value === null) return "Unavailable";
    return value.toLocaleString("en-PK");
  };

  const showMoney = (value: number | null) => {
    if (loading) return "Loading...";
    if (value === null) return "Unavailable";
    return `Rs. ${value.toLocaleString("en-PK")}`;
  };

  return (
    <main style={styles.container}>
      <section style={styles.welcomeCard}>
        <div style={styles.welcomeContent}>
          <p style={styles.label}>WOLF INDEPENDENT NATIONAL GROUP</p>
          <h1 style={styles.heading}>Staff Dashboard</h1>
          <p style={styles.welcome}>Welcome, {fullName}</p>
          <p style={styles.welcomeNote}>
            WIN GROUP Staff Portal mein khush aamdeed.
          </p>
        </div>

        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt="Staff Profile"
            style={styles.avatar}
          />
        ) : (
          <div style={styles.avatarPlaceholder}>
            {fullName.charAt(0).toUpperCase()}
          </div>
        )}
      </section>

      <section style={styles.grid}>
        <div style={styles.card}>
          <p style={styles.cardLabel}>Account Status</p>
          <h2 style={styles.cardValue}>Registered</h2>
          <p style={styles.cardNote}>Staff profile available</p>
        </div>

        <div style={styles.card}>
          <p style={styles.cardLabel}>Account Role</p>
          <h2 style={styles.cardValue}>
            {profile.role === "staff" ? "Staff" : profile.role}
          </h2>
          <p style={styles.cardNote}>Your account role</p>
        </div>

        <div style={styles.card}>
          <p style={styles.cardLabel}>Available Tasks</p>
          <h2 style={styles.cardValue}>
            {showNumber(stats.availableTasks)}
          </h2>
          <p style={styles.cardNote}>Active tasks available to you</p>
        </div>

        <div style={styles.card}>
          <p style={styles.cardLabel}>My Team Code</p>
          <h2 style={styles.cardValueSmall}>
            {profile.team_code || "Not available"}
          </h2>
          <p style={styles.cardNote}>Your assigned team code</p>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>My Team Information</h2>
        <p style={styles.description}>
          Aapki team aur aapke Super Admin ki information.
        </p>

        <div style={styles.info}>
          <span>Super Admin Name</span>
          <strong>{superAdminName || "Not available"}</strong>
        </div>

        <div style={styles.info}>
          <span>Super Admin Team Code</span>
          <strong>{superAdmin?.team_code || "Not available"}</strong>
        </div>

        <div style={styles.info}>
          <span>My Team Code</span>
          <strong>{profile.team_code || "Not available"}</strong>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>My Account</h2>
        <p style={styles.description}>
          Aapki personal account information.
        </p>

        <div style={styles.info}>
          <span>First Name</span>
          <strong>{profile.first_name || "Not set"}</strong>
        </div>

        <div style={styles.info}>
          <span>Surname</span>
          <strong>{profile.surname || "Not set"}</strong>
        </div>

        <div style={styles.info}>
          <span>Account Role</span>
          <strong>{profile.role}</strong>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>Staff Workspace</h2>
        <p style={styles.description}>
          Aapke staff account ke actual records.
        </p>

        <div style={styles.workspaceGrid}>
          <div style={styles.workspaceItem}>
            <strong>Available Work Tasks</strong>
            <span>{showNumber(stats.availableTasks)} active tasks</span>
          </div>

          <div style={styles.workspaceItem}>
            <strong>My Submissions</strong>
            <span>{showNumber(stats.submissions)} submitted records</span>
          </div>

          <div style={styles.workspaceItem}>
            <strong>My Earnings</strong>
            <span>{showMoney(stats.earnings)} total ledger amount</span>
          </div>

          <div style={styles.workspaceItem}>
            <strong>Notifications</strong>
            <span>{showNumber(stats.notifications)} active notifications</span>
          </div>
        </div>
      </section>

      <p style={styles.footer}>WIN GROUP Management System</p>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    width: "100%",
    color: "#f4f4f5",
    fontFamily: "Arial, sans-serif",
  },
  welcomeCard: {
    background: "linear-gradient(125deg, #242730, #111217)",
    border: "1px solid #50535e",
    borderRadius: 15,
    padding: 28,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 20,
    flexWrap: "wrap",
    boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
  },
  welcomeContent: {
    minWidth: 0,
  },
  label: {
    color: "#aeb2bd",
    fontSize: 11,
    fontWeight: "bold",
    letterSpacing: 2,
    margin: "0 0 12px",
  },
  heading: {
    color: "#ffffff",
    fontSize: 27,
    margin: "0 0 10px",
  },
  welcome: {
    color: "#e0e1e5",
    fontSize: 16,
    margin: 0,
  },
  welcomeNote: {
    color: "#a5a7b0",
    fontSize: 13,
    margin: "10px 0 0",
  },
  avatar: {
    width: 76,
    height: 76,
    minWidth: 76,
    minHeight: 76,
    flexShrink: 0,
    borderRadius: "50%",
    objectFit: "cover",
    display: "block",
    border: "3px solid #858995",
  },
  avatarPlaceholder: {
    width: 76,
    height: 76,
    minWidth: 76,
    flexShrink: 0,
    borderRadius: "50%",
    background: "linear-gradient(135deg, #777b87, #292b33)",
    border: "3px solid #858995",
    display: "grid",
    placeItems: "center",
    fontSize: 30,
    fontWeight: "bold",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 15,
    marginTop: 20,
  },
  card: {
    background: "linear-gradient(145deg, #1b1d24, #111217)",
    border: "1px solid #41434b",
    borderRadius: 12,
    padding: 20,
    minWidth: 0,
  },
  cardLabel: {
    color: "#a5a7b0",
    fontSize: 13,
    margin: 0,
  },
  cardValue: {
    color: "#ffffff",
    fontSize: 23,
    margin: "15px 0 7px",
    overflowWrap: "anywhere",
  },
  cardValueSmall: {
    color: "#ffffff",
    fontSize: 17,
    overflowWrap: "anywhere",
    margin: "15px 0 7px",
  },
  cardNote: {
    color: "#858995",
    fontSize: 12,
    margin: 0,
  },
  section: {
    background: "linear-gradient(145deg, #1b1d24, #111217)",
    border: "1px solid #41434b",
    borderRadius: 13,
    padding: 23,
    marginTop: 20,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 19,
    margin: "0 0 9px",
  },
  description: {
    color: "#a5a7b0",
    fontSize: 13,
    lineHeight: 1.6,
    margin: "0 0 12px",
  },
  info: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
    padding: "15px 0",
    borderBottom: "1px solid #353740",
    color: "#b9bbc3",
    fontSize: 13,
  },
  workspaceGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
    gap: 12,
    marginTop: 15,
  },
  workspaceItem: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: 16,
    background: "#202229",
    border: "1px solid #41434b",
    borderRadius: 9,
    minWidth: 0,
    fontSize: 13,
    color: "#e5e5e8",
  },
  footer: {
    textAlign: "center",
    color: "#777b87",
    fontSize: 11,
    marginTop: 25,
  },
};
