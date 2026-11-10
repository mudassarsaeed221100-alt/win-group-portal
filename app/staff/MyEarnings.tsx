
"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "../../lib/supabase";

type Earning = {
  id: string;
  amount: number;
  payment_status: string;
  withdrawn_amount: number | null;
  created_at: string;
  paid_at: string | null;
};

type Withdrawal = {
  id: string;
  amount: number;
  payment_method: string;
  account_title: string;
  account_number: string;
  status: string;
  admin_note: string | null;
  created_at: string;
  paid_at: string | null;
};

const styles: Record<string, CSSProperties> = {
  container: {
    color: "#f1f3f5",
    width: "100%",
  },
  smallTitle: {
    color: "#aeb4bd",
    fontSize: 12,
    letterSpacing: 1,
    marginBottom: 8,
  },
  heading: {
    fontSize: 26,
    margin: "0 0 8px",
  },
  muted: {
    color: "#aeb4bd",
    fontSize: 14,
    lineHeight: 1.6,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
    gap: 12,
    marginTop: 22,
  },
  card: {
    background: "#202329",
    border: "1px solid #343943",
    borderRadius: 12,
    padding: 18,
  },
  cardLabel: {
    color: "#aeb4bd",
    fontSize: 13,
    marginBottom: 10,
  },
  amount: {
    fontSize: 23,
    fontWeight: 700,
    overflowWrap: "anywhere",
  },
  section: {
    background: "#202329",
    border: "1px solid #343943",
    borderRadius: 12,
    padding: 18,
    marginTop: 20,
  },
  sectionHeading: {
    fontSize: 18,
    margin: "0 0 15px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    background: "#17191d",
    border: "1px solid #414752",
    color: "#fff",
    borderRadius: 8,
    padding: "12px",
    marginTop: 6,
    marginBottom: 14,
    fontSize: 15,
  },
  button: {
    background: "#3478f6",
    border: 0,
    color: "#fff",
    padding: "13px 18px",
    borderRadius: 8,
    fontWeight: 700,
    cursor: "pointer",
    width: "100%",
    fontSize: 15,
  },
  message: {
    background: "#17191d",
    borderRadius: 8,
    padding: 14,
    color: "#c5cbd3",
    fontSize: 14,
    marginTop: 12,
  },
  error: {
    background: "#3a2024",
    border: "1px solid #754047",
    color: "#ffb8bf",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  success: {
    background: "#1c3027",
    border: "1px solid #315b43",
    color: "#a8e6bf",
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  tableWrap: {
    width: "100%",
    overflowX: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: 620,
    fontSize: 13,
  },
  th: {
    textAlign: "left",
    padding: 11,
    color: "#aeb4bd",
    borderBottom: "1px solid #414752",
    whiteSpace: "nowrap",
  },
  td: {
    padding: 11,
    borderBottom: "1px solid #343943",
    whiteSpace: "nowrap",
  },
  status: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: 20,
    background: "#302a1e",
    color: "#f5d28a",
    fontSize: 12,
    textTransform: "capitalize",
  },
};

function money(value: number) {
  return `Rs. ${Number(value || 0).toLocaleString("en-PK", {
    maximumFractionDigits: 2,
  })}`;
}

function pakistanDateKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Karachi",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const get = (type: string) =>
    parts.find((part) => part.type === type)?.value || "";

  return `${get("year")}-${get("month")}-${get("day")}`;
}

function pakistanDateStart(key: string) {
  return new Date(`${key}T00:00:00+05:00`).getTime();
}

function getWeekStart(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayOfWeek = date.getUTCDay();
  const difference = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

  date.setUTCDate(date.getUTCDate() - difference);

  return date.toISOString().slice(0, 10);
}

