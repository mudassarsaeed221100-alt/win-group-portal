"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setLoading(false);
      setError("Email ya password ghalat hai.");
      return;
    }

    // Role ke hisaab se sahi page par bhejna
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    setLoading(false);

    if (profile && ["super_admin", "admin"].includes(profile.role)) {
      router.push("/super-admin");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#edf1f7", display: "grid", placeItems: "center", fontFamily: "Arial", padding: "20px" }}>
      <form onSubmit={handleLogin} style={{ background: "white", padding: "40px", borderRadius: "14px", width: "100%", maxWidth: "390px", boxShadow: "0 8px 30px #0001" }}>
        <h1 style={{ color: "#102b50", textAlign: "center" }}>WIN GROUP</h1>
        <p style={{ textAlign: "center", color: "#64748b" }}>Business Management Portal</p>

        <h2 style={{ color: "#102b50", marginTop: "30px" }}>Secure Login</h2>

        <label>Email Address</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: "12px", margin: "8px 0 18px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />

        <label>Password</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: "12px", margin: "8px 0 18px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />

        {error && <p style={{ color: "red" }}>{error}</p>}

        <button type="submit" disabled={loading}
          style={{ width: "100%", padding: "14px", background: "#102b50", color: "white", border: "none", borderRadius: "7px", cursor: "pointer" }}>
          {loading ? "Logging in..." : "Login"}
        </button>

        <p style={{ textAlign: "center", color: "#64748b", fontSize: "12px" }}>Authorized users only</p>
      </form>
    </main>
  );
}
