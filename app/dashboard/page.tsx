
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

export default function Dashboard() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [role, setRole] = useState("");
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

      if (error || !data) {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      if (data.role !== "founder_owner") {
        router.replace("/");
        return;
      }

      setUsername(data.username);
      setRole(data.role);
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return <main style={{ padding: "40px" }}>
      Loading WIN GROUP Dashboard...
    </main>;
  }

  return (
    <main style={{
      minHeight: "100vh",
      background: "#edf1f7",
      padding: "30px",
      fontFamily: "Arial"
    }}>
      <header style={{
        background: "#102b50",
        color: "white",
        padding: "25px",
        borderRadius: "12px"
      }}>
        <h1>WIN GROUP</h1>
        <p>Wolf Independent National Group</p>
        <p>Founder / Owner Control Panel</p>
      </header>

      <section style={{
        background: "white",
        marginTop: "25px",
        padding: "25px",
        borderRadius: "12px"
      }}>
        <h2>Welcome, {username}</h2>
        <p>Account Role: Founder / Owner</p>
        <p>System Status: Connected</p>
        <p>Role Code: {role}</p>
      </section>

      <section style={{
        background: "white",
        marginTop: "20px",
        padding: "25px",
        borderRadius: "12px"
      }}>
        <h2>Management Structure</h2>
        <p>1. Boss</p>
        <p>2. Super Admin</p>
        <p>3. Admin</p>
        <p>4. Staff</p>
      </section>

      <button
        onClick={logout}
        style={{
          marginTop: "25px",
          padding: "13px 30px",
          background: "#102b50",
          color: "white",
          border: "none",
          borderRadius: "7px",
          cursor: "pointer"
        }}
      >
        Logout
      </button>
    </main>
  );
}
