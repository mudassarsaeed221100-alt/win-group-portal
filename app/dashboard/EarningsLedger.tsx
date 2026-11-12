
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

type UserProfile = {
  id: string;
  username: string;
  first_name: string | null;
  surname: string | null;
  role: string;
};

type WithdrawalRequest = {
  id: string;
  user_id: string;
  amount: number;
  status: "pending" | "approved" | "rejected" | "completed";
  requested_at: string;
  approved_at: string | null;
  completed_at: string | null;
  notes: string | null;
};

export default function EarningsLedger() {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [users, setUsers] = useState<Map<string, UserProfile>>(new Map());

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");

  // Filters
  const [earningFilter, setEarningFilter] = useState("all");
  const [withdrawalFilter, setWithdrawalFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // Pagination
  const [earningPage, setEarningPage] = useState(1);
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const itemsPerPage = 10;

  // Modal
  const [selectedEarning, setSelectedEarning] = useState<Earning | null>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);

  /* ── Load Data ── */
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        showNotice("Login session nahi mili.", "error");
        return;
      }

      // Check if user is founder
      const { data: founder, error: founderError } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", authData.user.id)
        .single();

      if (founderError || founder?.role !== "founder_owner") {
        showNotice("Sirf Founder is module ko access kar sakta hai.", "error");
        return;
      }

      // Load earnings
      const { data: earningsData, error: earningsError } = await supabase
        .from("earnings_ledger")
        .select("*")
        .order("created_at", { ascending: false });

      if (earningsError) throw earningsError;

      setEarnings((earningsData || []) as Earning[]);

      // Load withdrawals
      const { data: withdrawalsData, error: withdrawalsError } = await supabase
        .from("withdrawal_requests")
        .select("*")
        .order("requested_at", { ascending: false });

      if (withdrawalsError) throw withdrawalsError;

      setWithdrawals((withdrawalsData || []) as WithdrawalRequest[]);

      // Load user profiles
      const userIds = Array.from(
        new Set([
          ...((earningsData || []).map((e) => e.user_id)),
          ...((withdrawalsData || []).map((w) => w.user_id)),
        ].filter(Boolean))
      ) as string[];

      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, username, first_name, surname, role")
          .in("id", userIds);

        const userMap = new Map<string, UserProfile>();
        (profilesData || []).forEach((profile) => {
          userMap.set(profile.id, profile);
        });
        setUsers(userMap);
      }
    } catch (err: any) {
      showNotice(err.message || "Failed to load data", "error");
    }
  }

  /* ── Refresh Data ── */
  async function refreshData() {
    setRefreshing(true);
    try {
      await loadData();
      showNotice("Data successfully refresh ho gaya.", "success");
    } catch (err: any) {
      showNotice(err.message || "Refresh nahi hua", "error");
    }
    setRefreshing(false);
  }

  /* ── Show Notice ── */
  function showNotice(msg: string, type: "success" | "error" = "success") {
    setNotice(msg);
    setNoticeType(type);
    setTimeout(() => setNotice(""), 4000);
  }

  /* ── Get User Name ── */
  function getUserName(userId: string | null) {
    if (!userId) return "Unknown";
    const user = users.get(userId);
    if (user) {
      return user.first_name && user.surname
        ? `${user.first_name} ${user.surname}`
        : user.username;
    }
    return userId.slice(0, 8);
  }

  /* ── Mark Payment ── */
  async function markPayment(earningId: string) {
    const earning = earnings.find((e) => e.id === earningId);
    if (!earning) return;

    if (earning.payment_status === "paid") {
      showNotice("Ye payment pehle hi paid mark ho chuki hai.", "error");
      return;
    }

    if (!window.confirm(`Kya Rs. ${Number(earning.amount).toLocaleString()} ki payment complete ho chuki hai?`)) {
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) throw new Error("Session expire ho gaya.");

      const { error } = await supabase
        .from("earnings_ledger")
        .update({
          payment_status: "paid",
          paid_by: user.id,
          paid_at: new Date().toISOString(),
        })
        .eq("id", earningId)
        .eq("payment_status", "unpaid");

      if (error) throw error;

      showNotice("Payment successfully marked as paid.", "success");
      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Payment update nahi hua", "error");
    }

    setLoading(false);
  }

  /* ── Approve Withdrawal ── */
  async function approveWithdrawal(withdrawalId: string) {
    const withdrawal = withdrawals.find((w) => w.id === withdrawalId);
    if (!withdrawal) return;

    if (!window.confirm(`Kya aap Rs. ${Number(withdrawal.amount).toLocaleString()} withdrawal approve karna chahte hain?`)) {
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) throw new Error("Session expire ho gaya.");

      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", withdrawalId);

      if (error) throw error;

      showNotice("Withdrawal successfully approved.", "success");
      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Withdrawal approve nahi hua", "error");
    }

    setLoading(false);
  }

  /* ── Reject Withdrawal ── */
  async function rejectWithdrawal(withdrawalId: string) {
    const withdrawal = withdrawals.find((w) => w.id === withdrawalId);
    if (!withdrawal) return;

    if (!window.confirm(`Kya aap is withdrawal ko reject karna chahte hain?`)) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({ status: "rejected" })
        .eq("id", withdrawalId);

      if (error) throw error;

      showNotice("Withdrawal successfully rejected.", "success");
      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Withdrawal reject nahi hua", "error");
    }

    setLoading(false);
  }

  /* ── Complete Withdrawal ── */
  async function completeWithdrawal(withdrawalId: string) {
    const withdrawal = withdrawals.find((w) => w.id === withdrawalId);
    if (!withdrawal) return;

    if (!window.confirm(`Kya aap is withdrawal ko completed mark karna chahte hain?`)) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("withdrawal_requests")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", withdrawalId);

      if (error) throw error;

      showNotice("Withdrawal successfully completed.", "success");
      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Withdrawal complete nahi hua", "error");
    }

    setLoading(false);
  }

  /* ── Export to CSV ── */
  function exportEarningsCSV() {
    const headers = ["User", "Amount", "Status", "Created Date", "Paid Date"];
    const rows = filteredEarnings.map((e) => [
      getUserName(e.user_id),
      e.amount,
      e.payment_status,
      new Date(e.created_at).toLocaleDateString("en-PK"),
      e.paid_at ? new Date(e.paid_at).toLocaleDateString("en-PK") : "—",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `earnings-ledger-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  /* ── Filter Earnings ── */
  const filteredEarnings = earnings.filter((e) => {
    if (earningFilter !== "all" && e.payment_status !== earningFilter) return false;

    const userName = getUserName(e.user_id).toLowerCase();
    if (userSearch && !userName.includes(userSearch.toLowerCase())) return false;

    if (dateFrom && new Date(e.created_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(e.created_at) > new Date(dateTo)) return false;

    return true;
  });

  /* ── Filter Withdrawals ── */
  const filteredWithdrawals = withdrawals.filter((w) => {
    if (withdrawalFilter !== "all" && w.status !== withdrawalFilter) return false;

    const userName = getUserName(w.user_id).toLowerCase();
    if (userSearch && !userName.includes(userSearch.toLowerCase())) return false;

    if (dateFrom && new Date(w.requested_at) < new Date(dateFrom)) return false;
    if (dateTo && new Date(w.requested_at) > new Date(dateTo)) return false;

    return true;
  });

  /* ── Pagination ── */
  const earningTotalPages = Math.ceil(filteredEarnings.length / itemsPerPage);
  const paginatedEarnings = filteredEarnings.slice(
    (earningPage - 1) * itemsPerPage,
    earningPage * itemsPerPage
  );

  const withdrawalTotalPages = Math.ceil(filteredWithdrawals.length / itemsPerPage);
  const paginatedWithdrawals = filteredWithdrawals.slice(
    (withdrawalPage - 1) * itemsPerPage,
    withdrawalPage * itemsPerPage
  );

  /* ── Stats ── */
  const stats = {
    totalEarnings: earnings.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    totalPaid: earnings
      .filter((e) => e.payment_status === "paid")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0),
    totalUnpaid: earnings
      .filter((e) => e.payment_status === "unpaid")
      .reduce((sum, e) => sum + Number(e.amount || 0), 0),
    totalWithdrawalRequests: withdrawals.length,
    pendingWithdrawals: withdrawals.filter((w) => w.status === "pending").length,
    approvedWithdrawals: withdrawals.filter((w) => w.status === "approved").length,
    completedWithdrawals: withdrawals.filter((w) => w.status === "completed").length,
    totalWithdrawalAmount: withdrawals
      .filter((w) => w.status === "completed")
      .reduce((sum, w) => sum + Number(w.amount || 0), 0),
  };

  return (
    <div style={{ padding: "20px", color: "#e9e9e9" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "start", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>
              EARNINGS LEDGER
            </div>
            <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Staff Earnings Ledger</h2>
            <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "12px" }}>
              Approved work ki earning aur payment records ka complete management.
            </p>
          </div>

          <button
            onClick={refreshData}
            disabled={refreshing}
            style={{
              padding: "10px 16px",
              background: refreshing ? "#444" : "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: refreshing ? "not-allowed" : "pointer",
              fontWeight: "bold",
              fontSize: "12px",
              opacity: refreshing ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {refreshing ? "🔄 Refreshing..." : "🔄 Refresh"}
          </button>
        </div>

        {/* ── Stats Cards ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
          {[
            { label: "Total Earnings", value: `Rs. ${stats.totalEarnings.toLocaleString()}`, color: "#3b82f6" },
            { label: "Total Paid", value: `Rs. ${stats.totalPaid.toLocaleString()}`, color: "#10b981" },
            { label: "Total Unpaid", value: `Rs. ${stats.totalUnpaid.toLocaleString()}`, color: "#f59e0b" },
            { label: "Pending Withdrawals", value: stats.pendingWithdrawals, color: "#f59e0b" },
            { label: "Completed Withdrawals", value: `Rs. ${stats.totalWithdrawalAmount.toLocaleString()}`, color: "#10b981" },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "#1a1a1a",
                border: "1px solid #333",
                borderRadius: "8px",
                padding: "12px",
              }}
            >
              <div style={{ fontSize: "11px", color: "#888" }}>{stat.label}</div>
              <div style={{ fontSize: "14px", fontWeight: "bold", color: stat.color, marginTop: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Messages ── */}
      {notice && (
        <div
          style={{
            padding: "12px 16px",
            background: noticeType === "success" ? "#064e3b" : "#7f1d1d",
            color: noticeType === "success" ? "#86efac" : "#fca5a5",
            borderRadius: "6px",
            marginBottom: "16px",
            fontSize: "12px",
          }}
        >
          {noticeType === "success" ? "✓" : "✕"} {notice}
        </div>
      )}

      {/* ── Earnings Ledger Section ── */}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "6px" }}>
              EARNINGS RECORDS
            </div>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Payment History ({filteredEarnings.length})</h3>
          </div>

          <button
            onClick={exportEarningsCSV}
            style={{
              padding: "10px 16px",
              background: "#10b981",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "12px",
            }}
          >
            📥 Export CSV
          </button>
        </div>

        {/* ── Filters ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <input
            type="text"
            placeholder="Search by user..."
            value={userSearch}
            onChange={(e) => {
              setUserSearch(e.target.value);
              setEarningPage(1);
            }}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          />

          <select
            value={earningFilter}
            onChange={(e) => {
              setEarningFilter(e.target.value);
              setEarningPage(1);
            }}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          >
            <option value="all">All Status</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>

          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setEarningPage(1);
            }}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          />

          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setEarningPage(1);
            }}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          />

          <button
            onClick={() => {
              setUserSearch("");
              setEarningFilter("all");
              setDateFrom("");
              setDateTo("");
              setEarningPage(1);
            }}
            style={{
              padding: "8px 12px",
              background: "#444",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Clear
          </button>
        </div>

        {/* ── Earnings Table ── */}
        {paginatedEarnings.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
            Koi earning record nahi mila.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #333", background: "#252525" }}>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>User</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Amount</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Status</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Created</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Paid Date</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedEarnings.map((earning) => (
                  <tr key={earning.id} style={{ borderBottom: "1px solid #333" }}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ color: "#fff", fontWeight: "bold" }}>
                        {getUserName(earning.user_id)}
                      </div>
                    </td>

                    <td style={{ padding: "12px", color: "#fff", fontWeight: "bold" }}>
                      Rs. {Number(earning.amount).toLocaleString()}
                    </td>

                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          background: earning.payment_status === "paid" ? "#10b98120" : "#f59e0b20",
                          color: earning.payment_status === "paid" ? "#86efac" : "#fbbf24",
                        }}
                      >
                        {earning.payment_status.toUpperCase()}
                      </span>
                    </td>

                    <td style={{ padding: "12px", color: "#aaa", fontSize: "11px" }}>
                      {new Date(earning.created_at).toLocaleDateString("en-PK")}
                    </td>

                    <td style={{ padding: "12px", color: "#aaa", fontSize: "11px" }}>
                      {earning.paid_at
                        ? new Date(earning.paid_at).toLocaleDateString("en-PK")
                        : "—"}
                    </td>

                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {earning.payment_status === "unpaid" ? (
                          <button
                            onClick={() => markPayment(earning.id)}
                            disabled={loading}
                            style={{
                              padding: "6px 10px",
                              background: "#064e3b",
                              color: "#86efac",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "11px",
                              fontWeight: "bold",
                              opacity: loading ? 0.6 : 1,
                            }}
                          >
                            ✓ Mark Paid
                          </button>
                        ) : (
                          <span style={{ color: "#10b981", fontSize: "11px", fontWeight: "bold" }}>
                            ✓ Completed
                          </span>
                        )}

                        <button
                          onClick={() => setSelectedEarning(earning)}
                          style={{
                            padding: "6px 10px",
                            background: "#444",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: "bold",
                          }}
                        >
                          👁️ View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {earningTotalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", marginTop: "16px" }}>
            <button
              onClick={() => setEarningPage(Math.max(1, earningPage - 1))}
              disabled={earningPage === 1}
              style={{
                padding: "6px 10px",
                background: earningPage === 1 ? "#333" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: earningPage === 1 ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              ← Prev
            </button>

            {Array.from({ length: earningTotalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setEarningPage(p)}
                style={{
                  padding: "6px 10px",
                  background: earningPage === p ? "#2563eb" : "#333",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: earningPage === p ? "bold" : "normal",
                }}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setEarningPage(Math.min(earningTotalPages, earningPage + 1))}
              disabled={earningPage === earningTotalPages}
              style={{
                padding: "6px 10px",
                background: earningPage === earningTotalPages ? "#333" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: earningPage === earningTotalPages ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              Next →
            </button>

            <span style={{ color: "#888", fontSize: "11px", marginLeft: "8px" }}>
              Page {earningPage} of {earningTotalPages}
            </span>
          </div>
        )}
      </div>

      {/* ── Withdrawal Requests Section ── */}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "20px",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "6px" }}>
            WITHDRAWAL REQUESTS
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Withdrawal Management ({filteredWithdrawals.length})</h3>
        </div>

        {/* ── Filters ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <select
            value={withdrawalFilter}
            onChange={(e) => {
              setWithdrawalFilter(e.target.value);
              setWithdrawalPage(1);
            }}
            style={{
              padding: "8px 12px",
              background: "#252525",
              border: "1px solid #444",
              borderRadius: "6px",
              color: "#fff",
              fontSize: "12px",
            }}
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>

          <button
            onClick={() => {
              setWithdrawalFilter("all");
              setWithdrawalPage(1);
            }}
            style={{
              padding: "8px 12px",
              background: "#444",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Clear
          </button>
        </div>

        {/* ── Withdrawals Table ── */}
        {paginatedWithdrawals.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
            Koi withdrawal request nahi mila.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #333", background: "#252525" }}>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>User</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Amount</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Status</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Requested</th>
                  <th style={{ padding: "12px", textAlign: "left", color: "#aaa", fontWeight: "bold" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {paginatedWithdrawals.map((withdrawal) => (
                  <tr key={withdrawal.id} style={{ borderBottom: "1px solid #333" }}>
                    <td style={{ padding: "12px" }}>
                      <div style={{ color: "#fff", fontWeight: "bold" }}>
                        {getUserName(withdrawal.user_id)}
                      </div>
                    </td>

                    <td style={{ padding: "12px", color: "#fff", fontWeight: "bold" }}>
                      Rs. {Number(withdrawal.amount).toLocaleString()}
                    </td>

                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "4px 10px",
                          borderRadius: "4px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          background:
                            withdrawal.status === "pending"
                              ? "#f59e0b20"
                              : withdrawal.status === "approved"
                              ? "#3b82f620"
                              : withdrawal.status === "completed"
                              ? "#10b98120"
                              : "#ef444420",
                          color:
                            withdrawal.status === "pending"
                              ? "#fbbf24"
                              : withdrawal.status === "approved"
                              ? "#93c5fd"
                              : withdrawal.status === "completed"
                              ? "#86efac"
                              : "#f87171",
                        }}
                      >
                        {withdrawal.status.toUpperCase()}
                      </span>
                    </td>

                    <td style={{ padding: "12px", color: "#aaa", fontSize: "11px" }}>
                      {new Date(withdrawal.requested_at).toLocaleDateString("en-PK")}
                    </td>

                    <td style={{ padding: "12px" }}>
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        {withdrawal.status === "pending" && (
                          <>
                            <button
                              onClick={() => approveWithdrawal(withdrawal.id)}
                              disabled={loading}
                              style={{
                                padding: "6px 10px",
                                background: "#3b82f6",
                                color: "#fff",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "11px",
                                fontWeight: "bold",
                                opacity: loading ? 0.6 : 1,
                              }}
                            >
                              ✓ Approve
                            </button>

                            <button
                              onClick={() => rejectWithdrawal(withdrawal.id)}
                              disabled={loading}
                              style={{
                                padding: "6px 10px",
                                background: "#7f1d1d",
                                color: "#fca5a5",
                                border: "none",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "11px",
                                fontWeight: "bold",
                                opacity: loading ? 0.6 : 1,
                              }}
                            >
                              ✕ Reject
                            </button>
                          </>
                        )}

                        {withdrawal.status === "approved" && (
                          <button
                            onClick={() => completeWithdrawal(withdrawal.id)}
                            disabled={loading}
                            style={{
                              padding: "6px 10px",
                              background: "#064e3b",
                              color: "#86efac",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "11px",
                              fontWeight: "bold",
                              opacity: loading ? 0.6 : 1,
                            }}
                          >
                            ✓ Complete
                          </button>
                        )}

                        <button
                          onClick={() => setSelectedWithdrawal(withdrawal)}
                          style={{
                            padding: "6px 10px",
                            background: "#444",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "11px",
                            fontWeight: "bold",
                          }}
                        >
                          👁️ View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {withdrawalTotalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", marginTop: "16px" }}>
            <button
              onClick={() => setWithdrawalPage(Math.max(1, withdrawalPage - 1))}
              disabled={withdrawalPage === 1}
              style={{
                padding: "6px 10px",
                background: withdrawalPage === 1 ? "#333" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: withdrawalPage === 1 ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              ← Prev
            </button>

            {Array.from({ length: withdrawalTotalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                onClick={() => setWithdrawalPage(p)}
                style={{
                  padding: "6px 10px",
                  background: withdrawalPage === p ? "#2563eb" : "#333",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: withdrawalPage === p ? "bold" : "normal",
                }}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setWithdrawalPage(Math.min(withdrawalTotalPages, withdrawalPage + 1))}
              disabled={withdrawalPage === withdrawalTotalPages}
              style={{
                padding: "6px 10px",
                background: withdrawalPage === withdrawalTotalPages ? "#333" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: withdrawalPage === withdrawalTotalPages ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              Next →
            </button>

            <span style={{ color: "#888", fontSize: "11px", marginLeft: "8px" }}>
              Page {withdrawalPage} of {withdrawalTotalPages}
            </span>
          </div>
        )}
      </div>

      {/* ── Earning Details Modal ── */}
      {selectedEarning && (
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Earning Details</h3>
            <button
              onClick={() => setSelectedEarning(null)}
              style={{
                padding: "6px 12px",
                background: "#444",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Close
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>User</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                {getUserName(selectedEarning.user_id)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Amount</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                Rs. {Number(selectedEarning.amount).toLocaleString()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Status</div>
              <div style={{ fontSize: "13px", color: selectedEarning.payment_status === "paid" ? "#86efac" : "#fbbf24", fontWeight: "bold" }}>
                {selectedEarning.payment_status.toUpperCase()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Created Date</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                {new Date(selectedEarning.created_at).toLocaleString("en-PK")}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Paid Date</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                {selectedEarning.paid_at
                  ? new Date(selectedEarning.paid_at).toLocaleString("en-PK")
                  : "—"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Submission ID</div>
              <div style={{ fontSize: "11px", color: "#aaa", fontFamily: "monospace", wordBreak: "break-all" }}>
                {selectedEarning.submission_id}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Withdrawal Details Modal ── */}
      {selectedWithdrawal && (
        <div
          style={{
            background: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>Withdrawal Details</h3>
            <button
              onClick={() => setSelectedWithdrawal(null)}
              style={{
                padding: "6px 12px",
                background: "#444",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: "12px",
              }}
            >
              Close
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>User</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                {getUserName(selectedWithdrawal.user_id)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Amount</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                Rs. {Number(selectedWithdrawal.amount).toLocaleString()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Status</div>
              <div
                style={{
                  fontSize: "13px",
                  color:
                    selectedWithdrawal.status === "pending"
                      ? "#fbbf24"
                      : selectedWithdrawal.status === "approved"
                      ? "#93c5fd"
                      : selectedWithdrawal.status === "completed"
                      ? "#86efac"
                      : "#f87171",
                  fontWeight: "bold",
                }}
              >
                {selectedWithdrawal.status.toUpperCase()}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Requested Date</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                {new Date(selectedWithdrawal.requested_at).toLocaleString("en-PK")}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Approved Date</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                {selectedWithdrawal.approved_at
                  ? new Date(selectedWithdrawal.approved_at).toLocaleString("en-PK")
                  : "—"}
              </div>
            </div>

            <div>
              <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Completed Date</div>
              <div style={{ fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                {selectedWithdrawal.completed_at
                  ? new Date(selectedWithdrawal.completed_at).toLocaleString("en-PK")
                  : "—"}
              </div>
            </div>

            {selectedWithdrawal.notes && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: "11px", color: "#888", marginBottom: "4px" }}>Notes</div>
                <div style={{ fontSize: "13px", color: "#aaa" }}>
                  {selectedWithdrawal.notes}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

