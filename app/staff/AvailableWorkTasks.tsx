
"use client";

export default function AvailableWorkTasks() {
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
        Available Work Tasks
      </h2>

      <p style={{ color: "#aeb4bd", lineHeight: 1.7 }}>
        Yahan aapko company ki taraf se available work tasks
        nazar aayenge.
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
          Task System Currently Inactive
        </div>

        <p style={{ color: "#aeb4bd", fontSize: "14px", lineHeight: 1.7 }}>
          Work tasks ka system company ke 2,000–3,000 members
          hone ke baad activate kiya jayega.
        </p>

        <span
          style={{
            display: "inline-block",
            marginTop: "8px",
            padding: "7px 12px",
            borderRadius: "20px",
            background: "#39332a",
            color: "#e5bd78",
            fontSize: "12px",
          }}
        >
          Not Active Yet
        </span>
      </div>
    </div>
  );
}
