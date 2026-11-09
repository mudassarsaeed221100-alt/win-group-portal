
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Earning = {
  id: string;
  submission_id: string;
  user_id: string;
  amount: number;
  payment_status: "unpaid" | "paid";
  paid_by: string | null;
  paid_at: string | null;
  created_at: string;
};

export default function EarningsLedger() {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    loadEarnings();
  }, []);

  async function loadEarnings() {
    setLoading(true);

    const { data, error } = await supabase
      .from("earnings_ledger")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setNotice("Earnings load nahi huin: " + error.message);
    } else {
      setEarnings(data || []);
    }

    setLoading(false);
  }

  async function markPayment(item: Earning) {
    if (item.payment_status === "paid") {
      setNotice("Ye payment pehle hi paid mark ho chuki hai.");
      return;
    }

    const confirmed = window.confirm(
      `Kya Rs. ${Number(item.amount).toLocaleString()} ki payment complete ho chuki hai?`
    );

    if (!confirmed) return;

    setProcessingId(item.id);
    setNotice("");

    const { data: sessionData } = await supabase.auth.getSession();
    const user = sessionData.session?.user;

    if (!user) {
      setNotice("Session expire ho gaya. Dobara login karein.");
      setProcessingId(null);
      return;
    }

    const { error } = await supabase
      .from("earnings_ledger")
      .update({
        payment_status: "paid",
        paid_by: user.id,
        paid_at: new Date().toISOString(),
      })
      .eq("id", item.id)
      .eq("payment_status", "unpaid");

    if (error) {
      setNotice("Payment update nahi hui: " + error.message);
    } else {
      setNotice("Payment successfully Paid mark ho gayi.");
      await loadEarnings();
    }

    setProcessingId(null);
  }

  const filteredEarnings = earnings.filter((item) => {
    if (filter === "paid") return item.payment_status === "paid";
    if (filter === "unpaid") return item.payment_status === "unpaid";
    return true;
  });

  const totalApproved = earnings.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const totalPaid = earnings
    .filter((item) => item.payment_status === "paid")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalUnpaid = earnings
    .filter((item) => item.payment_status === "unpaid")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const cardStyle = {
    background: "#1b1b1b",
    border: "1px solid #333",
    borderRadius: "10px",
    padding: "17px",
  };

  return (
    <div style={{ color: "white", width: "100%" }}>
      <h2 style={{ fontSize: "24px" }}>Staff Earnings Ledger</h2>

      <p style={{ color: "#aaa" }}>
        Approved work ki earning aur payment records yahan manage karein.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))",
          gap: "12px",
          margin: "22px 0",
        }}
      >
        <div style={cardStyle}>
          <p style={{ color: "#aaa", margin: 0 }}>Total Approved Earnings</p>
          <h3>Rs. {totalApproved.toLocaleString()}</h3>
        </div>

        <div style={cardStyle}>
          <p style={{ color: "#aaa", margin: 0 }}>Total Paid</p>
          <h3 style={{ color: "#75d69b" }}>
            Rs. {totalPaid.toLocaleString()}
          </h3>
        </div>

        <div style={cardStyle}>
          <p style={{ color: "#aaa", margin: 0 }}>Total Unpaid</p>
          <h3 style={{ color: "#f0bd65" }}>
            Rs. {totalUnpaid.toLocaleString()}
          </h3>
        </div>

        <div style={cardStyle}>
          <p style={{ color: "#aaa", margin: 0 }}>Total Records</p>
          <h3>{earnings.length}</h3>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "12px",
          flexWrap: "wrap",
          alignItems: "center",
          marginBottom: "18px",
        }}
      >
        <h3>Payment History</h3>

        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{
              padding: "10px",
              borderRadius: "7px",
              background: "#202020",
              color: "white",
              border: "1px solid #444",
            }}
          >
            <option value="all">All Payments</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>

          <button
            onClick={loadEarnings}
            style={{
              padding: "10px 15px",
              background: "#2563eb",
              color: "white",
              border: "none",
              borderRadius: "7px",
              cursor: "pointer",
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      {notice && (
        <p style={{ color: "#9bd5a5", marginBottom: "15px" }}>{notice}</p>
      )}

      {loading ? (
        <p style={{ color: "#aaa" }}>Loading earnings...</p>
      ) : filteredEarnings.length === 0 ? (
        <div style={cardStyle}>
          <p style={{ color: "#aaa" }}>
            Is filter mein abhi koi earning record nahi hai.
          </p>
        </div>
      ) : (
        <div
          style={{
            overflowX: "auto",
            background: "#171717",
            border: "1px solid #333",
            borderRadius: "10px",
          }}
        >
          <table
            style={{
              width: "100%",
              minWidth: "760px",
              borderCollapse: "collapse",
              textAlign: "left",
            }}
          >
            <thead>
              <tr style={{ background: "#252525" }}>
                {[
                  "User ID",
                  "Amount",
                  "Payment Status",
                  "Created Date",
                  "Paid Date",
                  "Action",
                ].map((heading) => (
                  <th
                    key={heading}
                    style={{
                      padding: "13px",
                      borderBottom: "1px solid #444",
                    }}
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {filteredEarnings.map((item) => (
                <tr key={item.id}>
                  <td style={{ padding: "13px", borderBottom: "1px solid #333" }}>
                    <span style={{ fontSize: "12px" }}>{item.user_id}</span>
                  </td>

                  <td style={{ padding: "13px", borderBottom: "1px solid #333" }}>
                    Rs. {Number(item.amount).toLocaleString()}
                  </td>

                  <td style={{ padding: "13px", borderBottom: "1px solid #333" }}>
                    <span
                      style={{
                        color:
                          item.payment_status === "paid"
                            ? "#75d69b"
                            : "#f0bd65",
                      }}
                    >
                      {item.payment_status.toUpperCase()}
                    </span>
                  </td>

                  <td style={{ padding: "13px", borderBottom: "1px solid #333" }}>
                    {new Date(item.created_at).toLocaleDateString()}
                  </td>

                  <td style={{ padding: "13px", borderBottom: "1px solid #333" }}>
                    {item.paid_at
                      ? new Date(item.paid_at).toLocaleDateString()
                      : "—"}
                  </td>

                  <td style={{ padding: "13px", borderBottom: "1px solid #333" }}>
                    {item.payment_status === "unpaid" ? (
                      <button
                        disabled={processingId === item.id}
                        onClick={() => markPayment(item)}
                        style={{
                          padding: "8px 12px",
                          background: "#16834b",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        {processingId === item.id ? "Updating..." : "Mark Paid"}
                      </button>
                    ) : (
                      <span style={{ color: "#75d69b" }}>Completed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
