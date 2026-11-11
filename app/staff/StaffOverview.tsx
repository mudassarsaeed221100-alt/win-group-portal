
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

/* ───────── Types ───────── */

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
  totalSubmissions: number | null;
  totalEarnings: number | null;
  availableBalance: number | null;
  reservedAmount: number | null;
  notifications: number | null;
};

const initialStats: DashboardStats = {
  availableTasks: null,
  totalSubmissions: null,
  totalEarnings: null,
  availableBalance: null,
  reservedAmount: null,
  notifications: null,
};

/* ───────── Component ───────── */

export default function StaffOverview({
  profile,
  superAdmin,
}: StaffOverviewProps) {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fullName =
    `${profile.first_name || ""} ${profile.surname || ""}`.trim() ||
    "Staff Member";

  const superAdminName =
    `${superAdmin?.first_name || ""} ${superAdmin?.surname || ""}`.trim();

  useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        if (mounted) {
          setError("User session nahi mili. Dobara login karein.");
          setLoading(false);
        }
        return;
      }

      const [
        tasksResult,
        submissionsResult,
        earningsResult,
        withdrawalsResult,
        notificationsResult,
      ] = await Promise.all([
        /* FIX #1: Available tasks — filter by status AND target_roles contains 'staff' */
        supabase
          .from("work_tasks")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .contains("target_roles", ["staff"]),

        /* Total submissions by this staff */
        supabase
          .from("work_submissions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),

        /* FIX #3: Earnings — fetch amount AND withdrawn_amount for balance calc */
        supabase
          .from("earnings_ledger")
          .select("amount, payment_status, withdrawn_amount")
          .eq("user_id", user.id),

        /* FIX #4: Withdrawal requests — fetch pending/approved for reserved amount */
        supabase
          .from("withdrawal_requests")
          .select("amount, status")
          .eq("user_id", user.id)
          .in("status", ["pending", "approved"]),

        /* FIX #2: Notifications — filter by status AND recipient_roles contains 'staff' */
        supabase
          .from("notifications")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .contains("recipient_roles", ["staff"]),
      ]);

      /* Check for critical errors */
      const errors: string[] = [];
      if (tasksResult.error) errors.push("Tasks: " + tasksResult.error.message);
      if (earningsResult.error) errors.push("Earnings: " + earningsResult.error.message);
      if (withdrawalsResult.error) errors.push("Withdrawals: " + withdrawalsResult.error.message);
      if (notificationsResult.error) errors.push("Notifications: " + notificationsResult.error.message);

      if (errors.length > 0 && mounted) {
        setError("Kuch data load nahi ho saka: " + errors.join(" | "));
      }

      /* FIX #5: Calculate earnings breakdown */
      const earningsData = earningsResult.data || [];

      const totalEarnings = earningsData.reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );

      /* Unpaid balance = earnings that are not fully paid/withdrawn */
      const unpaidBalance = earningsData
        .filter((item) => item.payment_status !== "paid")
        .reduce(
          (sum, item) =>
            sum +
            Math.max(0, Number(item.amount || 0) - Number(item.withdrawn_amount || 0)),
          0
        );

      /* Reserved = sum of pending + approved withdrawal requests */
      const reservedAmount = (withdrawalsResult.data || []).reduce(
        (sum, item) => sum + Number(item.amount || 0),
        0
      );

      /* Available = unpaid balance minus reserved withdrawals */
      const availableBalance = Math.max(0, unpaidBalance - reservedAmount);

      if (mounted) {
        setStats({
          availableTasks: tasksResult.error ? null : tasksResult.count ?? 0,
          totalSubmissions: submissionsResult.error
            ? null
            : submissionsResult.count ?? 0,
          totalEarnings: earningsResult.error ? null : totalEarnings,
          availableBalance: earningsResult.error ? null : availableBalance,
          reservedAmount: withdrawalsResult.error ? null : reservedAmount,
          notifications: notificationsResult.error ? null : notificationsResult.count ?? 0,
        });
        setLoading(false);
      }
    }

    loadDashboardData();

    return () => {
      mounted = false;
    };
  }, []);

  /* ───────── Display Helpers ───────── */

  const showNumber = (value: number | null) => {
    if (loading) return "...";
    if (value === null) return "—";
    return value.toLocaleString("en-PK");
  };

  const showMoney = (value: number | null) => {
    if (loading) return "...";
    if (value === null) return "—";
    return `Rs. ${value.toLocaleString("en-PK")}`;
  };

  /* ───────── Render ───────── */

  return (
    <main style={styles.container}>
      {/* ── Welcome Card ── */}
      <section style={styles.welcomeCard}>
        <div style={styles.welcomeContent}>
          <p style={styles.label}>WOLF INDEPENDENT NATIONAL GROUP</p>
          <h1 style={styles.heading}>Staff Dashboard</h1>
          <p style={styles.welcome}>Welcome, {fullName}</p>
          <p style={styles.welcomeNote}>
            WIN GROUP Staff Portal mein khush aamdeed. Yahan se aap apne tasks,
            earnings aur team ki information dekh sakte hain.
          </p>
        </div>

        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt="Staff Profile"
            style={styles.avatar}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
              const parent = (e.target as HTMLImageElement).parentElement;
              if (parent) {
                const fallback = document.createElement("div");
                Object.assign(fallback.style, styles.avatarPlaceholder);
                fallback.textContent = fullName.charAt(0).toUpperCase();
                parent.replaceChild(fallback, e.target as HTMLImageElement);
              }
            }}
          />
        ) : (
          <div style={styles.avatarPlaceholder}>
            {fullName.charAt(0).toUpperCase()}
          </div>
        )}
      </section>

      {/* ── Error Message ── */}
      {error && <div style={styles.errorBox}>{error}</div>}

      {/* ── Stats Cards ── */}
      <section style={styles.grid}>
        <div style={styles.card}>
          <p style={styles.cardLabel}>Total Earnings</p>
          <h2 style={styles.cardValue}>{showMoney(stats.totalEarnings)}</h2>
          <p style={styles.cardNote}>Lifetime approved earnings</p>
        </div>

        <div style={styles.card}>
          <p style={styles.cardLabel}>Available Balance</p>
          <h2 style={{ ...styles.cardValue, color: "#6ee7a0" }}>
            {showMoney(stats.availableBalance)}
          </h2>
          <p style={styles.cardNote}>Withdrawable amount</p>
        </div>

        <div style={styles.card}>
          <p style={styles.cardLabel}>Reserved Amount</p>
          <h2 style={{ ...styles.cardValue, color: "#f5d28a" }}>
            {showMoney(stats.reservedAmount)}
          </h2>
          <p style={styles.cardNote}>Pending/Approved withdrawals</p>
        </div>

        <div style={styles.card}>
          <p style={styles.cardLabel}>Available Tasks</p>
          <h2 style={styles.cardValue}>
            {showNumber(stats.availableTasks)}
          </h2>
          <p style={styles.cardNote}>Active tasks for you</p>
        </div>

        <div style={styles.card}>
          <p style={styles.cardLabel}>My Submissions</p>
          <h2 style={styles.cardValue}>
            {showNumber(stats.totalSubmissions)}
          </h2>
          <p style={styles.cardNote}>Total work submitted</p>
        </div>

        <div style={styles.card}>
          <p style={styles.cardLabel}>Notifications</p>
          <h2 style={styles.cardValue}>
            {showNumber(stats.notifications)}
          </h2>
          <p style={styles.cardNote}>Active notifications</p>
        </div>
      </section>

      {/* ── Team Information ── */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>My Team Information</h2>
        <p style={styles.description}>
          Aapki team aur aapke Super Admin ki information.
        </p>

        <div style={styles.info}>
          <span>Super Admin</span>
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

        <div style={styles.info}>
          <span>My Role</span>
          <strong style={{ textTransform: "capitalize" }}>{profile.role}</strong>
        </div>
      </section>

      {/* ── My Account ── */}
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
          <strong style={{ textTransform: "capitalize" }}>{profile.role}</strong>
        </div>

        <div style={styles.info}>
          <span>Team Code</span>
          <strong>{profile.team_code || "Not assigned"}</strong>
        </div>
      </section>

      <p style={styles.footer}>WIN GROUP Management System</p>
    </main>
  );
}

/* ───────── Styles ───────── */

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
    flex: 1,
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
    lineHeight: 1.5,
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
  errorBox: {
    background: "#3a2024",
    border: "1px solid #754047",
    color: "#ffb8bf",
    padding: 14,
    borderRadius: 10,
    marginTop: 16,
    fontSize: 14,
    lineHeight: 1.5,
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
  footer: {
    textAlign: "center",
    color: "#777b87",
    fontSize: 11,
    marginTop: 25,
  },
};

