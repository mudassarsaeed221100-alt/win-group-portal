"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
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

  const input = { width: "100%", padding: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", boxSizing: "border-box" as const };

  return (
    <main style={{ minHeight: "100vh", background: "#edf1f7", display: "grid", placeItems: "center", fontFamily: "Arial", padding: "20px" }}>
      <form onSubmit={handleLogin} style={{ background: "white", padding: "40px", borderRadius: "14px", width: "100%", maxWidth: "390px", boxShadow: "0 8px 30px #0001" }}>
        <h1 style={{ color: "#102b50", textAlign: "center" }}>WIN GROUP</h1>
        <p style={{ textAlign: "center", color: "#64748b" }}>Business Management Portal</p>
        <h2 style={{ color: "#102b50", marginTop: "30px" }}>Secure Login</h2>

        <label>Email Address</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          style={{ ...input, margin: "8px 0 18px" }} />

        <label>Password</label>
        <div style={{ position: "relative", margin: "8px 0 18px" }}>
          <input type={show ? "text" : "password"} required value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ ...input, paddingRight: "70px" }} />
          <button type="button" onClick={() => setShow(!show)}
            style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#102b50", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}>
            {show ? "🙈 Hide" : "👁️ Show"}
          </button>
        </div>

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
