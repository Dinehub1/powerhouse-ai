"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = "agent_run" | "tool_call" | "task_complete" | "error" | "system";
type EventStatus = "success" | "error" | "running" | "warning";

interface ActivityEvent {
  id: string;
  timestamp: Date;
  type: EventType;
  agentName: string;
  description: string;
  detail?: string;
  duration?: number; // ms
  status: EventStatus;
}

type FilterType = "all" | EventType;

// ─── Mock data ────────────────────────────────────────────────────────────────

const RAW_EVENTS: Omit<ActivityEvent, "timestamp">[] = [
  {
    id: "1",
    type: "system",
    agentName: "Platform",
    description: "ResearchAgent v2.1 deployed to production",
    detail: "Image: sha256:4f2a · Region: iad1",
    status: "success",
  },
  {
    id: "2",
    type: "agent_run",
    agentName: "ResearchAgent",
    description: "Started run — Research latest AI safety papers",
    detail: "Run ID: run_7fK2m · Model: kimi-k2.5",
    duration: undefined,
    status: "running",
  },
  {
    id: "3",
    type: "tool_call",
    agentName: "ResearchAgent",
    description: "web-search called — AI safety arxiv 2026",
    detail: "Returned 12 results",
    duration: 843,
    status: "success",
  },
  {
    id: "4",
    type: "tool_call",
    agentName: "ResearchAgent",
    description: "web-search called — Constitutional AI techniques",
    detail: "Returned 9 results",
    duration: 1120,
    status: "success",
  },
  {
    id: "5",
    type: "error",
    agentName: "CodeReviewAgent",
    description: "Tool call failed — code-review timed out",
    detail: "Timeout after 30 000 ms · Retry 3/3 exhausted",
    duration: 30000,
    status: "error",
  },
  {
    id: "6",
    type: "agent_run",
    agentName: "CodeReviewAgent",
    description: "Completed run — Review PR #482",
    detail: "Run ID: run_9aX1p · 3 issues found",
    duration: 18420,
    status: "success",
  },
  {
    id: "7",
    type: "task_complete",
    agentName: "SupervisorAgent",
    description: "Task completed — Sprint planning analysis",
    detail: "Delegated to: PlannerAgent, CodeReviewAgent",
    duration: 42100,
    status: "success",
  },
  {
    id: "8",
    type: "error",
    agentName: "SummaryAgent",
    description: "API rate limit hit — NVIDIA endpoint throttled",
    detail: "HTTP 429 · Retry-After: 60 s",
    status: "error",
  },
  {
    id: "9",
    type: "tool_call",
    agentName: "MathAgent",
    description: "calculator called — Monte Carlo simulation (n=100 000)",
    detail: "Result: 3.14159",
    duration: 211,
    status: "success",
  },
  {
    id: "10",
    type: "system",
    agentName: "Platform",
    description: "Config updated — max_tokens raised to 8 192",
    detail: "Changed by: admin · Env: production",
    status: "success",
  },
  {
    id: "11",
    type: "agent_run",
    agentName: "SummaryAgent",
    description: "Started run — Summarise Q1 engineering report",
    detail: "Run ID: run_3bZ7k · Model: kimi-k2.5",
    status: "running",
  },
  {
    id: "12",
    type: "tool_call",
    agentName: "CodeReviewAgent",
    description: "code-review called — packages/core/src/agent.ts",
    detail: "2 suggestions, 0 critical issues",
    duration: 3870,
    status: "success",
  },
  {
    id: "13",
    type: "task_complete",
    agentName: "SupervisorAgent",
    description: "Task completed — Competitive landscape report",
    detail: "4 sub-tasks · Total tokens: 28 441",
    duration: 91200,
    status: "success",
  },
  {
    id: "14",
    type: "error",
    agentName: "ResearchAgent",
    description: "Memory write failed — vector store unavailable",
    detail: "PGVector timeout · Will retry on next run",
    status: "warning",
  },
  {
    id: "15",
    type: "agent_run",
    agentName: "PlannerAgent",
    description: "Completed run — Generate roadmap for Q2",
    detail: "Run ID: run_1cY8n · 7 milestones created",
    duration: 23670,
    status: "success",
  },
];

