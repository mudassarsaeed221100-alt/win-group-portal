
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Member = {
  id: string;
  first_name: string | null;
  surname: string | null;
  role: string | null;
};

export default function TeamOverview() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadTeam() {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        setError("Please login first.");
        setLoading(false);
        return;
      }

      const { data: currentProfile, error: profileError } =
        await supabase
          .from("profiles")
          .select("role")
          .eq("id", authData.user.id)
          .maybeSingle();

      if (profileError || currentProfile?.role !== "founder_owner") {
        setError("Founder access required.");
        setLoading(false);
        return;
      }

      const { data, error: membersError } = await supabase
        .from("profiles")
        .select("id, first_name, surname, role");

      if (membersError) {
        setError(membersError.message);
      } else {
        setMembers(data || []);
      }

      setLoading(false);
    }

    loadTeam();
  }, []);

  const count = (role: string) =>
    members.filter((member) => member.role === role).length;

  const cards = [
    { title: "Super Admins", value: count("super_admin") },
    { title: "Admins", value: count("admin") },
    { title: "Staff", value: count("staff") },
    {
      title: "Total Members",
      value: members.filter(
        (member) => member.role !== "founder_owner"
      ).length,
    },
  ];

  if (loading) {
    return <p style={{ padding: 25 }}>Loading team overview...</p>;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <h2>Team Overview</h2>
        <p style={{ color: "#dc2626" }}>{error}</p>
      </div>
    );
  }

  return (
    <main style={styles.container}>
      <h1 style={styles.heading}>Team Overview</h1>
      <p style={styles.subtitle}>
        WIN GROUP - Complete Company Team Summary
      </p>

      <section style={styles.grid}>
        {cards.map((card) => (
          <div key={card.title} style={styles.card}>
            <p style={styles.cardTitle}>{card.title}</p>
            <h2 style={styles.number}>{card.value}</h2>
          </div>
        ))}
      </section>

      <section style={styles.panel}>
        <h2 style={styles.panelTitle}>Team Members Summary</h2>

        {members
          .filter((member) => member.role !== "founder_owner")
          .map((member) => (
            <div key={member.id} style={styles.member}>
              <div>
                <strong>
                  {`${member.first_name || ""} ${
                    member.surname || ""
                  }`.trim() || "Unnamed Member"}
                </strong>
                <p style={styles.role}>
                  {member.role || "No role assigned"}
                </p>
              </div>
              <span style={styles.status}>Registered</span>
            </div>
          ))}

        {members.filter(
          (member) => member.role !== "founder_owner"
        ).length === 0 && <p>No team members found.</p>}
      </section>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: "24px",
    color: "#172033",
    fontFamily: "Arial, sans-serif",
  },
  heading: {
    fontSize: "26px",
    marginBottom: "6px",
  },
  subtitle: {
    color: "#718096",
    marginBottom: "25px",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "22px",
  },
  cardTitle: {
    color: "#64748b",
    margin: 0,
    fontSize: "14px",
  },
  number: {
    fontSize: "30px",
    margin: "12px 0 0",
  },
  panel: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: "12px",
    padding: "22px",
    marginTop: "24px",
  },
  panelTitle: {
    fontSize: "19px",
    marginTop: 0,
    marginBottom: "18px",
  },
  member: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    padding: "14px 0",
    borderBottom: "1px solid #edf0f4",
  },
  role: {
    color: "#64748b",
    fontSize: "13px",
    margin: "5px 0 0",
  },
  status: {
    color: "#15803d",
    fontSize: "12px",
  },
};
