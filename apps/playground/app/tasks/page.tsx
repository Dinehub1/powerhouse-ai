"use client";

import { useState } from "react";
import Link from "next/link";

type TaskStatus = "completed" | "running" | "queued" | "failed";
type Priority = "high" | "medium" | "low";

interface Task {
  id: string;
  title: string;
  agent: string;
  status: TaskStatus;
  priority: Priority;
  createdAt: string;
  duration?: string;
  input: string;
}

const TASKS: Task[] = [
  { id: "tsk_001", title: "Research quantum computing trends", agent: "research-agent", status: "completed", priority: "high", createdAt: "2 min ago", duration: "34s", input: "Find latest papers on quantum error correction from 2026" },
  { id: "tsk_002", title: "Review PR #142 — auth refactor", agent: "code-reviewer", status: "running", priority: "high", createdAt: "5 min ago", input: "Review the authentication middleware changes for security issues" },
  { id: "tsk_003", title: "Generate weekly report", agent: "content-writer", status: "queued", priority: "medium", createdAt: "8 min ago", input: "Summarize this week's deployment metrics and incidents" },
  { id: "tsk_004", title: "Scan dependencies for CVEs", agent: "security-scanner", status: "completed", priority: "high", createdAt: "15 min ago", duration: "1m 12s", input: "Check all npm packages for known vulnerabilities" },
  { id: "tsk_005", title: "ETL pipeline — user events", agent: "data-pipeline", status: "failed", priority: "medium", createdAt: "22 min ago", duration: "2m 5s", input: "Process user event logs from S3 and load into warehouse" },
  { id: "tsk_006", title: "Answer support ticket #8820", agent: "customer-support", status: "completed", priority: "low", createdAt: "30 min ago", duration: "18s", input: "Help customer with billing dispute for March invoice" },
  { id: "tsk_007", title: "Translate docs to Japanese", agent: "content-writer", status: "queued", priority: "low", createdAt: "45 min ago", input: "Translate the Getting Started guide to Japanese" },
  { id: "tsk_008", title: "Optimize database queries", agent: "code-reviewer", status: "completed", priority: "medium", createdAt: "1h ago", duration: "52s", input: "Analyze slow queries from pg_stat_statements and suggest indexes" },
];

const STATUS_COLORS: Record<TaskStatus, string> = {
  completed: "#22c55e",
  running: "#f97316",
  queued: "#71717a",
  failed: "#ef4444",
};

const PRIORITY_COLORS: Record<Priority, string> = {
  high: "#ef4444",
  medium: "#eab308",
  low: "#3b82f6",
};

export default function TasksPage() {
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const filtered = filter === "all" ? TASKS : TASKS.filter((t) => t.status === filter);

  const counts = {
    all: TASKS.length,
    running: TASKS.filter((t) => t.status === "running").length,
    queued: TASKS.filter((t) => t.status === "queued").length,
    completed: TASKS.filter((t) => t.status === "completed").length,
    failed: TASKS.filter((t) => t.status === "failed").length,
  };

  return (
    <div style={{ padding: "2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>Tasks</h1>
          <p style={{ margin: "0.25rem 0 0", color: "#71717a", fontSize: "0.85rem" }}>
            Work items assigned to your agents
          </p>
        </div>
        <button
          style={{
            padding: "0.6rem 1.25rem",
            background: "#f97316",
            color: "#000",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: "0.8rem",
            cursor: "pointer",
          }}
        >
          + New Task
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.25rem" }}>
        {(["all", "running", "queued", "completed", "failed"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "0.4rem 0.9rem",
              borderRadius: 999,
              border: filter === f ? "1px solid #f97316" : "1px solid #27272a",
              background: filter === f ? "rgba(249,115,22,0.1)" : "#18181b",
              color: filter === f ? "#f97316" : "#71717a",
              fontSize: "0.75rem",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Task List */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {filtered.map((task) => (
          <div
            key={task.id}
            style={{
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: 10,
              padding: "1rem 1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
            }}
          >
            {/* Status dot */}
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: STATUS_COLORS[task.status],
                flexShrink: 0,
                animation: task.status === "running" ? "blink 1.5s ease-in-out infinite" : "none",
              }}
            />

            {/* Content */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#fafafa" }}>{task.title}</span>
                <span
                  style={{
                    fontSize: "0.6rem",
                    padding: "0.15rem 0.5rem",
                    borderRadius: 999,
                    background: "rgba(0,0,0,0.3)",
                    border: `1px solid ${PRIORITY_COLORS[task.priority]}40`,
                    color: PRIORITY_COLORS[task.priority],
                    fontWeight: 600,
                    textTransform: "uppercase",
                  }}
                >
                  {task.priority}
                </span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#71717a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {task.input}
              </div>
            </div>

            {/* Agent */}
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <Link
                href={`/agents/${task.agent}`}
                style={{ fontSize: "0.75rem", color: "#f97316", textDecoration: "none" }}
              >
                🤖 {task.agent}
              </Link>
              <div style={{ fontSize: "0.7rem", color: "#52525b", marginTop: "0.15rem" }}>
                {task.createdAt}
                {task.duration && <span> · {task.duration}</span>}
              </div>
            </div>

            {/* Status badge */}
            <span
              style={{
                fontSize: "0.7rem",
                padding: "0.25rem 0.6rem",
                borderRadius: 999,
                background: `${STATUS_COLORS[task.status]}15`,
                color: STATUS_COLORS[task.status],
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {task.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
