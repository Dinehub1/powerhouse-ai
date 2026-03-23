"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

type AgentStatus = "online" | "offline" | "error" | "busy";
type TaskStatus = "success" | "running" | "failed" | "queued";

interface Agent {
  id: string;
  name: string;
  description: string;
  status: AgentStatus;
  tasksRun: number;
  lastSeen: string;
  model: string;
}

interface ActivityItem {
  id: string;
  agent: string;
  task: string;
  status: TaskStatus;
  duration: string;
  timestamp: string;
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const AGENTS: Agent[] = [
  { id: "research-agent", name: "research-agent", description: "Web research, summarization, and fact-checking", status: "online", tasksRun: 1284, lastSeen: "just now", model: "kimi-k2.5" },
  { id: "code-reviewer", name: "code-reviewer", description: "Static analysis, PR review, and bug detection", status: "busy", tasksRun: 847, lastSeen: "2m ago", model: "kimi-k2.5" },
  { id: "data-pipeline", name: "data-pipeline", description: "ETL orchestration and data transformation", status: "online", tasksRun: 3012, lastSeen: "just now", model: "kimi-k2.5" },
  { id: "doc-writer", name: "doc-writer", description: "API docs, changelogs, and technical writing", status: "offline", tasksRun: 492, lastSeen: "1h ago", model: "kimi-k2.5" },
  { id: "test-runner", name: "test-runner", description: "Generate and execute test suites end-to-end", status: "error", tasksRun: 218, lastSeen: "34m ago", model: "kimi-k2.5" },
  { id: "deploy-sentinel", name: "deploy-sentinel", description: "Monitor deployments and trigger rollbacks", status: "online", tasksRun: 703, lastSeen: "just now", model: "kimi-k2.5" },
];

const ACTIVITY: ActivityItem[] = [
  { id: "act-1", agent: "research-agent", task: "Summarize arXiv paper on mixture-of-experts scaling", status: "success", duration: "3.2s", timestamp: "just now" },
  { id: "act-2", agent: "code-reviewer", task: "Review PR #482 — refactor auth middleware", status: "running", duration: "12s", timestamp: "12s ago" },
  { id: "act-3", agent: "data-pipeline", task: "Ingest Stripe webhook events → BigQuery", status: "success", duration: "1.8s", timestamp: "1m ago" },
  { id: "act-4", agent: "test-runner", task: "Run integration suite for payments module", status: "failed", duration: "28s", timestamp: "34m ago" },
  { id: "act-5", agent: "doc-writer", task: "Generate changelog for v1.4.0 release", status: "success", duration: "5.1s", timestamp: "1h ago" },
  { id: "act-6", agent: "deploy-sentinel", task: "Health check — prod edge functions", status: "success", duration: "0.4s", timestamp: "2h ago" },
  { id: "act-7", agent: "research-agent", task: "Competitive analysis: LLM pricing tiers Q2 2025", status: "success", duration: "8.7s", timestamp: "3h ago" },
  { id: "act-8", agent: "data-pipeline", task: "Sync CRM contacts → Postgres", status: "queued", duration: "—", timestamp: "queued" },
];

// ─── Colors ──────────────────────────────────────────────────────────────────

const C = {
  bg: "#09090b", surface: "#18181b", border: "#27272a", borderMid: "#3f3f46",
  accent: "#f97316", text: "#fafafa", textMuted: "#a1a1aa", textDim: "#71717a", textFaint: "#52525b",
  green: "#22c55e", greenDim: "#14532d", greenBg: "#0c1a0c",
  red: "#ef4444", redDim: "#7f1d1d", redBg: "#1a0c0c",
} as const;

function agentStatusColor(s: AgentStatus) {
  return { online: C.green, busy: C.accent, offline: C.textFaint, error: C.red }[s];
}

function taskStatusStyle(s: TaskStatus) {
  return {
    success: { color: C.green, bg: C.greenBg, border: C.greenDim },
    running: { color: C.accent, bg: "#1a0e00", border: "#7c2d12" },
    failed: { color: C.red, bg: C.redBg, border: C.redDim },
    queued: { color: C.textDim, bg: C.surface, border: C.border },
  }[s];
}

// ─── Dashboard Page ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  const onlineCount = AGENTS.filter((a) => a.status === "online" || a.status === "busy").length;
  const runningCount = ACTIVITY.filter((a) => a.status === "running").length;
  const successCount = ACTIVITY.filter((a) => a.status === "success").length;
  const doneCount = ACTIVITY.filter((a) => a.status !== "queued" && a.status !== "running").length;
  const successRate = doneCount > 0 ? Math.round((successCount / doneCount) * 100) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top bar */}
      <header
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 1.5rem", height: 56, borderBottom: `1px solid ${C.border}`,
          background: C.bg, flexShrink: 0, position: "sticky", top: 0, zIndex: 10,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>Mission Control</h1>
          <div style={{ fontSize: "0.7rem", color: C.textFaint }}>Real-time agent operations</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              display: "flex", alignItems: "center", gap: "0.4rem",
              background: C.greenBg, border: `1px solid ${C.greenDim}`,
              borderRadius: 999, padding: "0.25rem 0.75rem", fontSize: "0.7rem", color: C.green,
            }}
          >
            <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: C.green, animation: "blink 1.5s step-end infinite" }} />
            Live
          </div>
          <Link href="/agents/new" style={{
            background: C.accent, color: "#000", border: "none", borderRadius: 8,
            padding: "0.4rem 0.875rem", fontWeight: 700, fontSize: "0.8rem", textDecoration: "none",
          }}>
            + New Agent
          </Link>
        </div>
      </header>

      {/* Page body */}
      <div style={{ padding: "1.5rem", display: "flex", flexDirection: "column", gap: "2rem", flex: 1 }}>
        {/* Stats Row */}
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <StatCard label="Total Agents" value={String(AGENTS.length)} sub={`${onlineCount} active right now`} />
          <StatCard label="Active Tasks" value={String(runningCount)} sub={`${ACTIVITY.filter((a) => a.status === "queued").length} queued`} accent />
          <StatCard label="Success Rate" value={`${successRate}%`} sub="last 24 hours" />
          <StatCard label="Avg Response" value="4.3s" sub="p50 across all agents" />
        </div>

        {/* Middle: Activity + Quick Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "1.5rem" }}>
          {/* Recent Activity */}
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "1.25rem 1.5rem" }}>
            <SectionHeader title="Recent Activity" actionHref="/activity" actionLabel="View all →" />
            {ACTIVITY.map((item, i) => (
              <ActivityRow key={item.id} item={item} last={i === ACTIVITY.length - 1} />
            ))}
          </div>

          {/* Right column */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
            {/* Quick Actions */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "1.25rem" }}>
              <SectionHeader title="Quick Actions" />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <QuickAction href="/agents/new" icon="🤖" label="Create Agent" description="Deploy a new agent with tools" primary />
                <QuickAction href="/tasks" icon="📋" label="Run Task" description="Dispatch a task to an agent" />
                <QuickAction href="/activity" icon="📡" label="View Logs" description="Inspect execution traces" />
              </div>
            </div>

            {/* System Health */}
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "1.25rem" }}>
              <SectionHeader title="System Health" />
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                {[
                  { label: "OpenClaw Runtime", ok: true },
                  { label: "NVIDIA API", ok: true },
                  { label: "Workflow Engine", ok: true },
                  { label: "Code Executor", ok: false },
                ].map((row) => (
                  <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8rem" }}>
                    <span style={{ color: C.textMuted }}>{row.label}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", color: row.ok ? C.green : C.red, fontSize: "0.7rem" }}>
                      <span style={{ fontSize: "0.45rem" }}>●</span>
                      {row.ok ? "Operational" : "Degraded"}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Agent Status Grid */}
        <div>
          <SectionHeader title="Agent Status" actionHref="/agents" actionLabel="Manage agents →" />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.875rem" }}>
            {AGENTS.map((agent) => (
              <Link key={agent.id} href={`/agents/${agent.id}`} style={{ textDecoration: "none" }}>
                <div
                  style={{
                    background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12,
                    padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem",
                    transition: "border-color 0.15s", cursor: "pointer",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.borderMid)}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ fontFamily: "monospace", fontWeight: 600, fontSize: "0.875rem", color: C.text }}>{agent.name}</div>
                      <div style={{ fontSize: "0.75rem", color: C.textDim, marginTop: "0.2rem" }}>{agent.description}</div>
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: "0.35rem", flexShrink: 0,
                      background: C.bg, border: `1px solid ${C.border}`, borderRadius: 999,
                      padding: "0.2rem 0.6rem", fontSize: "0.7rem", color: agentStatusColor(agent.status),
                    }}>
                      <span style={{ fontSize: "0.45rem" }}>●</span>
                      {agent.status}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "1rem" }}>
                    <MiniStat label="Tasks" value={agent.tasksRun.toLocaleString()} />
                    <MiniStat label="Model" value={agent.model} muted />
                    <MiniStat label="Last seen" value={agent.lastSeen} muted />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: "1.25rem 1.5rem", flex: 1, minWidth: 160 }}>
      <div style={{ fontSize: "0.7rem", color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</div>
      <div style={{ fontSize: "2rem", fontWeight: 800, letterSpacing: "-0.04em", color: accent ? C.accent : C.text, lineHeight: 1.1 }}>{value}</div>
      <div style={{ fontSize: "0.75rem", color: C.textDim }}>{sub}</div>
    </div>
  );
}

