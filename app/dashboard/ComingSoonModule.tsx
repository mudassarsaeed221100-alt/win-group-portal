"use client";

type Props = {
  label: string;
  title: string;
  subtitle: string;
  notice: string;
  features: { title: string; description: string }[];
  steps?: string[];
};

export default function ComingSoonModule({ label, title, subtitle, notice, features, steps }: Props) {
  const box: React.CSSProperties = { background: "linear-gradient(145deg,#202020,#171717)", border: "1px solid #383838", borderRadius: 9, padding: 18 };

  return (
    <div style={{ color: "#e9e9e9", marginTop: 22, fontFamily: "Arial, sans-serif" }}>
      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <div>
          <div style={{ color: "#888", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>{label}</div>
          <h2 style={{ margin: 0, fontSize: 21, color: "#fff" }}>{title}</h2>
          <p style={{ margin: "6px 0 0", color: "#999", fontSize: 12 }}>{subtitle}</p>
        </div>
        <span style={{ alignSelf: "flex-start", padding: "7px 14px", borderRadius: 20, border: "1px solid #a16207", color: "#fbbf24", fontSize: 11, fontWeight: 700 }}>
          ⏸ Currently Inactive
        </span>
      </div>

      <div style={{ ...box, borderColor: "#a16207", marginBottom: 16 }}>
        <b style={{ color: "#fbbf24", fontSize: 14 }}>🔒 Abhi activate nahi hai</b>
        <p style={{ color: "#bbb", fontSize: 12, lineHeight: 1.7, margin: "8px 0 0" }}>{notice}</p>
      </div>

      <div style={{ color: "#888", fontSize: 10, letterSpacing: 2, margin: "6px 0 10px" }}>PLANNED FEATURES</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 12, marginBottom: 16 }}>
        {features.map((f, i) => (
          <div key={f.title} style={{ ...box, display: "flex", gap: 12 }}>
            <div style={{ width: 32, height: 32, flexShrink: 0, display: "grid", placeItems: "center", border: "1px solid #505050", borderRadius: 7, color: "#ddd", fontWeight: 700 }}>{i + 1}</div>
            <div>
              <b style={{ color: "#fff", fontSize: 13 }}>{f.title}</b>
              <p style={{ color: "#999", fontSize: 12, lineHeight: 1.6, margin: "5px 0 8px" }}>{f.description}</p>
              <span style={{ fontSize: 10, color: "#aaa", border: "1px solid #444", padding: "3px 9px", borderRadius: 20 }}>Planned</span>
            </div>
          </div>
        ))}
      </div>

      {steps && (
        <div style={box}>
          <b style={{ color: "#fff", fontSize: 14 }}>Workflow</b>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 12 }}>
            {steps.map((s, i) => (
              <span key={s} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: "#1b1b1b", border: "1px solid #333", padding: "7px 12px", borderRadius: 7, fontSize: 12 }}>{s}</span>
                {i < steps.length - 1 && <span style={{ color: "#666" }}>→</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      <p style={{ color: "#666", fontSize: 11, marginTop: 14 }}>◆ Is system ko activate karne ka ikhtiyar sirf Founder / Owner ke paas hai.</p>
    </div>
  );
}
