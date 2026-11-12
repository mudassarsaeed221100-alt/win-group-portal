
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type CommissionRate = {
  id: string;
  role: string;
  percentage: number;
  description: string;
  active: boolean;
  created_at: string;
};

type ReferralRecord = {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  referral_type: "direct" | "indirect";
  status: string;
  created_at: string;
};

type BonusCalculation = {
  id: string;
  user_id: string;
  referral_id: string;
  role: string;
  gross_amount: number;
  commission_percentage: number;
  commission_amount: number;
  status: string;
  calculated_at: string;
};

type PaymentRecord = {
  id: string;
  user_id: string;
  bonus_id: string;
  amount: number;
  payment_method: string;
  status: string;
  reference: string | null;
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

export default function CommissionBonusManagement() {
  const [rates, setRates] = useState<CommissionRate[]>([]);
  const [referrals, setReferrals] = useState<ReferralRecord[]>([]);
  const [bonuses, setBonuses] = useState<BonusCalculation[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [users, setUsers] = useState<Map<string, UserProfile>>(new Map());

  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");

  // Form states
  const [editingRateId, setEditingRateId] = useState<string | null>(null);
  const [rateRole, setRateRole] = useState("");
  const [ratePercentage, setRatePercentage] = useState("");
  const [rateDescription, setRateDescription] = useState("");

  // Filters
  const [referralTypeFilter, setReferralTypeFilter] = useState("all");
  const [bonusStatusFilter, setBonusStatusFilter] = useState("all");
  const [paymentStatusFilter, setPaymentStatusFilter] = useState("all");

  // Pagination
  const [referralPage, setReferralPage] = useState(1);
  const [bonusPage, setBonusPage] = useState(1);
  const [paymentPage, setPaymentPage] = useState(1);
  const itemsPerPage = 10;

  /* ── Load Data ── */
  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [ratesResult, referralsResult, bonusesResult, paymentsResult] = await Promise.all([
        supabase.from("commission_rates").select("*").order("percentage", { ascending: false }),
        supabase.from("referral_records").select("*").order("created_at", { ascending: false }),
        supabase.from("bonus_calculations").select("*").order("calculated_at", { ascending: false }),
        supabase.from("payment_records").select("*").order("created_at", { ascending: false }),
      ]);

      if (ratesResult.error) throw ratesResult.error;
      if (referralsResult.error) throw referralsResult.error;
      if (bonusesResult.error) throw bonusesResult.error;
      if (paymentsResult.error) throw paymentsResult.error;

      setRates((ratesResult.data || []) as CommissionRate[]);
      setReferrals((referralsResult.data || []) as ReferralRecord[]);
      setBonuses((bonusesResult.data || []) as BonusCalculation[]);
      setPayments((paymentsResult.data || []) as PaymentRecord[]);

      // Load user profiles
      const userIds = Array.from(
        new Set([
          ...((referralsResult.data || []).map((r) => r.referrer_id)),
          ...((referralsResult.data || []).map((r) => r.referred_user_id)),
          ...((bonusesResult.data || []).map((b) => b.user_id)),
          ...((paymentsResult.data || []).map((p) => p.user_id)),
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

  /* ── Save Commission Rate ── */
  async function saveRate() {
    if (!rateRole.trim() || !ratePercentage.trim()) {
      showNotice("Role aur percentage enter karein.", "error");
      return;
    }

    const percentage = Number(ratePercentage);
    if (percentage < 0 || percentage > 100) {
      showNotice("Percentage 0-100 ke beech hona chahiye.", "error");
      return;
    }

    setLoading(true);

    try {
      if (editingRateId) {
        const { error } = await supabase
          .from("commission_rates")
          .update({
            role: rateRole.trim(),
            percentage,
            description: rateDescription.trim() || null,
          })
          .eq("id", editingRateId);

        if (error) throw error;
        showNotice("Commission rate update ho gaya.", "success");
      } else {
        const { error } = await supabase.from("commission_rates").insert({
          role: rateRole.trim(),
          percentage,
          description: rateDescription.trim() || null,
          active: true,
        });

        if (error) throw error;
        showNotice("Commission rate create ho gaya.", "success");
      }

      resetRateForm();
      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Rate save nahi hua", "error");
    }

    setLoading(false);
  }

  /* ── Edit Rate ── */
  function editRate(rate: CommissionRate) {
    setEditingRateId(rate.id);
    setRateRole(rate.role);
    setRatePercentage(String(rate.percentage));
    setRateDescription(rate.description);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ── Delete Rate ── */
  async function deleteRate(rateId: string) {
    if (!window.confirm("Kya aap is rate ko delete karna chahte hain?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("commission_rates")
        .delete()
        .eq("id", rateId);

      if (error) throw error;

      showNotice("Commission rate delete ho gaya.", "success");
      if (editingRateId === rateId) resetRateForm();
      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Rate delete nahi hua", "error");
    }
  }

  /* ── Reset Rate Form ── */
  function resetRateForm() {
    setRateRole("");
    setRatePercentage("");
    setRateDescription("");
    setEditingRateId(null);
  }

  /* ── Approve Payment ── */
  async function approvePayment(paymentId: string) {
    if (!window.confirm("Kya aap is payment ko approve karna chahte hain?")) {
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) throw new Error("Session expire ho gaya.");

      const { error } = await supabase
        .from("payment_records")
        .update({
          status: "approved",
          paid_at: new Date().toISOString(),
        })
        .eq("id", paymentId);

      if (error) throw error;

      showNotice("Payment approved ho gaya.", "success");
      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Payment approve nahi hua", "error");
    }
  }

  /* ── Reject Payment ── */
  async function rejectPayment(paymentId: string) {
    if (!window.confirm("Kya aap is payment ko reject karna chahte hain?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("payment_records")
        .update({ status: "rejected" })
        .eq("id", paymentId);

      if (error) throw error;

      showNotice("Payment rejected ho gaya.", "success");
      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Payment reject nahi hua", "error");
    }
  }

  /* ── Calculate Bonuses ── */
  async function calculateBonuses() {
    if (!window.confirm("Kya aap sab bonuses recalculate karna chahte hain?")) {
      return;
    }

    setLoading(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user;

      if (!user) throw new Error("Session expire ho gaya.");

      // Get all referrals
      const { data: allReferrals } = await supabase
        .from("referral_records")
        .select("*")
        .eq("status", "active");

      if (!allReferrals || allReferrals.length === 0) {
        showNotice("Koi active referral nahi hai.", "error");
        setLoading(false);
        return;
      }

      // Get commission rates
      const { data: allRates } = await supabase
        .from("commission_rates")
        .select("*")
        .eq("active", true);

      if (!allRates || allRates.length === 0) {
        showNotice("Commission rates configure nahi hain.", "error");
        setLoading(false);
        return;
      }

      // Calculate bonuses for each referral
      const bonusesToInsert = [];

      for (const referral of allReferrals) {
        const rate = allRates.find(
          (r) => r.role === (referral.referral_type === "direct" ? "Direct Referral" : "Indirect Referral")
        );

        if (rate) {
          // Assume gross amount is 1000 (you can change this logic)
          const grossAmount = 1000;
          const commissionAmount = (grossAmount * rate.percentage) / 100;

          bonusesToInsert.push({
            user_id: referral.referrer_id,
            referral_id: referral.id,
            role: rate.role,
            gross_amount: grossAmount,
            commission_percentage: rate.percentage,
            commission_amount: commissionAmount,
            status: "pending",
          });
        }
      }

      if (bonusesToInsert.length > 0) {
        const { error } = await supabase
          .from("bonus_calculations")
          .insert(bonusesToInsert);

        if (error) throw error;

        showNotice(`${bonusesToInsert.length} bonuses calculated ho gaye.`, "success");
      } else {
        showNotice("Koi bonus calculate nahi hua.", "error");
      }

      await loadData();
    } catch (err: any) {
      showNotice(err.message || "Calculation nahi hua", "error");
    }

    setLoading(false);
  }

  /* ── Filter Referrals ── */
  const filteredReferrals = referrals.filter((ref) => {
    if (referralTypeFilter !== "all" && ref.referral_type !== referralTypeFilter) {
      return false;
    }
    return true;
  });

  /* ── Filter Bonuses ── */
  const filteredBonuses = bonuses.filter((bonus) => {
    if (bonusStatusFilter !== "all" && bonus.status !== bonusStatusFilter) {
      return false;
    }
    return true;
  });

  /* ── Filter Payments ── */
  const filteredPayments = payments.filter((payment) => {
    if (paymentStatusFilter !== "all" && payment.status !== paymentStatusFilter) {
      return false;
    }
    return true;
  });

  /* ── Pagination ── */
  const referralTotalPages = Math.ceil(filteredReferrals.length / itemsPerPage);
  const paginatedReferrals = filteredReferrals.slice(
    (referralPage - 1) * itemsPerPage,
    referralPage * itemsPerPage
  );

  const bonusTotalPages = Math.ceil(filteredBonuses.length / itemsPerPage);
  const paginatedBonuses = filteredBonuses.slice(
    (bonusPage - 1) * itemsPerPage,
    bonusPage * itemsPerPage
  );

  const paymentTotalPages = Math.ceil(filteredPayments.length / itemsPerPage);
  const paginatedPayments = filteredPayments.slice(
    (paymentPage - 1) * itemsPerPage,
    paymentPage * itemsPerPage
  );

  /* ── Stats ── */
  const stats = {
    totalReferrals: referrals.length,
    directReferrals: referrals.filter((r) => r.referral_type === "direct").length,
    indirectReferrals: referrals.filter((r) => r.referral_type === "indirect").length,
    totalBonuses: bonuses.length,
    pendingBonuses: bonuses.filter((b) => b.status === "pending").length,
    approvedBonuses: bonuses.filter((b) => b.status === "approved").length,
    totalBonusAmount: bonuses
      .filter((b) => b.status === "approved")
      .reduce((sum, b) => sum + Number(b.commission_amount || 0), 0),
    totalPayments: payments.length,
    pendingPayments: payments.filter((p) => p.status === "pending").length,
    approvedPayments: payments.filter((p) => p.status === "approved").length,
    totalPaidAmount: payments
      .filter((p) => p.status === "approved")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0),
  };

  return (
    <div style={{ padding: "20px", color: "#e9e9e9" }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "start", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "8px" }}>
              COMMISSION & BONUS MANAGEMENT
            </div>
            <h2 style={{ margin: 0, fontSize: "22px", color: "#fff" }}>Commission & Bonus Tracking</h2>
            <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: "12px" }}>
              Referral bonuses, commission calculations aur payment approvals ka complete management.
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
            { label: "Total Referrals", value: stats.totalReferrals, color: "#3b82f6" },
            { label: "Direct Referrals", value: stats.directReferrals, color: "#10b981" },
            { label: "Indirect Referrals", value: stats.indirectReferrals, color: "#f59e0b" },
            { label: "Pending Bonuses", value: stats.pendingBonuses, color: "#f59e0b" },
            { label: "Approved Bonuses", value: stats.approvedBonuses, color: "#10b981" },
            { label: "Total Bonus Amount", value: `Rs. ${stats.totalBonusAmount.toLocaleString()}`, color: "#8b5cf6" },
            { label: "Pending Payments", value: stats.pendingPayments, color: "#f59e0b" },
            { label: "Total Paid", value: `Rs. ${stats.totalPaidAmount.toLocaleString()}`, color: "#10b981" },
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
              <div style={{ fontSize: "16px", fontWeight: "bold", color: stat.color, marginTop: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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

      {/* ── Commission Rates Section ── */}
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
            COMMISSION RATES
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>
            {editingRateId ? "Edit Commission Rate" : "Create Commission Rate"}
          </h3>
        </div>

        <div style={{ display: "grid", gap: "12px", marginBottom: "16px" }}>
          <div>
            <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
              Role *
            </label>
            <input
              value={rateRole}
              onChange={(e) => setRateRole(e.target.value)}
              placeholder="e.g., Direct Referral, Indirect Referral, Super Admin"
              style={{
                width: "100%",
                padding: "8px 12px",
                background: "#252525",
                border: "1px solid #444",
                borderRadius: "6px",
                color: "#fff",
                fontSize: "12px",
              }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Percentage (%) *
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={ratePercentage}
                onChange={(e) => setRatePercentage(e.target.value)}
                placeholder="0"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#252525",
                  border: "1px solid #444",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "11px", color: "#aaa", marginBottom: "4px" }}>
                Description
              </label>
              <input
                value={rateDescription}
                onChange={(e) => setRateDescription(e.target.value)}
                placeholder="Optional description"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "#252525",
                  border: "1px solid #444",
                  borderRadius: "6px",
                  color: "#fff",
                  fontSize: "12px",
                }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" }}>
          <button
            onClick={saveRate}
            disabled={loading}
            style={{
              padding: "10px 16px",
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "12px",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Saving..." : editingRateId ? "Update Rate" : "Create Rate"}
          </button>

          {editingRateId && (
            <button
              onClick={resetRateForm}
              style={{
                padding: "10px 16px",
                background: "#444",
                color: "#fff",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "12px",
              }}
            >
              Cancel
            </button>
          )}
        </div>

        {/* ── Rates List ── */}
        {rates.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
            Abhi koi commission rate create nahi hua.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {rates.map((rate) => (
              <div
                key={rate.id}
                style={{
                  background: "#252525",
                  border: "1px solid #333",
                  borderRadius: "6px",
                  padding: "12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <h4 style={{ margin: 0, fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                    {rate.role}
                  </h4>
                  {rate.description && (
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#aaa" }}>
                      {rate.description}
                    </p>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <span style={{ fontSize: "16px", fontWeight: "bold", color: "#10b981" }}>
                    {rate.percentage}%
                  </span>

                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => editRate(rate)}
                      style={{
                        padding: "6px 12px",
                        background: "#2563eb",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    >
                      ✏️ Edit
                    </button>

                    <button
                      onClick={() => deleteRate(rate.id)}
                      style={{
                        padding: "6px 12px",
                        background: "#7f1d1d",
                        color: "#fca5a5",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Referrals Section ── */}
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
            REFERRAL RECORDS
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>All Referrals ({filteredReferrals.length})</h3>
        </div>

        {/* ── Filters ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <select
            value={referralTypeFilter}
            onChange={(e) => {
              setReferralTypeFilter(e.target.value);
              setReferralPage(1);
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
            <option value="all">All Types</option>
            <option value="direct">Direct Referral</option>
            <option value="indirect">Indirect Referral</option>
          </select>

          <button
            onClick={() => {
              setReferralTypeFilter("all");
              setReferralPage(1);
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

        {/* ── Referrals List ── */}
        {paginatedReferrals.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
            Koi referral record nahi hai.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {paginatedReferrals.map((ref) => (
              <div
                key={ref.id}
                style={{
                  background: "#252525",
                  border: "1px solid #333",
                  borderRadius: "6px",
                  padding: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "12px", marginBottom: "8px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                      {getUserName(ref.referrer_id)} → {getUserName(ref.referred_user_id)}
                    </h4>
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#aaa" }}>
                      Referrer: {getUserName(ref.referrer_id)}
                    </p>
                  </div>

                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: "bold",
                      background: ref.referral_type === "direct" ? "#064e3b" : "#1e3a8a",
                      color: ref.referral_type === "direct" ? "#86efac" : "#93c5fd",
                    }}
                  >
                    {ref.referral_type === "direct" ? "DIRECT" : "INDIRECT"}
                  </span>
                </div>

                <div style={{ fontSize: "11px", color: "#888" }}>
                  Status: {ref.status.toUpperCase()} • Created: {new Date(ref.created_at).toLocaleString("en-PK")}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {referralTotalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", marginTop: "16px" }}>
            <button
              onClick={() => setReferralPage(Math.max(1, referralPage - 1))}
              disabled={referralPage === 1}
              style={{
                padding: "6px 10px",
                background: referralPage === 1 ? "#333" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: referralPage === 1 ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              ← Prev
            </button>

            {Array.from({ length: referralTotalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setReferralPage(page)}
                style={{
                  padding: "6px 10px",
                  background: referralPage === page ? "#2563eb" : "#333",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: referralPage === page ? "bold" : "normal",
                }}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setReferralPage(Math.min(referralTotalPages, referralPage + 1))}
              disabled={referralPage === referralTotalPages}
              style={{
                padding: "6px 10px",
                background: referralPage === referralTotalPages ? "#333" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: referralPage === referralTotalPages ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              Next →
            </button>

            <span style={{ color: "#888", fontSize: "11px", marginLeft: "8px" }}>
              Page {referralPage} of {referralTotalPages}
            </span>
          </div>
        )}
      </div>

      {/* ── Bonus Calculations Section ── */}
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
              BONUS CALCULATIONS
            </div>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>All Bonuses ({filteredBonuses.length})</h3>
          </div>

          <button
            onClick={calculateBonuses}
            disabled={loading}
            style={{
              padding: "10px 16px",
              background: "#8b5cf6",
              color: "#fff",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "12px",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Calculating..." : "🧮 Calculate Bonuses"}
          </button>
        </div>

        {/* ── Filters ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <select
            value={bonusStatusFilter}
            onChange={(e) => {
              setBonusStatusFilter(e.target.value);
              setBonusPage(1);
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
            <option value="rejected">Rejected</option>
          </select>

          <button
            onClick={() => {
              setBonusStatusFilter("all");
              setBonusPage(1);
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

        {/* ── Bonuses List ── */}
        {paginatedBonuses.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
            Koi bonus calculation nahi hai.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {paginatedBonuses.map((bonus) => (
              <div
                key={bonus.id}
                style={{
                  background: "#252525",
                  border: "1px solid #333",
                  borderRadius: "6px",
                  padding: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "12px", marginBottom: "8px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                      {getUserName(bonus.user_id)}
                    </h4>
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#aaa" }}>
                      {bonus.role}
                    </p>
                  </div>

                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: "bold",
                      background:
                        bonus.status === "pending"
                          ? "#f59e0b20"
                          : bonus.status === "approved"
                          ? "#10b98120"
                          : "#ef444420",
                      color:
                        bonus.status === "pending"
                          ? "#f59e0b"
                          : bonus.status === "approved"
                          ? "#10b981"
                          : "#ef4444",
                    }}
                  >
                    {bonus.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ fontSize: "11px", color: "#888", marginBottom: "8px" }}>
                  Gross: Rs. {Number(bonus.gross_amount).toLocaleString()} • Rate: {bonus.commission_percentage}% • Commission: Rs. {Number(bonus.commission_amount).toLocaleString()}
                </div>

                <div style={{ fontSize: "11px", color: "#888" }}>
                  Calculated: {new Date(bonus.calculated_at).toLocaleString("en-PK")}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {bonusTotalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", marginTop: "16px" }}>
            <button
              onClick={() => setBonusPage(Math.max(1, bonusPage - 1))}
              disabled={bonusPage === 1}
              style={{
                padding: "6px 10px",
                background: bonusPage === 1 ? "#333" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: bonusPage === 1 ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              ← Prev
            </button>

            {Array.from({ length: bonusTotalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setBonusPage(page)}
                style={{
                  padding: "6px 10px",
                  background: bonusPage === page ? "#2563eb" : "#333",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: bonusPage === page ? "bold" : "normal",
                }}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setBonusPage(Math.min(bonusTotalPages, bonusPage + 1))}
              disabled={bonusPage === bonusTotalPages}
              style={{
                padding: "6px 10px",
                background: bonusPage === bonusTotalPages ? "#333" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: bonusPage === bonusTotalPages ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              Next →
            </button>

            <span style={{ color: "#888", fontSize: "11px", marginLeft: "8px" }}>
              Page {bonusPage} of {bonusTotalPages}
            </span>
          </div>
        )}
      </div>

      {/* ── Payment Records Section ── */}
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid #333",
          borderRadius: "8px",
          padding: "20px",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <div style={{ color: "#888", fontSize: "10px", letterSpacing: "2px", marginBottom: "6px" }}>
            PAYMENT RECORDS
          </div>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#fff" }}>All Payments ({filteredPayments.length})</h3>
        </div>

        {/* ── Filters ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "16px" }}>
          <select
            value={paymentStatusFilter}
            onChange={(e) => {
              setPaymentStatusFilter(e.target.value);
              setPaymentPage(1);
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
            <option value="rejected">Rejected</option>
          </select>

          <button
            onClick={() => {
              setPaymentStatusFilter("all");
              setPaymentPage(1);
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

        {/* ── Payments List ── */}
        {paginatedPayments.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: "40px" }}>
            Koi payment record nahi hai.
          </div>
        ) : (
          <div style={{ display: "grid", gap: "12px" }}>
            {paginatedPayments.map((payment) => (
              <div
                key={payment.id}
                style={{
                  background: "#252525",
                  border: "1px solid #333",
                  borderRadius: "6px",
                  padding: "12px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "12px", marginBottom: "8px" }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "13px", color: "#fff", fontWeight: "bold" }}>
                      {getUserName(payment.user_id)}
                    </h4>
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#aaa" }}>
                      Amount: Rs. {Number(payment.amount).toLocaleString()}
                    </p>
                  </div>

                  <span
                    style={{
                      display: "inline-block",
                      padding: "4px 10px",
                      borderRadius: "4px",
                      fontSize: "10px",
                      fontWeight: "bold",
                      background:
                        payment.status === "pending"
                          ? "#f59e0b20"
                          : payment.status === "approved"
                          ? "#10b98120"
                          : "#ef444420",
                      color:
                        payment.status === "pending"
                          ? "#f59e0b"
                          : payment.status === "approved"
                          ? "#10b981"
                          : "#ef4444",
                    }}
                  >
                    {payment.status.toUpperCase()}
                  </span>
                </div>

                <div style={{ fontSize: "11px", color: "#888", marginBottom: "8px" }}>
                  Method: {payment.payment_method} • Created: {new Date(payment.created_at).toLocaleString("en-PK")}
                </div>

                {payment.status === "pending" && (
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      onClick={() => approvePayment(payment.id)}
                      style={{
                        padding: "6px 12px",
                        background: "#064e3b",
                        color: "#86efac",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    >
                      ✓ Approve
                    </button>

                    <button
                      onClick={() => rejectPayment(payment.id)}
                      style={{
                        padding: "6px 12px",
                        background: "#7f1d1d",
                        color: "#fca5a5",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontSize: "11px",
                        fontWeight: "bold",
                      }}
                    >
                      ✕ Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {paymentTotalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", marginTop: "16px" }}>
            <button
              onClick={() => setPaymentPage(Math.max(1, paymentPage - 1))}
              disabled={paymentPage === 1}
              style={{
                padding: "6px 10px",
                background: paymentPage === 1 ? "#333" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: paymentPage === 1 ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              ← Prev
            </button>

            {Array.from({ length: paymentTotalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setPaymentPage(page)}
                style={{
                  padding: "6px 10px",
                  background: paymentPage === page ? "#2563eb" : "#333",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "11px",
                  fontWeight: paymentPage === page ? "bold" : "normal",
                }}
              >
                {page}
              </button>
            ))}

            <button
              onClick={() => setPaymentPage(Math.min(paymentTotalPages, paymentPage + 1))}
              disabled={paymentPage === paymentTotalPages}
              style={{
                padding: "6px 10px",
                background: paymentPage === paymentTotalPages ? "#333" : "#444",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: paymentPage === paymentTotalPages ? "not-allowed" : "pointer",
                fontSize: "11px",
              }}
            >
              Next →
            </button>

            <span style={{ color: "#888", fontSize: "11px", marginLeft: "8px" }}>
              Page {paymentPage} of {paymentTotalPages}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