function SectionHeader({ title, actionHref, actionLabel }: { title: string; actionHref?: string; actionLabel?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.875rem" }}>
      <h2 style={{ margin: 0, fontSize: "0.8rem", fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>{title}</h2>
      {actionHref && <Link href={actionHref} style={{ color: C.accent, fontSize: "0.75rem", textDecoration: "none" }}>{actionLabel}</Link>}
    </div>
  );
}

function ActivityRow({ item, last }: { item: ActivityItem; last: boolean }) {
  const s = taskStatusStyle(item.status);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "0.75rem 0", borderBottom: last ? "none" : `1px solid ${C.border}` }}>
      <div style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0, boxShadow: item.status === "running" ? `0 0 6px ${s.color}` : "none" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "0.8rem", color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.task}</div>
        <div style={{ fontSize: "0.7rem", color: C.textDim, marginTop: "0.15rem" }}>
          <span style={{ fontFamily: "monospace", color: C.accent }}>{item.agent}</span>
          <span style={{ margin: "0 0.4rem", color: C.textFaint }}>·</span>{item.timestamp}
          {item.duration !== "—" && <><span style={{ margin: "0 0.4rem", color: C.textFaint }}>·</span><span style={{ fontFamily: "monospace" }}>{item.duration}</span></>}
        </div>
      </div>
      <div style={{ flexShrink: 0, fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", color: s.color, background: s.bg, border: `1px solid ${s.border}`, borderRadius: 6, padding: "0.2rem 0.5rem" }}>
        {item.status}
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label, description, primary }: { href: string; icon: string; label: string; description: string; primary?: boolean }) {
  return (
    <Link href={href} style={{
      background: primary ? C.accent : C.surface, border: primary ? "none" : `1px solid ${C.border}`,
      borderRadius: 10, padding: "0.875rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "0.25rem",
    }}>
      <span style={{ fontSize: "1.1rem" }}>{icon}</span>
      <div style={{ fontSize: "0.8rem", fontWeight: 600, color: primary ? "#000" : C.text }}>{label}</div>
      <div style={{ fontSize: "0.7rem", color: primary ? "rgba(0,0,0,0.6)" : C.textDim }}>{description}</div>
    </Link>
  );
}

function MiniStat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: "0.65rem", color: C.textFaint, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontFamily: "monospace", fontSize: "0.8rem", color: muted ? C.textDim : C.text, fontWeight: muted ? 400 : 600 }}>{value}</div>
    </div>
  );
}