// Space events across the last 90 minutes in reverse-chronological order
const NOW = new Date("2026-03-22T14:30:00Z");
const EVENTS: ActivityEvent[] = RAW_EVENTS.map((e, i) => ({
  ...e,
  timestamp: new Date(NOW.getTime() - i * 6 * 60 * 1000), // 6 min apart
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const EVENT_META: Record<
  EventType,
  { label: string; icon: string; color: string; bg: string }
> = {
  agent_run: { label: "Agent Run", icon: "🤖", color: "#3b82f6", bg: "#1e3a5f" },
  tool_call: { label: "Tool Call", icon: "⚙️", color: "#a855f7", bg: "#2e1a47" },
  task_complete: { label: "Task", icon: "✅", color: "#22c55e", bg: "#14301e" },
  error: { label: "Error", icon: "⚠️", color: "#ef4444", bg: "#3b1212" },
  system: { label: "System", icon: "🛠", color: "#eab308", bg: "#332d00" },
};

const STATUS_COLOR: Record<EventStatus, string> = {
  success: "#22c55e",
  error: "#ef4444",
  running: "#f97316",
  warning: "#eab308",
};

const STATUS_LABEL: Record<EventStatus, string> = {
  success: "Success",
  error: "Error",
  running: "Running",
  warning: "Warning",
};

function formatTime(d: Date) {
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function formatRelative(d: Date) {
  const diff = Math.floor((NOW.getTime() - d.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

const UNIQUE_AGENTS = Array.from(new Set(EVENTS.map((e) => e.agentName)));

// ─── Filter pill ──────────────────────────────────────────────────────────────

function FilterPill({
  label,
  active,
  color,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  color?: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.35rem 0.75rem",
        borderRadius: 999,
        border: active ? `1px solid ${color ?? "#f97316"}` : "1px solid #27272a",
        background: active ? (color ? `${color}18` : "#f9731618") : "#18181b",
        color: active ? (color ?? "#f97316") : "#71717a",
        fontSize: "0.78rem",
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {label}
      <span
        style={{
          background: active ? (color ?? "#f97316") : "#27272a",
          color: active ? "#000" : "#71717a",
          borderRadius: 999,
          fontSize: "0.65rem",
          fontWeight: 700,
          padding: "0.05rem 0.4rem",
          minWidth: 18,
          textAlign: "center",
        }}
      >
        {count}
      </span>
    </button>
  );
}

// ─── Timeline entry ───────────────────────────────────────────────────────────

function TimelineEntry({ event, isLast }: { event: ActivityEvent; isLast: boolean }) {
  const [hovered, setHovered] = useState(false);
  const meta = EVENT_META[event.type];

  return (
    <div style={{ display: "flex", gap: "1rem", position: "relative" }}>
      {/* Vertical line */}
      {!isLast && (
        <div
          style={{
            position: "absolute",
            left: 17,
            top: 36,
            bottom: -8,
            width: 1,
            background: "#27272a",
          }}
        />
      )}

      {/* Icon dot */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: meta.bg,
          border: `1.5px solid ${meta.color}40`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.9rem",
          flexShrink: 0,
          position: "relative",
          zIndex: 1,
        }}
      >
        {meta.icon}
      </div>

      {/* Card */}
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          flex: 1,
          background: hovered ? "#1c1c1f" : "#18181b",
          border: `1px solid ${hovered ? "#3f3f46" : "#27272a"}`,
          borderRadius: 10,
          padding: "0.75rem 1rem",
          marginBottom: "0.75rem",
          transition: "background 0.15s, border-color 0.15s",
          cursor: "default",
        }}
      >
        {/* Top row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexWrap: "wrap",
            marginBottom: "0.35rem",
          }}
        >
          {/* Event type badge */}
          <span
            style={{
              fontSize: "0.68rem",
              fontWeight: 700,
              color: meta.color,
              background: meta.bg,
              border: `1px solid ${meta.color}30`,
              borderRadius: 4,
              padding: "0.1rem 0.4rem",
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            }}
          >
            {meta.label}
          </span>

          {/* Agent name */}
          <span
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "#a1a1aa",
              background: "#27272a",
              borderRadius: 4,
              padding: "0.1rem 0.4rem",
            }}
          >
            {event.agentName}
          </span>

          {/* Status */}
          <span
            style={{
              marginLeft: "auto",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.72rem",
              color: STATUS_COLOR[event.status],
              fontWeight: 600,
            }}
          >
            {event.status === "running" ? (
              <span style={{ animation: "blink 1s step-end infinite", fontSize: "0.5rem" }}>●</span>
            ) : (
              <span style={{ fontSize: "0.5rem" }}>●</span>
            )}
            {STATUS_LABEL[event.status]}
          </span>
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: "0.875rem",
            color: "#e4e4e7",
            fontWeight: 500,
            marginBottom: event.detail || event.duration ? "0.4rem" : 0,
            lineHeight: 1.4,
          }}
        >
          {event.description}
        </div>

        {/* Detail */}
        {event.detail && (
          <div
            style={{
              fontSize: "0.75rem",
              color: "#71717a",
              fontFamily: "monospace",
              marginBottom: event.duration ? "0.35rem" : 0,
            }}
          >
            {event.detail}
          </div>
        )}

        {/* Footer row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            marginTop: "0.5rem",
            paddingTop: "0.5rem",
            borderTop: "1px solid #27272a",
          }}
        >
          <span style={{ fontSize: "0.72rem", color: "#52525b" }}>
            {formatTime(event.timestamp)}
          </span>
          <span style={{ fontSize: "0.72rem", color: "#3f3f46" }}>
            {formatRelative(event.timestamp)}
          </span>
          {event.duration !== undefined && (
            <span
              style={{
                marginLeft: "auto",
                fontSize: "0.72rem",
                color: "#52525b",
                background: "#27272a",
                borderRadius: 4,
                padding: "0.1rem 0.4rem",
              }}
            >
              {formatDuration(event.duration)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Stats bar ────────────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div
      style={{
        background: "#18181b",
        border: "1px solid #27272a",
        borderRadius: 10,
        padding: "0.75rem 1rem",
        flex: 1,
        minWidth: 100,
      }}
    >
      <div style={{ fontSize: "1.4rem", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "0.72rem", color: "#71717a", marginTop: "0.25rem" }}>{label}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ActivityPage() {
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [agentFilter, setAgentFilter] = useState<string>("all");
  const [tick, setTick] = useState(0);

  // Tick every second to animate "running" entries
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Suppress unused var lint — tick used to force re-render for blinking pulse
  void tick;

  const filtered = EVENTS.filter((e) => {
    if (typeFilter !== "all" && e.type !== typeFilter) return false;
    if (agentFilter !== "all" && e.agentName !== agentFilter) return false;
    return true;
  });

  const counts: Record<FilterType, number> = {
    all: EVENTS.length,
    agent_run: EVENTS.filter((e) => e.type === "agent_run").length,
    tool_call: EVENTS.filter((e) => e.type === "tool_call").length,
    task_complete: EVENTS.filter((e) => e.type === "task_complete").length,
    error: EVENTS.filter((e) => e.type === "error").length,
    system: EVENTS.filter((e) => e.type === "system").length,
  };

  const successCount = EVENTS.filter((e) => e.status === "success").length;
  const errorCount = EVENTS.filter((e) => e.status === "error").length;
  const runningCount = EVENTS.filter((e) => e.status === "running").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", overflow: "hidden" }}>
        {/* Header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #27272a",
            background: "#09090b",
            flexShrink: 0,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "#fafafa",
                letterSpacing: "-0.02em",
              }}
            >
              Activity
            </h1>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#71717a", marginTop: "0.15rem" }}>
              Real-time event timeline across all agents
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            {/* Live badge */}
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 999,
                padding: "0.3rem 0.75rem",
                fontSize: "0.72rem",
                color: "#a1a1aa",
              }}
            >
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#22c55e",
                  animation: "blink 2s ease-in-out infinite",
                  display: "inline-block",
                }}
              />
              Live
            </div>

            {/* Date range (mock) */}
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 8,
                padding: "0.35rem 0.75rem",
                fontSize: "0.78rem",
                color: "#a1a1aa",
                cursor: "pointer",
              }}
            >
              📅 Last 90 min
            </button>

            {/* Export (mock) */}
            <button
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 8,
                padding: "0.35rem 0.75rem",
                fontSize: "0.78rem",
                color: "#a1a1aa",
                cursor: "pointer",
              }}
            >
              ↓ Export
            </button>
          </div>
        </header>

        <div style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}>
          {/* Stats row */}
          <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
            <StatCard label="Total Events" value={EVENTS.length} color="#fafafa" />
            <StatCard label="Successful" value={successCount} color="#22c55e" />
            <StatCard label="Errors" value={errorCount} color="#ef4444" />
            <StatCard label="Running" value={runningCount} color="#f97316" />
            <StatCard label="Agents Active" value={UNIQUE_AGENTS.length} color="#3b82f6" />
          </div>

          {/* Filters row */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.5rem",
              marginBottom: "1.25rem",
              alignItems: "center",
            }}
          >
            {/* Type filters */}
            <FilterPill label="All" active={typeFilter === "all"} count={counts.all} onClick={() => setTypeFilter("all")} />
            {(Object.keys(EVENT_META) as EventType[]).map((t) => (
              <FilterPill
                key={t}
                label={EVENT_META[t].label}
                active={typeFilter === t}
                color={EVENT_META[t].color}
                count={counts[t]}
                onClick={() => setTypeFilter(t)}
              />
            ))}

            {/* Divider */}
            <div style={{ width: 1, height: 24, background: "#27272a", margin: "0 0.25rem" }} />

            {/* Agent filter */}
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              style={{
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 8,
                color: agentFilter === "all" ? "#71717a" : "#fafafa",
                fontSize: "0.78rem",
                padding: "0.35rem 0.625rem",
                cursor: "pointer",
                outline: "none",
              }}
            >
              <option value="all">All Agents</option>
              {UNIQUE_AGENTS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>

            {/* Result count */}
            <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#52525b" }}>
              {filtered.length} event{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Timeline */}
          {filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "3rem",
                color: "#52525b",
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 12,
              }}
            >
              No events match the current filters.
            </div>
          ) : (
            <div>
              {filtered.map((event, i) => (
                <TimelineEntry key={event.id} event={event} isLast={i === filtered.length - 1} />
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
