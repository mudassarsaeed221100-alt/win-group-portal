
"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

export type WorkTask = {
  id: string;
  title: string;
  description: string | null;
  reward_amount: number;
  deadline: string | null;
  created_at: string;
};

type Props = {
  onSelectTask: (task: WorkTask) => void;
};

export default function AvailableWorkTasks({ onSelectTask }: Props) {
  const [tasks, setTasks] = useState<WorkTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadTasks() {
      setLoading(true);
      setError("");

      const { data, error } = await supabase
        .from("work_tasks")
        .select("id, title, description, reward_amount, deadline, created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (error) {
        setError(error.message);
        setTasks([]);
      } else {
        setTasks((data || []) as WorkTask[]);
      }

      setLoading(false);
    }

    loadTasks();

    return () => {
      isMounted = false;
    };
  }, []);

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString("en-PK", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  return (
    <div style={{
      background: "#17191d",
      border: "1px solid #30343b",
      borderRadius: "14px",
      padding: "28px",
      color: "#f1f3f5",
    }}>
      <div style={{ fontSize: "13px", color: "#aeb4bd" }}>
        STAFF WORKSPACE
      </div>

      <h2 style={{ fontSize: "24px", margin: "10px 0" }}>
        Available Work Tasks
      </h2>

      <p style={{ color: "#aeb4bd", lineHeight: 1.7 }}>
        Company ke available tasks yahan nazar aayenge.
        Proof submit karne ke liye pehle task select karein.
      </p>

      {loading ? (
        <div style={messageStyle}>
          Tasks load ho rahe hain...
        </div>
      ) : error ? (
        <div style={{
          ...messageStyle,
          background: "#2b2022",
          border: "1px solid #63383d",
          color: "#ffb4b4",
        }}>
          Tasks load nahi ho sake: {error}
        </div>
      ) : tasks.length === 0 ? (
        <div style={messageStyle}>
          <strong>No Active Tasks</strong>
          <p style={{ color: "#aeb4bd", fontSize: "14px" }}>
            Filhal aapke liye koi active task available nahi hai.
          </p>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "16px",
          marginTop: "24px",
        }}>
          {tasks.map((task) => (
            <div key={task.id} style={{
              padding: "20px",
              borderRadius: "10px",
              background: "#22262d",
              border: "1px solid #3a414b",
            }}>
              <h3 style={{ fontSize: "17px", margin: "0 0 10px" }}>
                {task.title}
              </h3>

              <p style={{
                color: "#aeb4bd",
                fontSize: "14px",
                lineHeight: 1.7,
                whiteSpace: "pre-wrap",
              }}>
                {task.description || "No description provided."}
              </p>

              <div style={{ marginTop: "16px", fontSize: "14px" }}>
                Reward: Rs. {Number(task.reward_amount).toLocaleString("en-PK")}
              </div>

              {task.deadline && (
                <div style={{
                  marginTop: "8px",
                  color: "#aeb4bd",
                  fontSize: "13px",
                }}>
                  Deadline: {formatDate(task.deadline)}
                </div>
              )}

              <button
                type="button"
                onClick={() => onSelectTask(task)}
                style={{
                  width: "100%",
                  marginTop: "18px",
                  padding: "12px",
                  border: "none",
                  borderRadius: "8px",
                  background: "#e5e7eb",
                  color: "#17191d",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Select Task
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const messageStyle: React.CSSProperties = {
  marginTop: "24px",
  padding: "20px",
  background: "#22262d",
  border: "1px solid #3a414b",
  borderRadius: "10px",
  color: "#f1f3f5",
};
