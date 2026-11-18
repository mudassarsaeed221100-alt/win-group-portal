"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function Departments() {
  const [list, setList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const r = await fetch("/api/admin/departments", {
        headers: { Authorization: `Bearer ${data.session?.access_token || ""}` },
        cache: "no-store",
      });
      const j = await r.json();
      if (!r.ok) setError(j.error || "Departments load nahi huay.");
      else setList(j.departments || []);
    } catch {
      setError("Server se connection nahi ho saka.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const active = (d: any) => !["inactive", "disabled"].includes(String(d.status || "").toLowerCase());
  const shown = list.filter((d) =>
    `${d.name || ""} ${d.description || ""}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dep">
      <div className="header">
        <div>
          <h1>Departments</h1>
          <p className="sub">Company ke departments. Departments Founder banata hai.</p>
        </div>
        <div className="row">
          <span className="count">Total: {list.length} · Active: {list.filter(active).length}</span>
          <button onClick={load} disabled={loading}>{loading ? "Loading..." : "↻ Refresh"}</button>
        </div>
      </div>

      <div className="card">
        <input placeholder="🔍 Department dhoondein" value={search} onChange={(e) => setSearch(e.target.value)} />

        {error && <div className="error">{error}</div>}

        {loading ? (
          <div className="empty">Load ho raha hai...</div>
        ) : shown.length === 0 ? (
          <div className="empty">Abhi koi department nahi hai.</div>
        ) : (
          <div className="list">
            {shown.map((d) => (
              <div key={d.id} className="item">
                <div style={{ flex: 1 }}>
                  <h3>🏢 {d.name}</h3>
                  <p>{d.description || "No description"}</p>
                  <span className="date">
                    Created: {d.created_at ? new Date(d.created_at).toLocaleDateString("en-PK") : "—"}
                  </span>
                </div>
                <span className={active(d) ? "badge on" : "badge off"}>
                  {active(d) ? "Active" : "Inactive"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .dep { width: 100%; color: #172033; font-family: Arial, sans-serif; }
        .header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 22px; }
        h1 { font-size: 26px; font-weight: 700; margin: 0; }
        .sub { color: #64748b; font-size: 14px; margin-top: 7px; }
        .row { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
        .count { background: #eff6ff; color: #1d4ed8; padding: 10px 15px; border-radius: 8px; font-weight: 600; font-size: 13px; }
        button { background: #1d4ed8; color: #fff; border: 0; border-radius: 8px; padding: 10px 16px; cursor: pointer; font-weight: 600; }
        button:disabled { opacity: 0.6; }
        .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; }
        input { width: 100%; box-sizing: border-box; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; margin-bottom: 16px; font-size: 14px; background: #fff; color: #172033; outline: none; }
        .list { display: grid; gap: 12px; }
        .item { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 9px; }
        .item h3 { margin: 0; font-size: 16px; }
        .item p { margin: 7px 0; color: #64748b; font-size: 13px; }
        .date { color: #94a3b8; font-size: 12px; }
        .badge { padding: 5px 11px; border-radius: 20px; font-size: 12px; font-weight: 700; }
        .on { background: #e5f7ee; color: #18885b; }
        .off { background: #f1f5f9; color: #64748b; }
        .empty { padding: 25px; text-align: center; color: #64748b; }
        .error { padding: 13px; background: #fef2f2; color: #b91c1c; border-radius: 8px; margin-bottom: 12px; font-size: 13px; }

        :global(.dark) .dep { color: #e5e7eb; }
        :global(.dark) h1, :global(.dark) .item h3 { color: #f1f3f5; }
        :global(.dark) .sub, :global(.dark) .item p, :global(.dark) .empty { color: #aeb4bd; }
        :global(.dark) .card { background: #15181d; border-color: #262a31; }
        :global(.dark) .item { border-color: #262a31; background: #1a1e24; }
        :global(.dark) input { background: #0f1216; color: #f1f3f5; border-color: #2c313a; }
        :global(.dark) .count { background: #111a2b; color: #93c5fd; }
        :global(.dark) button { background: #1a1e24; color: #93c5fd; border: 1px solid #2c313a; }
        :global(.dark) .on { background: #1c3027; color: #a8e6bf; }
        :global(.dark) .off { background: #22262d; color: #858995; }
        :global(.dark) .error { background: #2b2022; color: #ffb4b4; }
      `}</style>
    </div>
  );
}
