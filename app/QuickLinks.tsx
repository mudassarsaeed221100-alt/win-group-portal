"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../lib/supabase";

export default function QuickLinks() {
  const path = usePathname();
  const [role, setRole] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    async function check() {
      const { data } = await supabase.auth.getSession();
      const uid = data.session?.user?.id;
      if (!uid) return setRole("");
      const { data: p } = await supabase.from("profiles").select("role").eq("id", uid).single();
      setRole(p?.role || "");
    }
    check();
    const { data: sub } = supabase.auth.onAuthStateChange(() => check());
    return () => sub.subscription.unsubscribe();
  }, [path]);

  const hidden = ["/", "/join", "/invite", "/payment-verification"];
  if (!role || hidden.includes(path || "")) return null;

  const item: React.CSSProperties = {
    display: "block", padding: "11px 16px", background: "#111", color: "#eee",
    border: "1px solid #333", borderRadius: 10, textDecoration: "none",
    fontSize: 14, fontWeight: 600, marginBottom: 8, whiteSpace: "nowrap",
  };

  return (
    <div style={{ position: "fixed", right: 18, bottom: 18, zIndex: 9999, textAlign: "right" }}>
      {open && (
        <div style={{ marginBottom: 8 }}>
          <a href="/invite" style={item}>🔗 Invite Link</a>
                    {role === "super_admin" && (
            <a href="/super-admin/my-earnings" style={item}>💵 My Earnings</a>
          )}
                   {role === "founder_owner" && (
            <>
              <a href="/payment-verification" style={item}>💳 Payment Verification</a>
              <a href="/founder-support" style={item}>🆘 Support (Help / Complaint)</a>
              <a href="/commission-report" style={item}>💰 Commission Report</a>
            </>
          )}
        </div>
      )}
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: 56, height: 56, borderRadius: "50%", background: "#fff", color: "#000",
          border: "none", fontSize: 24, cursor: "pointer", boxShadow: "0 4px 14px rgba(0,0,0,.5)",
        }}
      >
        {open ? "✕" : "➕"}
      </button>
    </div>
  );
}
