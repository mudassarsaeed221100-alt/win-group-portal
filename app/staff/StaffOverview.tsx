"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  first_name: string | null;
  surname: string | null;
  role: string | null;
};

export default function StaffOverview() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, first_name, surname, role")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Profile error:", error.message);
      } else {
        setProfile(data);
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  if (loading) {
    return <div style={styles.loading}>Loading Staff Portal...</div>;
  }

  if (!profile || profile.role !== "staff") {
    return (
      <div style={styles.container}>
        <h2>Access Restricted</h2>
        <p>Ye dashboard sirf Staff members ke liye hai.</p>
      </div>
    );
  }

  const fullName =
    `${profile.first_name || ""} ${profile.surname || ""}`.trim();

  return (
    <main style={styles.container}>
      <header style={styles.header}>
        <div>
          <p style={styles.label}>WIN GROUP</p>
          <h1 style={styles.heading}>Staff Dashboard</h1>
          <p style={styles.welcome}>
            Welcome, {fullName || "Staff Member"}
          </p>
        </div>
        <div style={styles.avatar}>
          {(fullName || "S").charAt(0).toUpperCase()}
        </div>
      </header>

      <section style={styles.grid}>
        <div style={styles.card}>
          <p style={styles.cardLabel}>My Team</p>
          <h2 style={styles.cardValue}>--</h2>
          <p style={styles.cardNote}>Team information</p>
        </div>

        <div style={styles.card}>
          <p style={styles.cardLabel}>My Earnings</p>
          <h2 style={styles.cardValue}>Rs. 0</h2>
          <p style={styles.cardNote}>Your earning record</p>
        </div>

        <div style={styles.card}>
          <p style={styles.cardLabel}>My Profile</p>
          <h2 style={styles.cardValue}>Active</h2>
          <p style={styles.cardNote}>Your personal account</p>
        </div>

        <div style={styles.card}>
          <p style={styles.cardLabel}>Account Role</p>
          <h2 style={styles.cardValue}>Staff</h2>
          <p style={styles.cardNote}>WIN GROUP member</p>
        </div>
      </section>

      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>My Account</h2>
        <p style={styles.description}>
          Yahan aap apni profile aur personal information manage kar
          sakte hain.
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
          <strong>Staff</strong>
        </div>
      </section>

      <p style={styles.footer}>
        WIN GROUP Management System
      </p>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    padding: "24px",
    background: "#f4f6fa",
    color: "#172033",
    fontFamily: "Arial, sans-serif",
  },
  loading: {
    padding: "40px",
    textAlign: "center",
    fontFamily: "Arial, sans-serif",
  },
  header: {
    background: "#172033",
    color: "#fff",
    borderRadius: "16px",
    padding: "28px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    flexWrap: "wrap",
  },
  label: {
    color: "#aab8d0",
    fontSize: "12px",
    fontWeight: 700,
    letterSpacing: "2px",
  },
  heading: {
    fontSize: "28px",
    margin: "8px 0",
  },
  welcome: {
    color: "#d1d9e8",
    margin: 0,
  },
  avatar: {
    width: "55px",
    height: "55px",
    borderRadius: "50%",
    background: "#365b9d",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "24px",
    fontWeight: 700,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "16px",
    marginTop: "22px",
  },
  card: {
    background: "#fff",
    border: "1px solid #e5e9f0",
    borderRadius: "14px",
    padding: "22px",
  },
  cardLabel: {
    color: "#68758a",
    fontSize: "14px",
    margin: 0,
  },
  cardValue: {
    fontSize: "25px",
    margin: "14px 0 8px",
  },
  cardNote: {
    color: "#8994a6",
    fontSize: "12px",
    margin: 0,
  },
  section: {
    background: "#fff",
    border: "1px solid #e5e9f0",
    borderRadius: "14px",
    padding: "24px",
    marginTop: "22px",
  },
  sectionTitle: {
    marginTop: 0,
    fontSize: "20px",
  },
  description: {
    color: "#68758a",
    fontSize: "14px",
  },
  info: {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "14px 0",
    borderBottom: "1px solid #edf0f4",
    fontSize: "14px",
  },
  footer: {
    textAlign: "center",
    color: "#8994a6",
    fontSize: "12px",
    marginTop: "30px",
  },
};
