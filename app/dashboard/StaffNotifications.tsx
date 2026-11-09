"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Notification = {
  id: string;
  title: string;
  message: string;
  notification_type: string;
  created_at: string;
};

export default function StaffNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadNotifications();
  }, []);

  async function loadNotifications() {
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

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.role) {
      setMessage("Account role load nahi ho saka.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("notifications")
      .select("id, title, message, notification_type, created_at")
      .eq("status", "active")
      .contains("recipient_roles", [profile.role])
      .order("created_at", { ascending: false });

    if (error) {
      setMessage("Notifications load nahi huin: " + error.message);
    } else {
      setNotifications(data || []);
    }

    setLoading(false);
  }

  function typeLabel(type: string) {
    switch (type) {
      case "announcement":
        return "Announcement";
      case "important":
        return "Important";
      case "warning":
        return "Warning";
      default:
        return "General";
    }
  }

  if (loading) {
    return (
      <div className="p-6 text-gray-300">
        Notifications load ho rahi hain...
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">My Notifications</h2>
          <p className="mt-1 text-sm text-gray-400">
            Founder aur management ki taraf se bheje gaye updates.
          </p>
        </div>

        <button
          onClick={loadNotifications}
          className="rounded-lg border border-gray-600 px-4 py-2 text-sm hover:bg-gray-800"
        >
          Refresh
        </button>
      </div>

      {message && (
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-3 text-sm">
          {message}
        </div>
      )}

      {notifications.length === 0 ? (
        <div className="rounded-xl border border-gray-700 bg-gray-900 p-8 text-center">
          <h3 className="font-semibold">No Notifications</h3>
          <p className="mt-2 text-sm text-gray-400">
            Filhal aap ke liye koi notification available nahi hai.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-gray-700 bg-gray-900 p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-lg font-semibold">{item.title}</h3>

                <span className="rounded-full bg-blue-900 px-3 py-1 text-xs text-blue-200">
                  {typeLabel(item.notification_type)}
                </span>
              </div>

              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-300">
                {item.message}
              </p>

              <p className="mt-4 text-xs text-gray-500">
                {new Date(item.created_at).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
