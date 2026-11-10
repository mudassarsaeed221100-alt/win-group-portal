
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Earning = {
  id: string;
  submission_id: string;
  amount: number;
  payment_status: string;
  paid_at: string | null;
  created_at: string;
};

export default function MyEarnings() {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadEarnings() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!active) return;

      if (userError || !user) {
        setError("User session nahi mili. Dobara login karein.");
        setLoading(false);
        return;
      }

      const { data, error: queryError } = await supabase
        .from("earnings_ledger")
        .select("id, submission_id, amount, payment_status, paid_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!active) return;

      if (queryError) {
        setError(queryError.message);
        setEarnings([]);
      } else {
        setEarnings((data || []) as Earning[]);
      }

      setLoading(false);
    }

    loadEarnings();

    return () => {
      active = false;
    };
  }, []);

  const totalEarnings = earnings.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const paidEarnings = earnings
    .filter((item) => item.payment_status === "paid")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const unpaidEarnings = earnings
    .filter((item) => item.payment_status === "unpaid")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  function formatAmount(amount: number) {
    return `Rs. ${Number(amount).toLocaleString("en-PK")}`;
  }

  function formatDate(date: string | null) {
    if (!date) return "Not paid yet";

    return new Date(date).toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function statusStyle(status: string): React.CSSProperties {
    if (status === "paid") {
      return {
        color: "#a8e6bf",
        background: "#1c3027",
        border: "1px solid #315b43",
      };
    }

    return {
      color: "#f5d28a",
      background: "#302a1e",
      border: "1px solid #5c4b2d",
    };
  }

  return (
    <div style={styles.container}>
      <div style={styles.smallTitle}>STAFF WORKSPACE</div>

      <h2 style={styles.heading}>My Earnings</h2>

      <p style={styles.muted}>
        Apni approved earnings aur payment history yahan check karein.
      </p>

      {loading ? (
        <div style={styles.message}>Earnings load ho rahi hain...</div>
      ) : error ? (
        <div style={styles.error}>{error}</div>
      ) : (
        <>
          <div style={styles.summaryGrid}>
            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Total Earnings</div>
              <div style={styles.amount}>
                {formatAmount(totalEarnings)}
              </div>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Paid Earnings</div>
              <div style={styles.amount}>
                {formatAmount(paidEarnings)}
              </div>
            </div>

            <div style={styles.summaryCard}>
              <div style={styles.summaryLabel}>Unpaid Earnings</div>
              <div style={styles.amount}>
                {formatAmount(unpaidEarnings)}
              </div>
            </div>
          </div>

          <div style={styles.historySection}>
            <h3 style={styles.historyHeading}>Payment History</h3>

            {earnings.length === 0 ? (
              <div style={styles.message}>
                <strong>No Earnings Yet</strong>
                <p style={styles.muted}>
                  Abhi aapke account mein koi earning record available nahi hai.
                  Approved work ki earning yahan show hogi.
                </p>
              </div>
            ) : (
              <div style={styles.tableWrapper}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Amount</th>
                      <th style={styles.th}>Status</th>
                      <th style={styles.th}>Paid Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {earnings.map((item) => (
                      <tr key={item.id}>
                        <td style={styles.td}>
                          {formatDate(item.created_at)}
                        </td>

                        <td style={styles.td}>
                          {formatAmount(Number(item.amount))}
                        </td>

                        <td style={styles.td}>
                          <span
                            style={{
                              ...styles.status,
                              ...statusStyle(item.payment_status),
                            }}
                          >
                            {item.payment_status}
                          </span>
                        </td>

                        <td style={styles.td}>
                          {formatDate(item.paid_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    background: "#17191d",
    border: "1px solid #30343b",
    borderRadius: "14px",
    padding: "28px",
    color: "#f1f3f5",
  },
  smallTitle: {
    fontSize: "13px",
    color: "#aeb4bd",
  },
  heading: {
    fontSize: "24px",
    margin: "10px 0",
  },
  muted: {
    color: "#aeb4bd",
    fontSize: "14px",
    lineHeight: 1.7,
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: "14px",
    marginTop: "24px",
  },
  summaryCard: {
    padding: "20px",
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: "10px",
    minWidth: 0,
  },
  summaryLabel: {
    color: "#aeb4bd",
    fontSize: "13px",
    marginBottom: "12px",
  },
  amount: {
    fontSize: "21px",
    fontWeight: 700,
    overflowWrap: "anywhere",
  },
  historySection: {
    marginTop: "30px",
  },
  historyHeading: {
    fontSize: "18px",
    marginBottom: "16px",
  },
  message: {
    marginTop: "16px",
    padding: "20px",
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: "10px",
    color: "#f1f3f5",
  },
  error: {
    marginTop: "20px",
    padding: "16px",
    background: "#2b2022",
    border: "1px solid #63383d",
    borderRadius: "10px",
    color: "#ffb4b4",
  },
  tableWrapper: {
    width: "100%",
    overflowX: "auto",
    border: "1px solid #3a414b",
    borderRadius: "10px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "570px",
    textAlign: "left",
  },
  th: {
    padding: "14px",
    background: "#22262d",
    color: "#aeb4bd",
    fontSize: "13px",
    borderBottom: "1px solid #3a414b",
  },
  td: {
    padding: "14px",
    fontSize: "13px",
    borderBottom: "1px solid #30343b",
  },
  status: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: "6px",
    fontSize: "12px",
    fontWeight: 600,
    textTransform: "capitalize",
  },
};

"use client";

export default function MyEarnings() {
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
        My Earnings
      </h2>

      <p style={{ color: "#aeb4bd", lineHeight: 1.7 }}>
        Yahan staff apni verified earnings, payment history
        aur payment status dekh sakega.
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
          Earnings Integration Pending
        </div>

        <p style={{ color: "#aeb4bd", fontSize: "14px", lineHeight: 1.7 }}>
          Real earnings data connect hone ke baad yahan
          payment details show hongi. Filhal koi earning
          amount display nahi ki ja rahi.
        </p>
      </div>
    </div>
  );
}
