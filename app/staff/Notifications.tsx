
"use client";

export default function Notifications() {
  return (
    <div
      style={{
        background: "#17191d",
        border: "1px solid #30343b",
        borderRadius: "14px",
        padding: "28px",
        color: "#f1f3f5",
      }}
    >
      <div style={{ fontSize: "13px", color: "#aeb4bd" }}>
        STAFF WORKSPACE
      </div>

      <h2 style={{ fontSize: "24px", margin: "10px 0" }}>
        Notifications
      </h2>

      <p style={{ color: "#aeb4bd", lineHeight: 1.7 }}>
        Yahan staff ko company announcements, important
        updates aur account notifications milengi.
      </p>

      <div
        style={{
          marginTop: "24px",
          padding: "20px",
          borderRadius: "10px",
          background: "#22262d",
          border: "1px solid #3a414b",
        }}
      >
        <div style={{ fontSize: "15px", fontWeight: 600 }}>
          Notifications Integration Pending
        </div>

        <p style={{ color: "#aeb4bd", fontSize: "14px", lineHeight: 1.7 }}>
          Notifications database connect hone ke baad
          real company updates yahan show hongi.
        </p>
      </div>
    </div>
  );
}
