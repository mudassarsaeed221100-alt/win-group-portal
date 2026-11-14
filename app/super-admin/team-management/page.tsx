"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type TeamMember = {
  id: string;
  first_name: string | null;
  surname: string | null;
  role: string;
  team_code: string | null;
  avatar_url: string | null;
};

export default function TeamManagementPage() {
  const router = useRouter();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [teamCode, setTeamCode] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadTeam() {
    setLoading(true);
    setError("");

    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;

      if (!session) {
        router.replace("/");
        return;
      }

      const response = await fetch("/api/admin/team", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Team data load nahi ho saka.");
      }

      setTeamCode(result.team_code || "");
      setMembers(result.members || []);
    } catch (err) {
      console.error("Team Management Error:", err);
      setError(
        err instanceof Error ? err.message : "Team data load nahi ho saka."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTeam();
  }, []);

  const admins = members.filter((member) => member.role === "admin");
  const staff = members.filter((member) => member.role === "staff");

  const filteredMembers = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return members;

    return members.filter((member) => {
      const name = `${member.first_name || ""} ${member.surname || ""}`.toLowerCase();
      return (
        name.includes(term) ||
        member.role.toLowerCase().includes(term) ||
        (member.team_code || "").toLowerCase().includes(term)
      );
    });
  }, [members, search]);

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <div>
          <h1 style={styles.heading}>Team Management</h1>
          <p style={styles.subtitle}>
            WIN GROUP - Apni team ke Admin aur Staff manage karein
          </p>
        </div>

        <button style={styles.refreshButton} onClick={loadTeam} disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </button>
      </header>

      {error && (
        <div style={styles.error}>
          {error}
          <button onClick={loadTeam} style={styles.retryButton}>
            Try Again
          </button>
        </div>
      )}

      <section style={styles.teamCodeBox}>
        <span>YOUR TEAM CODE</span>
        <h2>{teamCode || (loading ? "Loading..." : "—")}</h2>
      </section>

      <section style={styles.stats}>
        <div style={styles.statCard}>
          <p>Total Members</p>
          <h2>{members.length}</h2>
        </div>
        <div style={styles.statCard}>
          <p>Total Admins</p>
          <h2>{admins.length}</h2>
        </div>
        <div style={styles.statCard}>
          <p>Total Staff</p>
          <h2>{staff.length}</h2>
        </div>
      </section>

      <section style={styles.panel}>
        <div style={styles.listHeader}>
          <div>
            <h2>Team Members</h2>
            <p>Admins aur Staff ki complete list</p>
          </div>

          <input
            style={styles.search}
            placeholder="Search member..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <p style={styles.message}>Team data load ho raha hai...</p>
        ) : filteredMembers.length === 0 ? (
          <p style={styles.message}>Koi team member nahi mila.</p>
        ) : (
          <div style={styles.memberList}>
            {filteredMembers.map((member) => {
              const name =
                `${member.first_name || ""} ${member.surname || ""}`.trim() ||