function formatDate(value: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("en-PK", {
    timeZone: "Asia/Karachi",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function MyEarnings() {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("EasyPaisa");
  const [accountTitle, setAccountTitle] = useState("");
  const [accountNumber, setAccountNumber] = useState("");

  async function loadData() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("User session nahi mili. Dobara login karein.");
      setLoading(false);
      return;
    }

    const [earningResult, withdrawalResult] = await Promise.all([
      supabase
        .from("earnings_ledger")
        .select(
          "id, amount, payment_status, withdrawn_amount, created_at, paid_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("withdrawal_requests")
        .select(
          "id, amount, payment_method, account_title, account_number, status, admin_note, created_at, paid_at"
        )
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (earningResult.error) {
      setError(earningResult.error.message);
      setLoading(false);
      return;
    }

    if (withdrawalResult.error) {
      setError(withdrawalResult.error.message);
      setLoading(false);
      return;
    }

    setEarnings((earningResult.data || []) as Earning[]);
    setWithdrawals((withdrawalResult.data || []) as Withdrawal[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const totalLifetime = earnings.reduce(
    (sum, item) => sum + Number(item.amount || 0),
    0
  );

  const paidEarnings = earnings.reduce((sum, item) => {
    const withdrawn = Number(item.withdrawn_amount || 0);

    if (item.payment_status === "paid" && withdrawn === 0) {
      return sum + Number(item.amount || 0);
    }

    return sum + withdrawn;
  }, 0);

  const reservedWithdrawals = withdrawals
    .filter((item) => ["pending", "approved"].includes(item.status))
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const unpaidBalance = earnings
    .filter((item) => item.payment_status !== "paid")
    .reduce(
      (sum, item) =>
        sum +
        Math.max(
          0,
          Number(item.amount || 0) - Number(item.withdrawn_amount || 0)
        ),
      0
    );

  const availableBalance = Math.max(
    0,
    unpaidBalance - reservedWithdrawals
  );

  const pendingWithdrawal = withdrawals
    .filter((item) => item.status === "pending")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const todayKey = pakistanDateKey(new Date());
  const todayStart = pakistanDateStart(todayKey);
  const tomorrowStart = todayStart + 24 * 60 * 60 * 1000;

  const weekStart = pakistanDateStart(getWeekStart(todayKey));
  const monthStart = pakistanDateStart(`${todayKey.slice(0, 7)}-01`);

  function earningsBetween(start: number, end: number) {
    return earnings
      .filter((item) => {
        const created = new Date(item.created_at).getTime();
        return created >= start && created < end;
      })
      .reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }

  const todayEarnings = earningsBetween(todayStart, tomorrowStart);
  const weeklyEarnings = earningsBetween(weekStart, tomorrowStart);
  const monthlyEarnings = earningsBetween(monthStart, tomorrowStart);

  async function requestWithdrawal() {
    setError("");
    setSuccess("");

    const requestedAmount = Number(amount);

    if (!Number.isFinite(requestedAmount) || requestedAmount < 999) {
      setError("Minimum withdrawal Rs. 999 hai.");
      return;
    }

    if (requestedAmount > availableBalance) {
      setError("Aapka available balance itna nahi hai.");
      return;
    }

    if (!accountTitle.trim() || !accountNumber.trim()) {
      setError("Account title aur account number dono zaroori hain.");
      return;
    }

    setSubmitting(true);

    const { error: requestError } = await supabase.rpc(
      "request_staff_withdrawal",
      {
        p_amount: requestedAmount,
        p_payment_method: method,
        p_account_title: accountTitle.trim(),
        p_account_number: accountNumber.trim(),
      }
    );

    setSubmitting(false);

    if (requestError) {
      setError(requestError.message);
      return;
    }

    setSuccess("Withdrawal request successfully submit ho gayi hai.");
    setAmount("");
    await loadData();
  }

  if (loading) {
    return <div style={styles.message}>Earnings load ho rahi hain...</div>;
  }

  return (
    <div style={styles.container}>
      <div style={styles.smallTitle}>STAFF WORKSPACE</div>
      <h2 style={styles.heading}>My Earnings</h2>
      <p style={styles.muted}>
        Apni approved earnings, available balance aur withdrawal history check karein.
      </p>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.grid}>
        <div style={styles.card}>
          <div style={styles.cardLabel}>Total Lifetime Earnings</div>
          <div style={styles.amount}>{money(totalLifetime)}</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Available Balance</div>
          <div style={styles.amount}>{money(availableBalance)}</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Pending Withdrawal</div>
          <div style={styles.amount}>{money(pendingWithdrawal)}</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Paid Earnings</div>
          <div style={styles.amount}>{money(paidEarnings)}</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>Today's Earnings</div>
          <div style={styles.amount}>{money(todayEarnings)}</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>This Week's Earnings</div>
          <div style={styles.amount}>{money(weeklyEarnings)}</div>
        </div>

        <div style={styles.card}>
          <div style={styles.cardLabel}>This Month's Earnings</div>
          <div style={styles.amount}>{money(monthlyEarnings)}</div>
        </div>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionHeading}>Request Withdrawal</h3>
        <p style={styles.muted}>
          Minimum withdrawal Rs. 999 hai. Request Founder/Admin review karega.
        </p>

        <label>Withdrawal Amount (PKR)</label>
        <input
          style={styles.input}
          type="number"
          min="999"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <label>Payment Method</label>
        <select
          style={styles.input}
          value={method}
          onChange={(e) => setMethod(e.target.value)}
        >
          <option value="EasyPaisa">EasyPaisa</option>
          <option value="JazzCash">JazzCash</option>
          <option value="Bank">Bank</option>
        </select>

        <label>Account Title</label>
        <input
          style={styles.input}
          type="text"
          placeholder="Account holder name"
          value={accountTitle}
          onChange={(e) => setAccountTitle(e.target.value)}
        />

        <label>Account Number / IBAN</label>
        <input
          style={styles.input}
          type="text"
          placeholder="Enter account number"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
        />

        <button
          style={{
            ...styles.button,
            opacity: submitting ? 0.6 : 1,
          }}
          disabled={submitting}
          onClick={requestWithdrawal}
        >
          {submitting ? "Submitting..." : "Request Withdrawal"}
        </button>
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionHeading}>Earnings History</h3>

        {earnings.length === 0 ? (
          <div style={styles.message}>Abhi koi approved earning available nahi hai.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Date</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Withdrawn</th>
                  <th style={styles.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {earnings.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>{formatDate(item.created_at)}</td>
                    <td style={styles.td}>{money(Number(item.amount))}</td>
                    <td style={styles.td}>
                      {money(Number(item.withdrawn_amount || 0))}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.status}>{item.payment_status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h3 style={styles.sectionHeading}>Withdrawal History</h3>

        {withdrawals.length === 0 ? (
          <div style={styles.message}>Abhi koi withdrawal request nahi ki gayi.</div>
        ) : (
          <div style={styles.tableWrap}>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Request Date</th>
                  <th style={styles.th}>Amount</th>
                  <th style={styles.th}>Method</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Paid Date</th>
                  <th style={styles.th}>Admin Note</th>
                </tr>
              </thead>
              <tbody>
                {withdrawals.map((item) => (
                  <tr key={item.id}>
                    <td style={styles.td}>{formatDate(item.created_at)}</td>
                    <td style={styles.td}>{money(Number(item.amount))}</td>
                    <td style={styles.td}>{item.payment_method}</td>
                    <td style={styles.td}>
                      <span style={styles.status}>{item.status}</span>
                    </td>
                    <td style={styles.td}>{formatDate(item.paid_at)}</td>
                    <td style={styles.td}>{item.admin_note || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
