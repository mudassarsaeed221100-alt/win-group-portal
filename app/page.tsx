"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });
    if (error || !data.user) {
      setLoading(false);
      return setMsg("❌ Email ya password galat hai");
    }

    const { data: p } = await supabase
      .from("profiles")
      .select("role, account_status")
      .eq("id", data.user.id)
      .single();

    if (!p) {
      await supabase.auth.signOut();
      setLoading(false);
      return setMsg("❌ Profile nahi mili, Founder se rabta karein");
    }

    if (p.account_status === "pending" || p.account_status === "rejected") {
      await supabase.auth.signOut();
      setLoading(false);
      return setMsg(
        p.account_status === "pending"
          ? "⏳ Aap ka account abhi approve nahi hua"
          : "❌ Aap ka account reject ho gaya hai"
      );
    }

    if (p.role === "founder_owner") router.push("/dashboard");
    else if (p.role === "super_admin" || p.role === "admin") router.push("/super-admin");
    else router.push("/staff");
  }

  const input: React.CSSProperties = {
    width: "100%", padding: "12px 14px", background: "#0a0a0a", border: "1px solid #333",
    borderRadius: 10, color: "#fff", fontSize: 15, marginBottom: 12, boxSizing: "border-box",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form onSubmit={login} style={{ width: "100%", maxWidth: 400, background: "#111", border: "1px solid #2a2a2a", borderRadius: 16, padding: 28, color: "#eee" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <img
            src="https://eubrfvhinrubkmgwmdaf.supabase.co/storage/v1/object/public/avatars/download.jpeg"
            alt="WIN GROUP"
            style={{ width: 70, height: 70, borderRadius: "50%", objectFit: "cover", marginBottom: 10 }}
          />
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: 1 }}>◆ WIN GROUP</h1>
          <p style={{ color: "#888", fontSize: 13, marginTop: 4 }}>Wolf Independent National Group</p>
        </div>

        <input style={input} type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />

        <div style={{ position: "relative" }}>
          <input style={{ ...input, paddingRight: 90 }} type={show ? "text" : "password"} placeholder="Password" value={pass} onChange={(e) => setPass(e.target.value)} required />
          <span onClick={() => setShow(!show)} style={{ position: "absolute", right: 12, top: 12, cursor: "pointer", color: "#aaa", fontSize: 13 }}>
            {show ? "🙈 Hide" : "👁️ Show"}
          </span>
        </div>

        {msg && <p style={{ color: "#f87171", fontSize: 14, marginBottom: 12 }}>{msg}</p>}

        <button type="submit" disabled={loading} style={{ width: "100%", padding: 13, background: "#fff", color: "#000", border: "none", borderRadius: 10, fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
          {loading ? "Login ho raha hai..." : "Login"}
        </button>
      </form>
    </div>
  );
}
