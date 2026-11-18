"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function BusinessRecords() {
  const [records, setRecords] = useState<any[]>([]);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("income");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState(true);

  async function api(method: string, body?: any, q = "") {
    const { data } = await supabase.auth.getSession();
    const r = await fetch("/api/admin/business-records" + q, {
      method, cache: "no-store",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session?.access_token || ""}` },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Masla aaya");
    return j;
  }

  async function load() {
    setLoading(true);
    try { const j = await api("GET"); setRecords(j.records || []); }
    catch (e: any) { setOk(false); setMsg(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const isExpense = (r: any) =>
    String(r.record_type || r.category || "").toLowerCase().includes("expense");

  function resetForm() {
    setTitle(""); setType("income"); setAmount(""); setDescription(""); setEditingId(null);
  }

  async function saveRecord() {
    setMsg("");
    if (!title.trim() || !(Number(amount) > 0)) { setOk(false); setMsg("Title aur valid amount zaroor likhein."); return; }
    setSaving(true);
    try {
      const body = { id: editingId, title, type, amount, description };
      await api(editingId ? "PATCH" : "POST", body);
      setOk(true); setMsg(editingId ? "✅ Record update ho gaya" : "✅ Record save ho gaya");
      resetForm(); await load();
    } catch (e: any) { setOk(false); setMsg(e.message); }
    finally { setSaving(false); }
  }

  function editRecord(r: any) {
    setEditingId(r.id); setTitle(r.title || ""); setType(isExpense(r) ? "expense" : "income");
    setAmount(String(r.amount || "")); setDescription(r.description || ""); setMsg("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function deleteRecord(id: string) {
    if (!confirm("Kya aap ye record delete karna chahte hain?")) return;
    try { await api("DELETE", null, "?id=" + id); setOk(true); setMsg("✅ Record delete ho gaya"); load(); }
    catch (e: any) { setOk(false); setMsg(e.message); }
  }

  const income = records.filter((r) => !isExpense(r)).reduce((s, r) => s + Number(r.amount || 0), 0);
  const expenses = records.filter(isExpense).reduce((s, r) => s + Number(r.amount || 0), 0);
  const balance = income - expenses;
  const money = (n: number) => `Rs. ${n.toLocaleString("en-PK")}`;

  return (
    <div className="br">
      <div className="header">
        <div>
          <h1>Business Records</h1>
          <p className="sub">Apni team ki income aur expenses ka record manage karein.</p>
        </div>
        <div className="row">
          <button className="light" onClick={load} disabled={loading}>{loading ? "Loading..." : "↻ Refresh"}</button>
          <button className="light" onClick={resetForm}>Clear Form</button>
        </div>
      </div>

      <div className="stats">
        <div className="card stat"><span>Total Income</span><strong className="c-green">{money(income)}</strong></div>
        <div className="card stat"><span>Total Expenses</span><strong className="c-red">{money(expenses)}</strong></div>
        <div className="card stat"><span>Net Balance</span><strong className={balance >= 0 ? "c-blue" : "c-red"}>{money(balance)}</strong></div>
      </div>

      {msg && <div className={ok ? "msg good" : "msg bad"}>{msg}</div>}

      <div className="card">
        <h2>{editingId ? "Edit Record" : "Add New Record"}</h2>
        <label>Record Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Record ka naam" />
        <div className="grid">
          <div>
            <label>Record Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label>Amount (Rs.)</label>
            <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Misaal: 5000" />
          </div>
        </div>
        <label>Description</label>
        <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details likhein..." />
        <div className="row">
          <button className="blue" onClick={saveRecord} disabled={saving}>
            {saving ? "Saving..." : editingId ? "Update Record" : "Save Record"}
          </button>
          {editingId && <button className="light" onClick={resetForm}>Cancel</button>}
        </div>
      </div>

      <div className="card">
        <h2>Records List</h2>
        {loading ? <div className="empty">Load ho raha hai...</div> : records.length === 0 ? (
          <div className="empty">Abhi koi record nahi hai.</div>
        ) : (
          <div className="wrap">
            <table>
              <thead><tr><th>Title</th><th>Type</th><th>Amount</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id}>
                    <td><strong>{r.title}</strong>{r.description && <div className="desc">{r.description}</div>}</td>
                    <td><span className={isExpense(r) ? "badge ex" : "badge in"}>{isExpense(r) ? "Expense" : "Income"}</span></td>
                    <td className={isExpense(r) ? "c-red b" : "c-green b"}>{money(Number(r.amount || 0))}</td>
                    <td>{new Date(r.record_date || r.created_at).toLocaleDateString("en-PK")}</td>
                    <td className="row">
                      <button className="edit" onClick={() => editRecord(r)}>Edit</button>
                      <button className="del" onClick={() => deleteRecord(r.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style jsx>{`
        .br { width: 100%; color: #172033; font-family: Arial, sans-serif; }
        .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 20px; }
        h1 { font-size: 26px; font-weight: 700; margin: 0; }
        .sub { color: #64748b; font-size: 14px; margin-top: 7px; }
        .row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 20px; }
        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
        .stat { display: flex; flex-direction: column; gap: 10px; color: #64748b; font-size: 13px; margin-bottom: 0; }
        .stat strong { font-size: 22px; }
        h2 { font-size: 18px; margin: 0 0 16px; font-weight: 700; }
        label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 7px; color: #334155; }
        input, select, textarea { width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 16px; font-size: 14px; background: #fff; color: #172033; font-family: inherit; outline: none; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        button { border: 0; border-radius: 8px; padding: 10px 16px; cursor: pointer; font-weight: 600; font-size: 13px; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        .blue { background: #1d4ed8; color: #fff; }
        .light { background: #e2e8f0; color: #334155; }
        .edit { background: #e0f2fe; color: #0369a1; padding: 7px 12px; }
        .del { background: #fee2e2; color: #b91c1c; padding: 7px 12px; }
        .wrap { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; min-width: 650px; }
        th { text-align: left; padding: 12px; background: #f8fafc; color: #475569; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
        td { padding: 12px; font-size: 13px; border-bottom: 1px solid #e2e8f0; }
        .desc { color: #64748b; font-size: 12px; margin-top: 4px; }
        .badge { padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
        .in { background: #e5f7ee; color: #18885b; }
        .ex { background: #fee2e2; color: #b91c1c; }
        .b { font-weight: 700; }
        .c-green { color: #059669; } .c-red { color: #dc2626; } .c-blue { color: #2563eb; }
        .empty { padding: 25px; text-align: center; color: #64748b; }
        .msg { padding: 12px; border-radius: 8px; margin-bottom: 18px; font-size: 14px; }
        .good { background: #ecfdf5; color: #047857; }
        .bad { background: #fef2f2; color: #b91c1c; }

        :global(.dark) .br { color: #e5e7eb; }
        :global(.dark) h1, :global(.dark) h2, :global(.dark) td strong { color: #f1f3f5; }
        :global(.dark) .sub, :global(.dark) .stat, :global(.dark) .desc, :global(.dark) .empty, :global(.dark) label { color: #aeb4bd; }
        :global(.dark) .card { background: #15181d; border-color: #262a31; }
        :global(.dark) input, :global(.dark) select, :global(.dark) textarea { background: #0f1216; color: #f1f3f5; border-color: #2c313a; }
        :global(.dark) .light { background: #1a1e24; color: #e5e7eb; border: 1px solid #2c313a; }
        :global(.dark) .edit { background: #111a2b; color: #93c5fd; }
        :global(.dark) .del { background: #2b2022; color: #f87171; }
        :global(.dark) th { background: #111418; color: #858995; border-color: #262a31; }
        :global(.dark) td { color: #cbd5e1; border-color: #262a31; }
        :global(.dark) .in { background: #1c3027; color: #a8e6bf; }
        :global(.dark) .ex { background: #2b2022; color: #ffb4b4; }
        :global(.dark) .c-green { color: #4ade80; } :global(.dark) .c-red { color: #f87171; } :global(.dark) .c-blue { color: #60a5fa; }
        :global(.dark) .good { background: #1c3027; color: #a8e6bf; }
        :global(.dark) .bad { background: #2b2022; color: #ffb4b4; }
        @media (max-width: 600px) { .grid { grid-template-columns: 1fr; gap: 0; } }
      `}</style>
    </div>
  );
}
