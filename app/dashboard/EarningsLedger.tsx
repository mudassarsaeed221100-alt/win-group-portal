"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Earning = {
  id: string;
  submission_id: string | null;
  user_id: string;
  amount: number;
  payment_status: string;
  paid_at: string | null;
  created_at: string;
  source: string | null;
};

type Withdrawal = {
  id: string;
  user_id: string;
  amount: number;
  fee_amount: number | null;
  net_amount: number | null;
  payment_method: string | null;
  account_title: string | null;
  account_number: string | null;
  status: string;
  admin_note: string | null;
  reviewed_at: string | null;
  paid_at: string | null;
  created_at: string;
};

const money = (n: number) => `Rs. ${Number(n || 0).toLocaleString("en-PK")}`;
const feeOf = (w: Withdrawal) => (w.fee_amount != null ? Number(w.fee_amount) : Math.round(Number(w.amount) * 1) / 100);
const netOf = (w: Withdrawal) => (w.net_amount != null ? Number(w.net_amount) : Number(w.amount) - feeOf(w));
const dt = (d: string | null) => (d ? new Date(d).toLocaleString("en-PK") : "—");

export default function EarningsLedger() {
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [users, setUsers] = useState<Map<string, any>>(new Map());
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<"success" | "error">("success");

  const [earningFilter, setEarningFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [withdrawalFilter, setWithdrawalFilter] = useState("pending");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [userSearch, setUserSearch] = useState("");
  const [earningPage, setEarningPage] = useState(1);
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const perPage = 10;
  const [selected, setSelected] = useState<Withdrawal | null>(null);

  useEffect(() => { loadData(); }, []);

  function showNotice(msg: string, type: "success" | "error" = "success") {
    setNotice(msg); setNoticeType(type);
    setTimeout(() => setNotice(""), 5000);
  }

  async function loadData() {
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return showNotice("Login session nahi mili.", "error");
      const { data: me } = await supabase.from("profiles").select("role").eq("id", auth.user.id).single();
      if (me?.role !== "founder_owner") return showNotice("Sirf Founder is module ko access kar sakta hai.", "error");

      const { data: e, error: e1 } = await supabase.from("earnings_ledger").select("*").order("created_at", { ascending: false });
      if (e1) throw e1;
      const { data: w, error: e2 } = await supabase.from("withdrawal_requests").select("*").order("created_at", { ascending: false });
      if (e2) throw e2;

      setEarnings((e || []) as Earning[]);
      setWithdrawals((w || []) as Withdrawal[]);

      const ids = Array.from(new Set([...(e || []).map((x: any) => x.user_id), ...(w || []).map((x: any) => x.user_id)].filter(Boolean)));
      if (ids.length) {
        const { data: p } = await supabase.from("profiles").select("id, username, first_name, surname, role").in("id", ids);
        const m = new Map<string, any>();
        (p || []).forEach((x: any) => m.set(x.id, x));
        setUsers(m);
      }
    } catch (err: any) {
      showNotice(err.message || "Data load nahi hua", "error");
    }
  }

  async function refreshData() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  function userName(id: string | null) {
    if (!id) return "Unknown";
    const u = users.get(id);
    if (!u) return id.slice(0, 8);
    return [u.first_name, u.surname].filter(Boolean).join(" ") || u.username;
  }

  async function markPayment(id: string) {
    const e = earnings.find((x) => x.id === id);
    if (!e || e.payment_status === "paid") return;
    if (!confirm(`Kya ${money(e.amount)} ki payment complete ho chuki hai?`)) return;
    setLoading(true);
    const { data: s } = await supabase.auth.getSession();
    const { error } = await supabase.from("earnings_ledger")
      .update({ payment_status: "paid", paid_by: s.session?.user.id, paid_at: new Date().toISOString() })
      .eq("id", id).eq("payment_status", "unpaid");
    setLoading(false);
    if (error) return showNotice(error.message, "error");
    showNotice("Payment paid mark ho gayi.");
    loadData();
  }

  async function updateWithdrawal(w: Withdrawal, status: string) {
    let note: string | null = w.admin_note;
    if (status === "approved" && !confirm(`${userName(w.user_id)} ki ${money(w.amount)} withdrawal approve karni hai?`)) return;
    if (status === "completed" &&
      !confirm(`Kya aap ne ${money(netOf(w))} ${String(w.payment_method || "").toUpperCase()} (${w.account_number}) par bhej diye hain?\n\nAmount: ${money(w.amount)}\nFee (1%): ${money(feeOf(w))}`)) return;
    if (status === "rejected") {
      const r = prompt("Reject karne ki wajah likhein (member ko nazar aayegi):");
      if (r === null) return;
      note = r.trim() || "Request reject kar di gayi";
    }

    setLoading(true);
    const { data: s } = await supabase.auth.getSession();
    const now = new Date().toISOString();
    const upd: any = { status, admin_note: note, reviewed_by: s.session?.user.id, reviewed_at: now };
    if (status === "completed") upd.paid_at = now;
    const { error } = await supabase.from("withdrawal_requests").update(upd).eq("id", w.id);
    setLoading(false);
    if (error) return showNotice(error.message, "error");
    showNotice(status === "completed" ? `✅ Complete ho gaya. Member ko ${money(netOf(w))} bheje gaye.` : status === "approved" ? "Withdrawal approve ho gayi." : "Withdrawal reject ho gayi.");
    setSelected(null);
    loadData();
  }

  function exportCSV() {
    const rows = [["User", "Type", "Amount", "Status", "Created", "Paid"],
      ...fEarnings.map((e) => [userName(e.user_id), e.source === "referral" ? "Referral" : "Task", e.amount, e.payment_status,
        new Date(e.created_at).toLocaleDateString("en-PK"), e.paid_at ? new Date(e.paid_at).toLocaleDateString("en-PK") : "—"])];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = `earnings-ledger-${new Date().toISOString().split("T")[0]}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const inDate = (d: string) => (!dateFrom || new Date(d) >= new Date(dateFrom)) && (!dateTo || new Date(d) <= new Date(dateTo + "T23:59:59"));
  const nameOk = (id: string) => !userSearch || userName(id).toLowerCase().includes(userSearch.toLowerCase());

  const fEarnings = earnings.filter((e) =>
    (earningFilter === "all" || e.payment_status === earningFilter) &&
    (sourceFilter === "all" || (sourceFilter === "referral" ? e.source === "referral" : e.source !== "referral")) &&
    nameOk(e.user_id) && inDate(e.created_at));
  const fWithdrawals = withdrawals.filter((w) =>
    (withdrawalFilter === "all" || w.status === withdrawalFilter) && nameOk(w.user_id) && inDate(w.created_at));

  const ePages = Math.ceil(fEarnings.length / perPage);
  const wPages = Math.ceil(fWithdrawals.length / perPage);
  const pEarnings = fEarnings.slice((earningPage - 1) * perPage, earningPage * perPage);
  const pWithdrawals = fWithdrawals.slice((withdrawalPage - 1) * perPage, withdrawalPage * perPage);

  const sum = (a: any[], f: (x: any) => number) => a.reduce((t, x) => t + f(x), 0);
  const pendingW = withdrawals.filter((w) => w.status === "pending" || w.status === "approved");
  const doneW = withdrawals.filter((w) => w.status === "completed");
  const stats = [
    { label: "Total Earnings", value: money(sum(earnings, (e) => Number(e.amount))), color: "#3b82f6" },
    { label: "🎁 Referral Bonus", value: money(sum(earnings.filter((e) => e.source === "referral"), (e) => Number(e.amount))), color: "#c4b5fd" },
    { label: "Total Unpaid", value: money(sum(earnings.filter((e) => e.payment_status !== "paid"), (e) => Number(e.amount))), color: "#f59e0b" },
    { label: "⏳ Bhejna baqi (net)", value: money(sum(pendingW, netOf)), color: "#fbbf24" },
    { label: "✅ Bheje gaye (net)", value: money(sum(doneW, netOf)), color: "#10b981" },
    { label: "💰 Fee ki kamai (1%)", value: money(sum(doneW, feeOf)), color: "#22d3ee" },
  ];

  const box: React.CSSProperties = { background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: 20, marginBottom: 20 };
  const inp: React.CSSProperties = { padding: "8px 12px", background: "#252525", border: "1px solid #444", borderRadius: 6, color: "#fff", fontSize: 12 };
  const th: React.CSSProperties = { padding: 12, textAlign: "left", color: "#aaa", fontWeight: "bold" };
  const btn = (bg: string, c = "#fff"): React.CSSProperties => ({ padding: "6px 10px", background: bg, color: c, border: "none", borderRadius: 4, cursor: "pointer", fontSize: 11, fontWeight: "bold", opacity: loading ? 0.6 : 1 });
  const wColor = (s: string) => s === "pending" ? ["#f59e0b20", "#fbbf24"] : s === "approved" ? ["#3b82f620", "#93c5fd"] : s === "completed" ? ["#10b98120", "#86efac"] : ["#ef444420", "#f87171"];

  function Pager({ page, pages, set }: { page: number; pages: number; set: (n: number) => void }) {
    if (pages <= 1) return null;
    return (
      <div style={{ display: "flex", justifyContent: "center", gap: 8, alignItems: "center", marginTop: 16, flexWrap: "wrap" }}>
        <button style={btn("#444")} disabled={page === 1} onClick={() => set(Math.max(1, page - 1))}>← Prev</button>
        {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
          <button key={p} style={btn(page === p ? "#2563eb" : "#333")} onClick={() => set(p)}>{p}</button>
        ))}
        <button style={btn("#444")} disabled={page === pages} onClick={() => set(Math.min(pages, page + 1))}>Next →</button>
        <span style={{ color: "#888", fontSize: 11 }}>Page {page} of {pages}</span>
      </div>
    );
  }

  return (
    <div style={{ padding: 20, color: "#e9e9e9" }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#888", fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>EARNINGS LEDGER</div>
            <h2 style={{ margin: 0, fontSize: 22, color: "#fff" }}>Staff Earnings Ledger</h2>
            <p style={{ margin: "6px 0 0", color: "#aaa", fontSize: 12 }}>Earnings, referral bonus aur withdrawal payments ka complete record.</p>
          </div>
          <button onClick={refreshData} disabled={refreshing} style={{ ...btn(refreshing ? "#444" : "#2563eb"), padding: "10px 16px", fontSize: 12 }}>
            {refreshing ? "🔄 Refreshing..." : "🔄 Refresh"}
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          {stats.map((s) => (
            <div key={s.label} style={{ background: "#1a1a1a", border: "1px solid #333", borderRadius: 8, padding: 12 }}>
              <div style={{ fontSize: 11, color: "#888" }}>{s.label}</div>
              <div style={{ fontSize: 15, fontWeight: "bold", color: s.color, marginTop: 6 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {notice && (
        <div style={{ padding: "12px 16px", background: noticeType === "success" ? "#064e3b" : "#7f1d1d", color: noticeType === "success" ? "#86efac" : "#fca5a5", borderRadius: 6, marginBottom: 16, fontSize: 12 }}>
          {noticeType === "success" ? "✓" : "✕"} {notice}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 16 }}>
        <input style={inp} placeholder="🔍 User dhoondein..." value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setEarningPage(1); setWithdrawalPage(1); }} />
        <input style={inp} type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
        <input style={inp} type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
        <button style={{ ...btn("#444"), fontSize: 12 }} onClick={() => { setUserSearch(""); setDateFrom(""); setDateTo(""); setEarningFilter("all"); setSourceFilter("all"); }}>Clear</button>
      </div>

      {/* ── Withdrawals (pehle, kyunki paise bhejne hain) ── */}
      <div style={box}>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <div>
            <div style={{ color: "#888", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>WITHDRAWAL REQUESTS</div>
            <h3 style={{ margin: 0, fontSize: 16, color: "#fff" }}>Withdrawal Management ({fWithdrawals.length})</h3>
          </div>
          <select style={inp} value={withdrawalFilter} onChange={(e) => { setWithdrawalFilter(e.target.value); setWithdrawalPage(1); }}>
            <option value="pending">⏳ Pending</option>
            <option value="approved">✅ Approved (bhejna baqi)</option>
            <option value="completed">💰 Completed</option>
            <option value="rejected">❌ Rejected</option>
            <option value="all">Sab</option>
          </select>
        </div>

        {pWithdrawals.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: 40 }}>Koi withdrawal request nahi mili.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 900 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #333", background: "#252525" }}>
                  {["User", "Amount", "Fee (1%)", "💸 Member ko bhejein", "Account", "Status", "Date", "Actions"].map((h) => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {pWithdrawals.map((w) => {
                  const [bg, c] = wColor(w.status);
                  return (
                    <tr key={w.id} style={{ borderBottom: "1px solid #333" }}>
                      <td style={{ padding: 12, color: "#fff", fontWeight: "bold" }}>{userName(w.user_id)}</td>
                      <td style={{ padding: 12, color: "#aaa" }}>{money(w.amount)}</td>
                      <td style={{ padding: 12, color: "#22d3ee" }}>{money(feeOf(w))}</td>
                      <td style={{ padding: 12, color: "#4ade80", fontWeight: "bold", fontSize: 15 }}>{money(netOf(w))}</td>
                      <td style={{ padding: 12, color: "#ddd", fontSize: 11, lineHeight: 1.5 }}>
                        <b>{String(w.payment_method || "—").toUpperCase()}</b><br />{w.account_title || "—"}<br />
                        <span style={{ fontFamily: "monospace" }}>{w.account_number || "—"}</span>
                      </td>
                      <td style={{ padding: 12 }}>
                        <span style={{ padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: "bold", background: bg, color: c }}>{w.status.toUpperCase()}</span>
                      </td>
                      <td style={{ padding: 12, color: "#aaa", fontSize: 11 }}>{new Date(w.created_at).toLocaleDateString("en-PK")}</td>
                      <td style={{ padding: 12 }}>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {w.status === "pending" && <>
                            <button disabled={loading} style={btn("#3b82f6")} onClick={() => updateWithdrawal(w, "approved")}>✓ Approve</button>
                            <button disabled={loading} style={btn("#7f1d1d", "#fca5a5")} onClick={() => updateWithdrawal(w, "rejected")}>✕ Reject</button>
                          </>}
                          {w.status === "approved" && <>
                            <button disabled={loading} style={btn("#064e3b", "#86efac")} onClick={() => updateWithdrawal(w, "completed")}>💸 Paise bhej diye</button>
                            <button disabled={loading} style={btn("#7f1d1d", "#fca5a5")} onClick={() => updateWithdrawal(w, "rejected")}>✕ Reject</button>
                          </>}
                          <button style={btn("#444")} onClick={() => setSelected(w)}>👁️ View</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={withdrawalPage} pages={wPages} set={setWithdrawalPage} />
      </div>

      {selected && (
        <div style={{ ...box, borderColor: "#14532d" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h3 style={{ margin: 0, fontSize: 16, color: "#fff" }}>Withdrawal Details</h3>
            <button style={btn("#444")} onClick={() => setSelected(null)}>Close</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            {[
              ["User", userName(selected.user_id)],
              ["Amount", money(selected.amount)],
              ["Fee (1%)", money(feeOf(selected))],
              ["💸 Member ko bhejein", money(netOf(selected))],
              ["Method", String(selected.payment_method || "—").toUpperCase()],
              ["Account Title", selected.account_title || "—"],
              ["Account Number", selected.account_number || "—"],
              ["Status", selected.status.toUpperCase()],
              ["Request Date", dt(selected.created_at)],
              ["Review Date", dt(selected.reviewed_at)],
              ["Paid Date", dt(selected.paid_at)],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>{l}</div>
                <div style={{ fontSize: 13, color: l.includes("bhejein") ? "#4ade80" : "#fff", fontWeight: "bold" }}>{v}</div>
              </div>
            ))}
            {selected.admin_note && (
              <div style={{ gridColumn: "1 / -1" }}>
                <div style={{ fontSize: 11, color: "#888", marginBottom: 4 }}>Note</div>
                <div style={{ fontSize: 13, color: "#aaa" }}>{selected.admin_note}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Earnings ── */}
      <div style={box}>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: "#888", fontSize: 10, letterSpacing: 2, marginBottom: 6 }}>EARNINGS RECORDS</div>
            <h3 style={{ margin: 0, fontSize: 16, color: "#fff" }}>Payment History ({fEarnings.length})</h3>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <select style={inp} value={sourceFilter} onChange={(e) => { setSourceFilter(e.target.value); setEarningPage(1); }}>
              <option value="all">Sab qism</option>
              <option value="task">📋 Task</option>
              <option value="referral">🎁 Referral</option>
            </select>
            <select style={inp} value={earningFilter} onChange={(e) => { setEarningFilter(e.target.value); setEarningPage(1); }}>
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="unpaid">Unpaid</option>
            </select>
            <button style={{ ...btn("#10b981"), padding: "8px 14px", fontSize: 12 }} onClick={exportCSV}>📥 Export CSV</button>
          </div>
        </div>

        {pEarnings.length === 0 ? (
          <div style={{ textAlign: "center", color: "#888", padding: 40 }}>Koi earning record nahi mila.</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, minWidth: 700 }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #333", background: "#252525" }}>
                  {["User", "Qism", "Amount", "Status", "Created", "Paid Date", "Actions"].map((h) => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {pEarnings.map((e) => (
                  <tr key={e.id} style={{ borderBottom: "1px solid #333" }}>
                    <td style={{ padding: 12, color: "#fff", fontWeight: "bold" }}>{userName(e.user_id)}</td>
                    <td style={{ padding: 12, color: e.source === "referral" ? "#c4b5fd" : "#aaa" }}>{e.source === "referral" ? "🎁 Referral" : "📋 Task"}</td>
                    <td style={{ padding: 12, color: "#fff", fontWeight: "bold" }}>{money(e.amount)}</td>
                    <td style={{ padding: 12 }}>
                      <span style={{ padding: "4px 10px", borderRadius: 4, fontSize: 11, fontWeight: "bold", background: e.payment_status === "paid" ? "#10b98120" : "#f59e0b20", color: e.payment_status === "paid" ? "#86efac" : "#fbbf24" }}>
                        {e.payment_status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: 12, color: "#aaa", fontSize: 11 }}>{new Date(e.created_at).toLocaleDateString("en-PK")}</td>
                    <td style={{ padding: 12, color: "#aaa", fontSize: 11 }}>{e.paid_at ? new Date(e.paid_at).toLocaleDateString("en-PK") : "—"}</td>
                    <td style={{ padding: 12 }}>
                      {e.payment_status !== "paid"
                        ? <button disabled={loading} style={btn("#064e3b", "#86efac")} onClick={() => markPayment(e.id)}>✓ Mark Paid</button>
                        : <span style={{ color: "#10b981", fontSize: 11, fontWeight: "bold" }}>✓ Completed</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={earningPage} pages={ePages} set={setEarningPage} />
      </div>
    </div>
  );
}
