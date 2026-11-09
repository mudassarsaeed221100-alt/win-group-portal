"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  first_name: string | null;
  surname: string | null;
  username: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role: string | null;
};

export default function StaffProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setMessage("");

    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();

    const user = sessionData.session?.user;

    if (sessionError || !user) {
      setMessage("Login session nahi mili. Dobara login karein.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      setMessage("Profile load nahi hui: " + error.message);
      setLoading(false);
      return;
    }

    const loadedProfile: Profile = {
      ...data,
      email: user.email || null,
    };

    setProfile(loadedProfile);
    setFirstName(data.first_name || "");
    setSurname(data.surname || "");
    setPhone(data.phone || "");
    setAvatarUrl(data.avatar_url || "");

    setLoading(false);
  }

  async function saveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!profile) return;

    if (!firstName.trim() || !surname.trim()) {
      setMessage("First Name aur Surname zaroor likhein.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: firstName.trim(),
        surname: surname.trim(),
        phone: phone.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profile.id);

    if (error) {
      setMessage("Profile update nahi hui: " + error.message);
    } else {
      setMessage("Profile successfully update ho gayi.");
      await loadProfile();
    }

    setSaving(false);
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (newPassword.length < 8) {
      setMessage("Password kam az kam 8 characters ka hona chahiye.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage("Password change nahi hua: " + error.message);
    } else {
      setMessage("Password successfully change ho gaya.");
      setNewPassword("");
    }

    setSaving(false);
  }

  if (loading) {
    return (
      <div className="p-6 text-gray-300">
        Profile load ho rahi hai...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      <div>
        <h2 className="text-2xl font-bold">My Profile & Account</h2>
        <p className="mt-1 text-sm text-gray-400">
          Apni personal details aur account password manage karein.
        </p>
      </div>

      {message && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm">
          {message}
        </div>
      )}

      <form
        onSubmit={saveProfile}
        className="space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-5"
      >
        <h3 className="text-lg font-semibold">Personal Information</h3>

        {profile?.avatar_url && (
          <img
            src={profile.avatar_url}
            alt="Profile"
            className="h-20 w-20 rounded-full border border-gray-600 object-cover"
          />
        )}

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            First Name
          </label>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Surname
          </label>
          <input
            value={surname}
            onChange={(e) => setSurname(e.target.value)}
            required
            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Email Address
          </label>
          <input
            value={profile?.email || ""}
            disabled
            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-gray-400"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Phone Number
          </label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone number"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            Profile Picture URL
          </label>
          <input
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="Image link paste karein"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
          />
          <p className="mt-1 text-xs text-gray-500">
            Filhal image URL supported hai; direct image upload abhi shamil nahi.
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </form>

      <form
        onSubmit={changePassword}
        className="space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-5"
      >
        <h3 className="text-lg font-semibold">Change Password</h3>

        <div>
          <label className="mb-2 block text-sm text-gray-300">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
            placeholder="Minimum 8 characters"
            className="w-full rounded-lg border border-gray-700 bg-gray-800 p-3 text-white"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-green-600 px-5 py-3 font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? "Updating..." : "Update Password"}
        </button>
      </form>
    </div>
  );
}
