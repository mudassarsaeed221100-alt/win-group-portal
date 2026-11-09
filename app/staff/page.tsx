"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: "pending" | "in_progress" | "completed";
  due_date: string | null;
  created_at: string;
};

export default function StaffDashboard() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskLoading, setTaskLoading] = useState(false);
  const [taskError, setTaskError] = useState("");

  useEffect(() => {
    async function checkStaff() {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("username, role")
        .eq("id", user.id)
        .single();

      if (error || !profile || profile.role !== "staff") {
        await supabase.auth.signOut();
        router.replace("/");
        return;
      }

      setUsername(profile.username);
      setLoading(false);
      loadTasks();
    }

    checkStaff();
  }, [router]);

  async function loadTasks() {
    setTaskLoading(true);
    setTaskError("");

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setTaskError("Session expired. Please login again.");
      setTaskLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/tasks", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Tasks load nahi ho sake.");
      }

      setTasks(result.tasks || []);
    } catch (error) {
      setTaskError(
        error instanceof Error ? error.message : "Something went wrong."
      );
    } finally {
      setTaskLoading(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/");
  }

  if (loading) {
    return (
      <div style={{ padding: 40, fontFamily: "Arial" }}>
        Loading your workspace...
      </div>
    );
  }

  const cards = [
    {
      icon: "✓",
      title: "My Tasks",
      description: "View and manage your assigned work.",
      color: "#2563eb",
    },
    {
      icon: "▦",
      title: "Departments",
      description: "Explore your organization departments.",
      color: "#0891b2",
    },
    {
      icon: "▤",
      title: "My Reports",
      description: "Your work reports and performance.",
      color: "#7c3aed",
    },
    {
      icon: "⚙",
      title: "Account Settings",
      description: "Manage your account information.",
      color: "#059669",
    },
  ];

  return (
    <main style={{
      minHeight: "100vh",
      background: "#f4f7fb",
      fontFamily: "Arial, sans-serif",
      color: "#172033",
    }}>
      <header style={{
        background: "#101d35",
        color: "white",
        padding: "18px 5%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 15,
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 25, letterSpacing: 1 }}>
            WIN GROUP
          </h1>
          <p style={{
            margin: "5px 0 0",
            color: "#a9b9d2",
            fontSize: 12,
            letterSpacing: 2,
          }}>
            WOLF INDEPENDENT NATIONAL GROUP
          </p>
        </div>

        <button onClick={logout} style={{
          background: "#e34b55",
          color: "white",
          border: "none",
          padding: "11px 22px",
          borderRadius: 8,
          fontWeight: "bold",
          cursor: "pointer",
        }}>
          Logout
        </button>
      </header>

      <div style={{
        maxWidth: 1250,
        margin: "auto",
        padding: "35px 5%",
      }}>
        <section style={{
          background: "linear-gradient(120deg, #172c50, #2457a5)",
          color: "white",
          borderRadius: 18,
          padding: "35px 30px",
          boxShadow: "0 12px 30px rgba(20,50,100,0.13)",
        }}>
          <p style={{
            color: "#c8dcff",
            margin: "0 0 10px",
            fontSize: 13,
            letterSpacing: 2,
          }}>
            STAFF WORKSPACE
          </p>

          <h2 style={{ fontSize: 30, margin: "0 0 12px" }}>
            Welcome, {username}!
          </h2>

          <p style={{
            color: "#e0eaff",
            maxWidth: 600,
            lineHeight: 1.7,
            margin: 0,
          }}>
            Welcome to WIN GROUP. Your contribution matters.
            We are glad to have you as part of our team.
          </p>

          <div style={{
            marginTop: 25,
            display: "inline-block",
            background: "rgba(255,255,255,0.15)",
            padding: "9px 16px",
            borderRadius: 30,
            fontSize: 13,
          }}>
            ● Active Staff Account
          </div>
        </section>

        <div style={{ marginTop: 35 }}>
          <h2 style={{ fontSize: 22, marginBottom: 6 }}>
            Your Workspace
          </h2>
          <p style={{ color: "#718096", marginTop: 0 }}>
            Everything you need to get started with your work.
          </p>
        </div>

        <section style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(225px, 1fr))",
          gap: 20,
          marginTop: 22,
        }}>
          {cards.map((card) => (
            <div key={card.title} style={{
              background: "white",
              padding: 25,
              borderRadius: 14,
              border: "1px solid #e8edf5",
              boxShadow: "0 5px 18px rgba(20,40,80,0.04)",
            }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `${card.color}15`,
                color: card.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 25,
                fontWeight: "bold",
                marginBottom: 20,
              }}>
                {card.icon}
              </div>

              <h3 style={{ margin: "0 0 10px", fontSize: 18 }}>
                {card.title}
              </h3>

              <p style={{
                color: "#718096",
                fontSize: 13,
                lineHeight: 1.6,
                margin: 0,
              }}>
                {card.description}
              </p>

              <div style={{
                marginTop: 18,
                color: card.color,
                fontSize: 12,
                fontWeight: "bold",
              }}>
                {card.title === "My Tasks"
                  ? `${tasks.length} ASSIGNED TASKS`
                  : "COMING SOON"}
              </div>
            </div>
          ))}
        </section>

        <section style={{
          marginTop: 30,
          background: "white",
          border: "1px solid #e8edf5",
          borderRadius: 14,
          padding: 25,
        }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}>
            <div>
              <h2 style={{ margin: 0 }}>My Tasks</h2>
              <p style={{ color: "#718096", fontSize: 13 }}>
                Tasks assigned to your account.
              </p>
            </div>

            <button onClick={loadTasks} disabled={taskLoading} style={{
              background: "#2457a5",
              color: "white",
              border: "none",
              padding: "10px 18px",
              borderRadius: 8,
              cursor: "pointer",
            }}>
              {taskLoading ? "Loading..." : "Refresh Tasks"}
            </button>
          </div>

          {taskError && (
            <p style={{ color: "#dc2626" }}>{taskError}</p>
          )}

          {taskLoading && (
            <p style={{ color: "#718096" }}>Loading your tasks...</p>
          )}

          {!taskLoading && !taskError && tasks.length === 0 && (
            <p style={{
              padding: 20,
              background: "#f4f7fb",
              borderRadius: 10,
              color: "#718096",
              textAlign: "center",
            }}>
              No tasks assigned yet.
            </p>
          )}

          {!taskLoading && tasks.map((task) => (
            <div key={task.id} style={{
              border: "1px solid #e8edf5",
              borderRadius: 12,
              padding: 18,
              marginTop: 15,
            }}>
              <h3 style={{ margin: "0 0 10px" }}>
                {task.title}
              </h3>

              <p style={{
                color: "#718096",
                fontSize: 14,
                lineHeight: 1.6,
              }}>
                {task.description || "No description provided."}
              </p>

              <div style={{
                display: "flex",
                flexWrap: "wrap",
                gap: 15,
                fontSize: 13,
              }}>
                <span>
                  Status: <strong>{task.status.replace("_", " ")}</strong>
                </span>

                <span>
                  Due Date: <strong>{task.due_date || "Not set"}</strong>
                </span>
              </div>
            </div>
          ))}
        </section>

        <section style={{
          marginTop: 30,
          background: "white",
          border: "1px solid #e8edf5",
          borderRadius: 14,
          padding: 25,
        }}>
          <h3 style={{ marginTop: 0 }}>Your Account</h3>

          <div style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 15,
          }}>
            <div>
              <p style={{ color: "#718096", fontSize: 12 }}>USERNAME</p>
              <strong>{username}</strong>
            </div>

            <div>
              <p style={{ color: "#718096", fontSize: 12 }}>ACCOUNT ROLE</p>
              <strong>Staff Member</strong>
            </div>

            <div>
              <p style={{ color: "#718096", fontSize: 12 }}>ACCOUNT STATUS</p>
             <strong style={{ color: "#059669" }}>Active</strong>
            </div>
          </div>
        </section>

        <footer style={{
          textAlign: "center",
          color: "#8792a5",
          fontSize: 12,
          marginTop: 40,
          paddingBottom: 15,
        }}>
          © 2026 WIN GROUP. All Rights Reserved.
          <p>Grow Together. Achieve Together.</p>
        </footer>
      </div>
    </main>
  );
}
