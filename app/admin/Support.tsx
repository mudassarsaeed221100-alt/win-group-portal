
"use client";

import { useState } from "react";

type Ticket = {
  id: number;
  subject: string;
  message: string;
  category: string;
  status: string;
  date: string;
};

export default function Support() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("Account Issue");
  const [notice, setNotice] = useState("");

  function submitTicket() {
    if (!subject.trim() || !message.trim()) {
      setNotice("Subject aur message dono likhein.");
      return;
    }

    const ticket: Ticket = {
      id: Date.now(),
      subject: subject.trim(),
      message: message.trim(),
      category,
      status: "Pending",
      date: new Date().toLocaleString(),
    };

    setTickets((previous) => [ticket, ...previous]);
    setSubject("");
    setMessage("");
    setCategory("Account Issue");
    setNotice("Support request add ho gayi hai.");
  }

  return (
    <div style={{ color: "#172033", width: "100%" }}>
      <h1 style={{ fontSize: 25, marginBottom: 6 }}>Support & Help</h1>
      <p style={{ color: "#64748b", marginBottom: 22 }}>
        Apna masla Founder ko report karein aur requests ka status dekhein.
      </p>

      {notice && (
        <div style={{
          background: "#eff6ff",
          padding: 12,
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 14
        }}>
          {notice}
        </div>
      )}

      <div style={{
        background: "white",
        border: "1px solid #e2e8f0",
        borderRadius: 12,
        padding: 20,
        marginBottom: 22
      }}>
        <h2 style={{ fontSize: 18, marginTop: 0 }}>New Support Request</h2>

        <label>Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={inputStyle}
        >
          <option>Account Issue</option>
          <option>Staff Management</option>
          <option>Task Issue</option>
          <option>Earnings Issue</option>
          <option>Technical Problem</option>
          <option>Other</option>
        </select>

        <label style={labelStyle}>Subject</label>
        <input
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="Maslay ka title likhein"
          style={inputStyle}
        />

        <label style={labelStyle}>Message</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Apna masla detail mein likhein..."
          rows={5}
          style={{ ...inputStyle, resize: "vertical" }}
        />

        <button onClick={submitTicket} style={buttonStyle}>
          Submit Request
        </button>
      </div>

      <h2 style={{ fontSize: 18 }}>My Support Requests</h2>

      {tickets.length === 0 ? (
        <div style={{
          background: "white",
          border: "1px dashed #cbd5e1",
          borderRadius: 12,
          padding: 35,
          textAlign: "center",
          color: "#64748b"
        }}>
          Abhi koi support request nahi hai.
        </div>
      ) : (
        tickets.map((ticket) => (
          <div key={ticket.id} style={{
            background: "white",
            border: "1px solid #e2e8f0",
            borderRadius: 10,
            padding: 17,
            marginBottom: 10
          }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              gap: 10,
              flexWrap: "wrap"
            }}>
              <strong>{ticket.subject}</strong>
              <span style={{ fontSize: 12, color: "#b45309" }}>
                {ticket.status}
              </span>
            </div>
            <p style={{ color: "#64748b", fontSize: 13 }}>
              {ticket.message}
            </p>
            <small style={{ color: "#94a3b8" }}>
              {ticket.category} · {ticket.date}
            </small>
          </div>
        ))
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: 12,
  border: "1px solid #dbe2ea",
  borderRadius: 8,
  marginTop: 7,
  marginBottom: 14,
  boxSizing: "border-box",
  fontSize: 14,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginTop: 5,
};

const buttonStyle: React.CSSProperties = {
  background: "#172554",
  color: "white",
  border: "none",
  borderRadius: 8,
  padding: "12px 18px",
  cursor: "pointer",
};
