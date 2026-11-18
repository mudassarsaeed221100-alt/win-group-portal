"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ProfileSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [ok, setOk] = useState(true);
  const [show, setShow] = useState(false);
  const [profile, setProfile] = useState({
    first_name: "", surname: "", phone: "", email: "", username: "", team_code: "",
  });
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");

  function note(text: string, good: boolean) {
    setMessage(text);
    setOk(good);
  }

  useEffect(() => {
    async function loadProfile() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { note("Login session nahi mili.", false); setLoading(false); return; }

      const { data: d, error } = await supabase
        .from("profiles")
        .select("first_name, surname, phone, email, username, team_code")
        .eq("id", data.user.id)
        .single();

      if (error) note("Profile load nahi ho saki: " + error.message, false);
      else setProfile({
        first_name: d.first_name || "",
        surname: d.surname || "",
        phone: d.phone || "",
        email: d.email || data.user.email || "",
        username: d.username || "",
        team_code: d.team_code || "",
      });
      setLoading(false);
    }
    loadProfile();
  }, []);

  async function saveProfile() {
    if (!profile.first_name.trim()) return note("First name likhein.", false);
    setSaving(true);
    setMessage("");
    const { data } = await supabase.auth.getUser();
    if (!data.user) { note("Login session nahi mili.", false); setSaving(false); return; }

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: profile.first_name.trim(),
        surname: profile.surname.trim(),
        phone: profile.phone.trim(),
      })
      .eq("id", data.user.id);

    if (error) note("Profile save nahi hui: " + error.message, false);
    else note("✅ Profile successfully update ho gayi.", true);
    setSaving(false);
  }

  async function changePassword() {
    setMessage("");
    if (newPass.length < 6) return note("Password kam az kam 6 characters ka hona chahiye.", false);
    if (newPass !== confirmPass) return note("Dono passwords match nahi karte.", false);

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    if (error) note("Password change nahi hua: " + error.message, false);
    else { note("✅ Password successfully change ho gaya.", true); setNewPass(""); setConfirmPass(""); }
    setSaving(false);
  }

  if (loading) return <div className="ps-loading">Profile load ho rahi hai...</div>;

  return (
    <div className="ps">
      <h1>Profile & Account Settings</h1>
      <p className="sub">Apni personal information aur account settings manage karein.</p>

      {message && <div className={ok ? "msg good" : "msg bad"}>{message}</div>}

      <div className="card">
        <h2>Personal Information</h2>

        <div className="grid">
          <div>
            <label>First Name</label>
            <input value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} />
          </div>
          <div>
            <label>Surname</label>
            <input value={profile.surname} onChange={(e) => setProfile({ ...profile, surname: e.target.value })} />
          </div>
        </div>

        <label>📱 Phone</label>
        <input value={profile.phone} placeholder="03XXXXXXXXX" onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />

        <label>Email 🔒</label>
        <input className="locked" value={profile.email} readOnly />

        <div className="grid">
          <div>
            <label>Username 🔒</label>
            <input className="locked" value={profile.username} readOnly />
          </div>
          <div>
            <label>Team Code 🔒</label>
            <input className="locked" value={profile.team_code || "—"} readOnly />
          </div>
        </div>
        <p className="hint">Email, Username aur Team Code sirf Founder badal sakta hai.</p>

        <button onClick={saveProfile} disabled={saving}>{saving ? "Saving..." : "💾 Save Profile"}</button>
      </div>

      <div className="card">
        <div className="row">
          <h2>Change Password</h2>
          <span className="toggle" onClick={() => setShow(!show)}>{show ? "🙈 Hide" : "👁️ Show"}</span>
        </div>

        <label>New Password</label>
        <input type={show ? "text" : "password"} placeholder="New password" value={newPass} onChange={(e) => setNewPass(e.target.value)} />

        <label>Confirm New Password</label>
        <input type={show ? "text" : "password"} placeholder="Confirm new password" value={confirmPass} onChange={(e) => setConfirmPass(e.target.value)} />

        <button onClick={changePassword} disabled={saving}>{saving ? "Please Wait..." : "🔑 Update Password"}</button>
      </div>

      <style jsx>{`
        .ps { color: #172033; width: 100%; font-family: Arial, sans-serif; }
        .ps-loading { padding: 25px; }
        h1 { font-size: 25px; margin: 0 0 6px; }
        .sub { color: #64748b; margin: 0 0 22px; }
        .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 22px; margin-bottom: 20px; max-width: 720px; }
        h2 { font-size: 18px; margin: 0 0 6px; }
        .row { display: flex; justify-content: space-between; align-items: center; }
        .toggle { cursor: pointer; color: #2563eb; font-size: 13px; font-weight: 600; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        label { display: block; margin-top: 15px; font-size: 13px; font-weight: 600; color: #334155; }
        input { width: 100%; padding: 12px; border: 1px solid #dbe2ea; border-radius: 8px; margin-top: 6px; box-sizing: border-box; font-size: 14px; background: #fff; color: #172033; outline: none; }
        input:focus { border-color: #3477db; }
        .locked { background: #f1f5f9; color: #64748b; }
        .hint { font-size: 12px; color: #94a3b8; margin: 10px 0 0; }
        button { background: #172554; color: white; padding: 11px 18px; border: none; border-radius: 8px; cursor: pointer; margin-top: 16px; font-weight: 600; }
        button:disabled { opacity: 0.6; cursor: not-allowed; }
        .msg { padding: 12px; border-radius: 8px; margin-bottom: 18px; font-size: 14px; max-width: 720px; box-sizing: border-box; }
        .good { background: #ecfdf5; color: #047857; }
        .bad { background: #fef2f2; color: #b91c1c; }

        :global(.dark) .ps { color: #e5e7eb; }
        :global(.dark) h1, :global(.dark) h2 { color: #f1f3f5; }
        :global(.dark) .sub, :global(.dark) .hint { color: #aeb4bd; }
        :global(.dark) .card { background: #15181d; border-color: #262a31; }
        :global(.dark) label { color: #aeb4bd; }
        :global(.dark) input { background: #0f1216; color: #f1f3f5; border-color: #2c313a; }
        :global(.dark) .locked { background: #1a1e24; color: #858995; }
        :global(.dark) button { background: #e5e7eb; color: #111; }
        :global(.dark) .toggle { color: #60a5fa; }
        :global(.dark) .good { background: #1c3027; color: #a8e6bf; }
        :global(.dark) .bad { background: #2b2022; color: #ffb4b4; }

        @media (max-width: 600px) { .grid { grid-template-columns: 1fr; gap: 0; } }
      `}</style>
    </div>
  );
}
