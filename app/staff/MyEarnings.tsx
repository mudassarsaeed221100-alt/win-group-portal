
"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "../../lib/supabase";

/* ───────── Types ───────── */

type EarningRecord = {
  id: string;
  amount: number;
  payment_status: string;
  withdrawn_amount: number;
  created_at: string;
  submission_id: string | null;
  task_title?: string;
};

type WithdrawalRecord = {
  id: string;
  amount: number;
  status: string;
  payment_method: string;
  account_title: string;
  account_number: string;
  admin_note: string | null;
  created_at: string;
};

type SummaryData = {
  totalEarnings: number;
  paidEarnings: number;
  unpaidEarnings: number;
  reservedAmount: number;
  availableBalance: number;
  todayEarnings: number;
  weekEarnings: number;
  monthEarnings: number;
};

const emptySummary: SummaryData = {
  totalEarnings: 0,
  paidEarnings: 0,
  unpaidEarnings: 0,
  reservedAmount: 0,
  availableBalance: 0,
  todayEarnings: 0,
  weekEarnings: 0,
  monthEarnings: 0,
};

/* ───────── Component ───────── */

export default function MyEarnings() {
  const [summary, setSummary] = useState<SummaryData>(emptySummary);
  const [earnings, setEarnings] = useState<EarningRecord[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* Withdrawal Form */
  const [wAmount, setWAmount] = useState("");
  const [wMethod, setWMethod] = useState("easypaisa");
  const [wTitle, setWTitle] = useState("");
  const [wAccount, setWAccount] = useState("");
  const [wSubmitting, setWSubmitting] = useState(false);
  const [wMessage, setWMessage] = useState("");
  const [wMessageType, setWMessageType] = useState<"success" | "error">("success");
  const [showConfirm, setShowConfirm] = useState(false);

  /* ── Pakistan Time Helpers ── */
  function getPakistanNow(): Date {
    return new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" })
    );
  }

  function getPakistanStartOfDay(): Date {
    const now = getPakistanNow();
    now.setHours(0, 0, 0, 0);
    return now;
  }

  function getPakistanStartOfWeek(): Date {
    const now = getPakistanNow();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1;
    now.setDate(now.getDate() - diff);
    now.setHours(0, 0, 0, 0);
    return now;
  }

  function getPakistanStartOfMonth(): Date {
    const now = getPakistanNow();
    now.setDate(1);
    now.setHours(0, 0, 0, 0);
    return now;
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-PK", {
      timeZone: "Asia/Karachi",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function formatDateTime(date: string) {
    return new Date(date).toLocaleDateString("en-PK", {
      timeZone: "Asia/Karachi",
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function money(val: number) {
    return `Rs. ${val.toLocaleString("en-PK")}`;
  }

  /* ── Load All Data ── */
  async function loadData() {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setError("Session nahi mili. Dobara login karein.");
      setLoading(false);
      return;
    }

    const [earningsResult, withdrawalsResult] = await Promise.all([
      supabase
        .from("earnings_ledger")
        .select("id, amount, payment_status, withdrawn_amount, created_at, submission_id")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("withdrawal_requests")
        .select("id, amount, status, payment_method, account_title, account_number, admin_note, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (earningsResult.error) {
      setError("Earnings load nahi ho sake: " + earningsResult.error.message);
      setLoading(false);
      return;
    }

    const earningsData = (earningsResult.data || []) as EarningRecord[];
    const withdrawalsData = (withdrawalsResult.data || []) as WithdrawalRecord[];

    /* FIX #1: Fetch task titles for earnings */
    const submissionIds = earningsData
      .map((e) => e.submission_id)
      .filter(Boolean) as string[];

    if (submissionIds.length > 0) {
      const { data: subs } = await supabase
        .from("work_submissions")
        .select("id, task_id")
        .in("id", submissionIds);

      if (subs && subs.length > 0) {
        const taskIds = [...new Set(subs.map((s) => s.task_id))];
        const { data: tasks } = await supabase
          .from("work_tasks")
          .select("id, title")
          .in("id", taskIds);

        const taskMap = new Map((tasks || []).map((t) => [t.id, t.title]));
        const subTaskMap = new Map(
          subs.map((s) => [s.id, taskMap.get(s.task_id) || "Unknown Task"])
        );

        earningsData.forEach((e) => {
          if (e.submission_id) {
            e.task_title = subTaskMap.get(e.submission_id) || "—";
          }
        });
      }
    }

    /* Calculate Summary */
    const startOfDay = getPakistanStartOfDay();
    const startOfWeek = getPakistanStartOfWeek();
    const startOfMonth = getPakistanStartOfMonth();

    let totalEarnings = 0;
    let paidEarnings = 0;
    let unpaidEarnings = 0;
    let todayEarnings = 0;
    let weekEarnings = 0;
    let monthEarnings = 0;

    earningsData.forEach((e) => {
      const amt = Number(e.amount || 0);
      const withdrawn = Number(e.withdrawn_amount || 0);
      totalEarnings += amt;

      if (e.payment_status === "paid") {
        paidEarnings += amt;
      } else {
        unpaidEarnings += Math.max(0, amt - withdrawn);
      }

      const created = new Date(
        new Date(e.created_at).toLocaleString("en-US", {
          timeZone: "Asia/Karachi",
        })
      );

      if (created >= startOfDay) todayEarnings += amt;
      if (created >= startOfWeek) weekEarnings += amt;
      if (created >= startOfMonth) monthEarnings += amt;
    });

    const reservedAmount = withdrawalsData
      .filter((w) => w.status === "pending" || w.status === "approved")
      .reduce((sum, w) => sum + Number(w.amount || 0), 0);

    const availableBalance = Math.max(0, unpaidEarnings - reservedAmount);

    setSummary({
      totalEarnings,
      paidEarnings,
      unpaidEarnings,
      reservedAmount,
      availableBalance,
      todayEarnings,
      weekEarnings,
      monthEarnings,
    });

    setEarnings(earningsData);
    setWithdrawals(withdrawalsData);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  /* ── Withdrawal Submit ── */
  async function handleWithdrawal() {
    setWMessage("");
    const amount = Number(wAmount);

    if (!amount || amount < 999) {
      setWMessageType("error");
      setWMessage("Minimum withdrawal amount Rs. 999 hai.");
      return;
    }

    if (amount > summary.availableBalance) {
      setWMessageType("error");
      setWMessage(
        `Available balance Rs. ${summary.availableBalance.toLocaleString("en-PK")} hai. Itna amount withdraw nahi ho sakta.`
      );
      return;
    }

    if (!wTitle.trim()) {
      setWMessageType("error");
      setWMessage("Account title likhna zaroori hai.");
      return;
    }

    if (!wAccount.trim()) {
      setWMessageType("error");
      setWMessage("Account number likhna zaroori hai.");
      return;
    }

    /* FIX #5: Show confirmation */
    if (!showConfirm) {
      setShowConfirm(true);
      return;
    }

    setShowConfirm(false);
    setWSubmitting(true);

    try {
      const { error } = await supabase.rpc("request_staff_withdrawal", {
        p_amount: amount,
        p_payment_method: wMethod,
        p_account_title: wTitle.trim(),
        p_account_number: wAccount.trim(),
      });

      if (error) throw new Error(error.message);

      setWMessageType("success");
      setWMessage(
        `Rs. ${amount.toLocaleString("en-PK")} withdrawal request submit ho gayi. Review pending hai.`
      );
      setWAmount("");
      setWTitle("");
      setWAccount("");

      await loadData();
    } catch (err) {
      setWMessageType("error");
      setWMessage(
        err instanceof Error ? err.message : "Withdrawal request mein error aaya."
      );
    } finally {
      setWSubmitting(false);
    }
  }

  /* ── Status Badge Helper ── */
  function getStatusBadge(status: string, type: "earning" | "withdrawal") {
    const map: Record<string, { bg: string; color: string; border: string; label: string }> = {
      /* Earnings */
      unpaid: { bg: "#302a1e", color: "#f5d28a", border: "#6b5c2e", label: "⏳ Unpaid" },
      paid: { bg: "#1c3027", color: "#a8e6bf", border: "#315b43", label: "✅ Paid" },
      /* Withdrawals */
      pending: { bg: "#302a1e", color: "#f5d28a", border: "#6b5c2e", label: "⏳ Pending" },
      approved: { bg: "#1e2a3a", color: "#93c5fd", border: "#2e4a6a", label: "✅ Approved" },
      completed: { bg: "#1c3027", color: "#a8e6bf", border: "#315b43", label: "💰 Paid" },
      rejected: { bg: "#3a2024", color: "#ffb8bf", border: "#754047", label: "❌ Rejected" },
    };

    const s = map[status] || map.pending;
    return s;
  }

  /* ── Progress Bar Percentage ── */
  function progressPercent(value: number, total: number) {
    if (total === 0) return 0;
    return Math.min(100, Math.round((value / total) * 100));
  }

  /* ───────── Render ───────── */

  if (loading) {
    return (
      <div style={styles.card}>
        <div style={styles.smallTitle}>STAFF WORKSPACE</div>
        <h2 style={styles.heading}>My Earnings</h2>
        <div style={styles.infoBox}>Earnings data load ho raha hai...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={styles.card}>
        <div style={styles.smallTitle}>STAFF WORKSPACE</div>
        <h2 style={styles.heading}>My Earnings</h2>
        <div style={styles.errorBox}>
          {error}
          <button type="button" onClick={loadData} style={styles.retryBtn}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.card}>
      <div style={styles.smallTitle}>STAFF WORKSPACE</div>
      <div style={styles.headerRow}>
        <h2 style={styles.heading}>My Earnings</h2>
        {/* FIX #6: Refresh Button */}
        <button type="button" onClick={loadData} style={styles.refreshBtn}>
          Refresh
        </button>
      </div>
      <p style={styles.muted}>
        Aapki earnings, balance aur withdrawal requests ka complete record.
      </p>

      {/* ── Summary Cards ── */}
      <div style={styles.grid}>
        <div style={styles.summaryCard}>
          <span style={styles.cardLabel}>Total Lifetime</span>
          <strong style={styles.cardValue}>{money(summary.totalEarnings)}</strong>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.cardLabel}>Available Balance</span>
          <strong style={{ ...styles.cardValue, color: "#6ee7a0" }}>
            {money(summary.availableBalance)}
          </strong>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.cardLabel}>Reserved</span>
          <strong style={{ ...styles.cardValue, color: "#f5d28a" }}>
            {money(summary.reservedAmount)}
          </strong>
        </div>
        <div style={styles.summaryCard}>
          <span style={styles.cardLabel}>Paid Out</span>
          <strong style={{ ...styles.cardValue, color: "#93c5fd" }}>
            {money(summary.paidEarnings)}
          </strong>
        </div>
      </div>

      {/* ── FIX #10: Earnings Progress Bar ── */}
      {summary.totalEarnings > 0 && (
        <div style={styles.progressSection}>
          <div style={styles.progressBar}>
            <div
              style={{
                ...styles.progressFill,
                width: `${progressPercent(summary.paidEarnings, summary.totalEarnings)}%`,
                background: "#93c5fd",
                borderRadius: summary.unpaidEarnings > 0 ? "6px 0 0 6px" : "6px",
              }}
            />
            <div
              style={{
                ...styles.progressFill,
                width: `${progressPercent(summary.reservedAmount, summary.totalEarnings)}%`,
                background: "#f5d28a",
              }}
            />
            <div
              style={{
                ...styles.progressFill,
                width: `${progressPercent(summary.availableBalance, summary.totalEarnings)}%`,
                background: "#6ee7a0",
                borderRadius: "0 6px 6px 0",
              }}
            />
          </div>
          <div style={styles.progressLabels}>
            <span style={{ color: "#93c5fd" }}>Paid {progressPercent(summary.paidEarnings, summary.totalEarnings)}%</span>
            <span style={{ color: "#f5d28a" }}>Reserved {progressPercent(summary.reservedAmount, summary.totalEarnings)}%</span>
            <span style={{ color: "#6ee7a0" }}>Available {progressPercent(summary.availableBalance, summary.totalEarnings)}%</span>
          </div>
        </div>
      )}

      {/* ── Time-Based Earnings ── */}
      <div style={styles.grid}>
        <div style={styles.timeCard}>
          <span style={styles.cardLabel}>Today</span>
          <strong style={styles.timeValue}>{money(summary.todayEarnings)}</strong>
        </div>
        <div style={styles.timeCard}>
          <span style={styles.cardLabel}>This Week</span>
          <strong style={styles.timeValue}>{money(summary.weekEarnings)}</strong>
        </div>
        <div style={styles.timeCard}>
          <span style={styles.cardLabel}>This Month</span>
          <strong style={styles.timeValue}>{money(summary.monthEarnings)}</strong>
        </div>
      </div>

      {/* ── Withdrawal Request Form ── */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Request Withdrawal</h3>
        <p style={styles.muted}>
          Minimum withdrawal: Rs. 999 | Available: {money(summary.availableBalance)}
        </p>

        <div style={styles.formGrid}>
          <div>
            <label style={styles.label}>Amount (Rs.)</label>
            <div style={styles.amountRow}>
              <input
                type="number"
                value={wAmount}
                onChange={(e) => { setWAmount(e.target.value); setShowConfirm(false); }}
                placeholder="e.g. 1000"
                min={999}
                style={styles.input}
                disabled={wSubmitting}
              />
              {/* FIX #4: Withdraw All Button */}
              {summary.availableBalance >= 999 && (
                <button
                  type="button"
                  onClick={() => { setWAmount(String(summary.availableBalance)); setShowConfirm(false); }}
                  style={styles.withdrawAllBtn}
                  disabled={wSubmitting}
                >
                  Withdraw All
                </button>
              )}
            </div>
          </div>

          <div>
            <label style={styles.label}>Payment Method</label>
            <select
              value={wMethod}
              onChange={(e) => { setWMethod(e.target.value); setShowConfirm(false); }}
              style={styles.select}
              disabled={wSubmitting}
            >
              <option value="easypaisa">EasyPaisa</option>
              <option value="jazzcash">JazzCash</option>
              <option value="bank">Bank Transfer</option>
            </select>
          </div>

          <div>
            <label style={styles.label}>Account Title</label>
            <input
              type="text"
              value={wTitle}
              onChange={(e) => { setWTitle(e.target.value); setShowConfirm(false); }}
              placeholder="Account holder name"
              style={styles.input}
              disabled={wSubmitting}
            />
          </div>

          <div>
            <label style={styles.label}>Account Number</label>
            <input
              type="text"
              value={wAccount}
              onChange={(e) => { setWAccount(e.target.value); setShowConfirm(false); }}
              placeholder="Account / mobile number"
              style={styles.input}
              disabled={wSubmitting}
            />
          </div>
        </div>

        {/* FIX #5: Confirmation Dialog */}
        {showConfirm && (
          <div style={styles.confirmBox}>
            <strong>Confirm Withdrawal</strong>
            <p style={{ margin: "8px 0", fontSize: 14 }}>
              Kya aap {money(Number(wAmount))} withdraw karna chahte hain via{" "}
              {wMethod.toUpperCase()} ({wAccount})?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={handleWithdrawal}
                style={styles.confirmYes}
                disabled={wSubmitting}
              >
                {wSubmitting ? "Processing..." : "Haan, Withdraw Karein"}
              </button>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                style={styles.confirmNo}
                disabled={wSubmitting}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {wMessage && (
          <div
            style={{
              ...styles.msgBox,
              ...(wMessageType === "success" ? styles.successMsg : styles.errorMsg),
            }}
          >
            {wMessage}
          </div>
        )}

        {!showConfirm && (
          <button
            type="button"
            onClick={handleWithdrawal}
            disabled={wSubmitting}
            style={{
              ...styles.submitBtn,
              opacity: wSubmitting ? 0.6 : 1,
              cursor: wSubmitting ? "not-allowed" : "pointer",
            }}
          >
            {wSubmitting ? "Processing..." : "Submit Withdrawal Request"}
          </button>
        )}
      </div>

      {/* ── Earnings History ── */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Earnings History</h3>

        {earnings.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 28 }}>💰</div>
            <p>Abhi koi earning record nahi hai.</p>
            <p style={{ fontSize: 12, color: "#858995" }}>
              Tasks complete karein aur approval ke baad earnings yahan dikhein gi.
            </p>
          </div>
        ) : (
          <div style={styles.historyList}>
            {earnings.map((e) => {
              const badge = getStatusBadge(e.payment_status, "earning");
              return (
                <div key={e.id} style={styles.historyItem}>
                  <div style={styles.historyHeader}>
                    <div>
                      {/* FIX #1: Task title */}
                      <strong style={{ fontSize: 14 }}>
                        {e.task_title || "Earning"}
                      </strong>
                      <div style={{ fontSize: 12, color: "#858995", marginTop: 4 }}>
                        {formatDate(e.created_at)}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 700 }}>
                        {money(Number(e.amount))}
                      </div>
                      {/* FIX #3: Earning status color */}
                      <span
                        style={{
                          display: "inline-block",
                          marginTop: 4,
                          padding: "3px 9px",
                          borderRadius: 16,
                          fontSize: 11,
                          fontWeight: 600,
                          background: badge.bg,
                          color: badge.color,
                          border: `1px solid ${badge.border}`,
                        }}
                      >
                        {badge.label}
                      </span>
                    </div>
                  </div>
                  {Number(e.withdrawn_amount) > 0 && (
                    <div style={{ fontSize: 12, color: "#858995", marginTop: 6 }}>
                      Withdrawn: {money(Number(e.withdrawn_amount))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Withdrawal History ── */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>Withdrawal History</h3>

        {withdrawals.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={{ fontSize: 28 }}>🏦</div>
            <p>Abhi koi withdrawal request nahi ki gayi.</p>
            <p style={{ fontSize: 12, color: "#858995" }}>
              Available balance hone par upar se withdrawal request karein.
            </p>
          </div>
        ) : (
          <div style={styles.historyList}>
            {withdrawals.map((w) => {
              const badge = getStatusBadge(w.status, "withdrawal");
              return (
                <div key={w.id} style={styles.historyItem}>
                  <div style={styles.historyHeader}>
                    <div>
                      <strong style={{ fontSize: 14 }}>
                        {money(Number(w.amount))}
                      </strong>
                      <div style={{ fontSize: 12, color: "#858995", marginTop: 4 }}>
                        {formatDateTime(w.created_at)}
                      </div>
                    </div>
                    {/* FIX #2: Withdrawal status color */}
                    <span
                      style={{
                        display: "inline-block",
                        padding: "3px 9px",
                        borderRadius: 16,
                        fontSize: 11,
                        fontWeight: 600,
                        background: badge.bg,
                        color: badge.color,
                        border: `1px solid ${badge.border}`,
                      }}
                    >
                      {badge.label}
                    </span>
                  </div>

                  <div style={styles.withdrawalMeta}>
                    <span>{w.payment_method.toUpperCase()}</span>
                    <span>{w.account_title}</span>
                    <span>{w.account_number}</span>
                  </div>

                  {/* FIX #8: Admin note highlight */}
                  {w.admin_note && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "8px 12px",
                        borderRadius: 6,
                        fontSize: 13,
                        lineHeight: 1.5,
                        background: w.status === "rejected" ? "#3a2024" : "#1e2a3a",
                        border: `1px solid ${w.status === "rejected" ? "#754047" : "#2e4a6a"}`,
                        color: w.status === "rejected" ? "#ffb8bf" : "#93c5fd",
                      }}
                    >
                      <strong>Admin Note:</strong> {w.admin_note}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p style={styles.footer}>WIN GROUP Earnings Management System</p>
    </div>
  );
}

/* ───────── Styles ───────── */

const styles: Record<string, CSSProperties> = {
  card: {
    background: "#17191d",
    border: "1px solid #30343b",
    borderRadius: 14,
    padding: 28,
    color: "#f1f3f5",
  },
  smallTitle: {
    fontSize: 13,
    color: "#aeb4bd",
    letterSpacing: 1,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  heading: {
    fontSize: 24,
    margin: "10px 0",
  },
  refreshBtn: {
    padding: "8px 14px",
    border: "1px solid #59616d",
    borderRadius: 7,
    background: "#22262d",
    color: "#f1f3f5",
    cursor: "pointer",
    fontSize: 13,
  },
  muted: {
    color: "#aeb4bd",
    fontSize: 14,
    lineHeight: 1.7,
  },
  infoBox: {
    marginTop: 20,
    padding: 18,
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: 10,
    color: "#aeb4bd",
    fontSize: 14,
  },
  errorBox: {
    marginTop: 20,
    padding: 18,
    background: "#3a2024",
    border: "1px solid #754047",
    borderRadius: 10,
    color: "#ffb8bf",
    fontSize: 14,
  },
  retryBtn: {
    display: "block",
    marginTop: 12,
    padding: "9px 16px",
    border: "none",
    borderRadius: 7,
    background: "#e5e7eb",
    color: "#17191d",
    fontWeight: 600,
    cursor: "pointer",
  },

  /* Summary Cards */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
    marginTop: 18,
  },
  summaryCard: {
    padding: 18,
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  cardLabel: {
    fontSize: 12,
    color: "#858995",
  },
  cardValue: {
    fontSize: 20,
    color: "#ffffff",
  },
  timeCard: {
    padding: 14,
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: 10,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  timeValue: {
    fontSize: 17,
    color: "#e0e1e5",
  },

  /* Progress Bar */
  progressSection: {
    marginTop: 16,
  },
  progressBar: {
    display: "flex",
    height: 12,
    borderRadius: 6,
    background: "#2a2d35",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    transition: "width 0.3s ease",
  },
  progressLabels: {
    display: "flex",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
    fontSize: 11,
  },

  /* Section */
  section: {
    marginTop: 28,
    padding: 22,
    background: "#1b1d24",
    border: "1px solid #3a414b",
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    margin: "0 0 8px",
  },

  /* Form */
  formGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 14,
    marginTop: 14,
  },
  label: {
    display: "block",
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 6,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: 11,
    background: "#22262d",
    color: "#f1f3f5",
    border: "1px solid #3a414b",
    borderRadius: 7,
    outline: "none",
    fontSize: 14,
  },
  select: {
    width: "100%",
    boxSizing: "border-box",
    padding: 11,
    background: "#22262d",
    color: "#f1f3f5",
    border: "1px solid #3a414b",
    borderRadius: 7,
    outline: "none",
    fontSize: 14,
  },
  amountRow: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  withdrawAllBtn: {
    padding: "11px 14px",
    border: "1px solid #6ee7a0",
    borderRadius: 7,
    background: "transparent",
    color: "#6ee7a0",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 600,
    whiteSpace: "nowrap",
  },
  submitBtn: {
    width: "100%",
    marginTop: 18,
    padding: 13,
    border: "none",
    borderRadius: 8,
    background: "#e5e7eb",
    color: "#17191d",
    fontWeight: 700,
    fontSize: 14,
    cursor: "pointer",
  },

  /* Confirmation */
  confirmBox: {
    marginTop: 16,
    padding: 16,
    background: "#302a1e",
    border: "1px solid #6b5c2e",
    borderRadius: 10,
    color: "#f5d28a",
  },
  confirmYes: {
    padding: "10px 18px",
    border: "none",
    borderRadius: 7,
    background: "#6ee7a0",
    color: "#111217",
    fontWeight: 700,
    cursor: "pointer",
    fontSize: 13,
  },
  confirmNo: {
    padding: "10px 18px",
    border: "1px solid #59616d",
    borderRadius: 7,
    background: "transparent",
    color: "#f1f3f5",
    cursor: "pointer",
    fontSize: 13,
  },

  /* Messages */
  msgBox: {
    padding: 13,
    borderRadius: 8,
    marginTop: 14,
    fontSize: 14,
    lineHeight: 1.6,
  },
  successMsg: {
    background: "#1c3027",
    border: "1px solid #315b43",
    color: "#a8e6bf",
  },
  errorMsg: {
    background: "#2b2022",
    border: "1px solid #63383d",
    color: "#ffb4b4",
  },

  /* History */
  historyList: {
    marginTop: 14,
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },
  historyItem: {
    padding: 16,
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: 10,
  },
  historyHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 10,
  },
  withdrawalMeta: {
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 8,
    fontSize: 12,
    color: "#858995",
  },
  emptyState: {
    marginTop: 14,
    padding: 24,
    background: "#22262d",
    border: "1px solid #3a414b",
    borderRadius: 10,
    textAlign: "center",
    color: "#aeb4bd",
    fontSize: 14,
  },

  footer: {
    textAlign: "center",
    color: "#777b87",
    fontSize: 11,
    marginTop: 25,
  },
};

