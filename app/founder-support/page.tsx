"use client";
import SupportChat from "../SupportChat";

export default function FounderSupport() {
  return (
    <div style={{ minHeight: "100vh", background: "#000", padding: 20 }}>
      <div style={{ maxWidth: 1000, margin: "0 auto" }}>
        <a href="/dashboard" style={{ color: "#888", fontSize: 13, display: "block", marginBottom: 12 }}>← Founder Dashboard</a>
        <SupportChat />
      </div>
    </div>
  );
}
