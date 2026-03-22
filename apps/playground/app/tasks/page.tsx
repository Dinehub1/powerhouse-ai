"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaskStatus = "completed" | "running" | "queued" | "failed";
type Priority = "high" | "medium" | "low";
type TaskType = "one-shot" | "scheduled" | "webhook" | "approval";

interface Task {
  id: string;
  title: string;
  agent: string;
  status: TaskStatus;
  priority: Priority;
  type: TaskType;
  createdAt: string;
  duration?: string;
  input: string;
  retries?: { current: number; max: number };
  steps?: { completed: number; total: number };
}

// Real task from API (TaskRun shape, minus internal fields)
interface RealTask {
  runId: string;
  taskId: string;
  title: string;
  agentId: string;
  status: "queued" | "running" | "completed" | "failed";
  input: string;
  output: string;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  toolCalls: { name: string; input: unknown; output: unknown }[];
}

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  humanSchedule: string;
  agent: string;
  enabled: boolean;
  lastRun?: string;
  nextRun: string;
  successRate: number;
  totalRuns: number;
}

type PipelineStatus = "running" | "completed" | "failed" | "paused";
type StepStatus = "completed" | "running" | "pending" | "failed" | "skipped";

interface PipelineStep {
  name: string;
  status: StepStatus;
}

interface Pipeline {
  id: string;
  name: string;
  status: PipelineStatus;
  steps: PipelineStep[];
  agent: string;
  startedAt: string;
  duration?: string;
}

// SSE event types from the stream endpoint
interface SSEText { type: "text"; text: string }
interface SSEToolStart { type: "tool_start"; name: string }
interface SSEToolEnd { type: "tool_end"; name: string; output?: unknown }
interface SSEDone { type: "done" }
interface SSEError { type: "error"; error?: string; text?: string }
interface SSEStatus { type: "status"; status: string }
type SSEEvent = SSEText | SSEToolStart | SSEToolEnd | SSEDone | SSEError | SSEStatus;

// ─── Mock Data (Cron + Pipelines unchanged) ───────────────────────────────────

const MOCK_TASKS: Task[] = [
  {
    id: "tsk_001",
    title: "Research quantum computing trends",
    agent: "research-agent",
    status: "completed",
    priority: "high",
    type: "one-shot",
    createdAt: "2 min ago",
    duration: "34s",
    input: "Find latest papers on quantum error correction from 2026",
  },
  {
    id: "tsk_002",
    title: "Review PR #142 — auth refactor",
    agent: "code-reviewer",
    status: "running",
    priority: "high",
    type: "one-shot",
    createdAt: "5 min ago",
    input: "Review the authentication middleware changes for security issues",
    steps: { completed: 2, total: 5 },
  },
  {
    id: "tsk_003",
    title: "Generate weekly report",
    agent: "content-writer",
    status: "queued",
    priority: "medium",
    type: "scheduled",
    createdAt: "8 min ago",
    input: "Summarize this week's deployment metrics and incidents",
  },
  {
    id: "tsk_004",
    title: "Scan dependencies for CVEs",
    agent: "security-scanner",
    status: "completed",
    priority: "high",
    type: "scheduled",
    createdAt: "15 min ago",
    duration: "1m 12s",
    input: "Check all npm packages for known vulnerabilities",
  },
  {
    id: "tsk_005",
    title: "ETL pipeline — user events",
    agent: "data-pipeline",
    status: "failed",
    priority: "medium",
    type: "webhook",
    createdAt: "22 min ago",
    duration: "2m 5s",
    input: "Process user event logs from S3 and load into warehouse",
    retries: { current: 2, max: 3 },
  },
  {
    id: "tsk_006",
    title: "Answer support ticket #8820",
    agent: "customer-support",
    status: "completed",
    priority: "low",
    type: "webhook",
    createdAt: "30 min ago",
    duration: "18s",
    input: "Help customer with billing dispute for March invoice",
  },
  {
    id: "tsk_007",
    title: "Approve infrastructure cost increase",
    agent: "ops-agent",
    status: "queued",
    priority: "high",
    type: "approval",
    createdAt: "35 min ago",
    input: "Monthly AWS bill increased by 40%. Approve additional $2,400 budget?",
  },
  {
    id: "tsk_008",
    title: "Optimize database queries",
    agent: "code-reviewer",
    status: "completed",
    priority: "medium",
    type: "one-shot",
    createdAt: "1h ago",
    duration: "52s",
    input: "Analyze slow queries from pg_stat_statements and suggest indexes",
    steps: { completed: 4, total: 4 },
  },
];

const CRON_JOBS: CronJob[] = [
  {
    id: "cron_001",
    name: "Security dependency scan",
    schedule: "0 */6 * * *",
    humanSchedule: "Every 6 hours",
    agent: "security-scanner",
    enabled: true,
    lastRun: "3h ago",
    nextRun: "in 3h",
    successRate: 97,
    totalRuns: 1248,
  },
  {
    id: "cron_002",
    name: "ETL user events",
    schedule: "*/15 * * * *",
    humanSchedule: "Every 15 minutes",
    agent: "data-pipeline",
    enabled: true,
    lastRun: "4 min ago",
    nextRun: "in 11 min",
    successRate: 99,
    totalRuns: 5832,
  },
  {
    id: "cron_003",
    name: "Daily report generation",
    schedule: "0 9 * * MON-FRI",
    humanSchedule: "Weekdays at 9:00 AM",
    agent: "content-writer",
    enabled: true,
    lastRun: "yesterday",
    nextRun: "tomorrow 9am",
    successRate: 100,
    totalRuns: 312,
  },
  {
    id: "cron_004",
    name: "Database backup verify",
    schedule: "0 2 * * *",
    humanSchedule: "Daily at 2:00 AM",
    agent: "data-pipeline",
    enabled: false,
    lastRun: "3 days ago",
    nextRun: "paused",
    successRate: 88,
    totalRuns: 724,
  },
  {
    id: "cron_005",
    name: "Competitor price scrape",
    schedule: "0 8,20 * * *",
    humanSchedule: "Twice daily at 8am & 8pm",
    agent: "research-agent",
    enabled: true,
    lastRun: "2h ago",
    nextRun: "in 6h",
    successRate: 91,
    totalRuns: 890,
  },
  {
    id: "cron_006",
    name: "Health check all services",
    schedule: "*/5 * * * *",
    humanSchedule: "Every 5 minutes",
    agent: "security-scanner",
    enabled: true,
    lastRun: "1 min ago",
    nextRun: "in 4 min",
    successRate: 99,
    totalRuns: 21600,
  },
];

const PIPELINES: Pipeline[] = [
  {
    id: "pipe_001",
    name: "PR Review Pipeline",
    status: "running",
    agent: "code-reviewer",
    startedAt: "5 min ago",
    steps: [
      { name: "lint", status: "completed" },
      { name: "security-scan", status: "completed" },
      { name: "code-review", status: "running" },
      { name: "deploy-preview", status: "pending" },
    ],
  },
  {
    id: "pipe_002",
    name: "Data Ingestion Pipeline",
    status: "completed",
    agent: "data-pipeline",
    startedAt: "1h ago",
    duration: "4m 22s",
    steps: [
      { name: "extract", status: "completed" },
      { name: "validate", status: "completed" },
      { name: "transform", status: "completed" },
      { name: "load", status: "completed" },
      { name: "notify", status: "completed" },
    ],
  },
  {
    id: "pipe_003",
    name: "Incident Response",
    status: "failed",
    agent: "security-scanner",
    startedAt: "2h ago",
    duration: "18m 7s",
    steps: [
      { name: "detect", status: "completed" },
      { name: "investigate", status: "completed" },
      { name: "mitigate", status: "failed" },
      { name: "resolve", status: "skipped" },
    ],
  },
  {
    id: "pipe_004",
    name: "Content Publishing",
    status: "paused",
    agent: "content-writer",
    startedAt: "30 min ago",
    steps: [
      { name: "draft", status: "completed" },
      { name: "review", status: "completed" },
      { name: "approval", status: "running" },
      { name: "publish", status: "pending" },
    ],
  },
];

// ─── Agent options for the new task drawer ────────────────────────────────────

const AGENT_OPTIONS = [
  { id: "research-agent", label: "Research Agent", emoji: "🔬" },
  { id: "code-reviewer", label: "Code Reviewer", emoji: "👾" },
  { id: "data-pipeline", label: "Data Pipeline", emoji: "🔄" },
  { id: "customer-support", label: "Customer Support", emoji: "💬" },
  { id: "content-writer", label: "Content Writer", emoji: "✍️" },
  { id: "security-scanner", label: "Security Scanner", emoji: "🛡️" },
];

// ─── Color Maps ───────────────────────────────────────────────────────────────

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

const TYPE_COLORS: Record<TaskType, { bg: string; text: string }> = {
  "one-shot": { bg: "rgba(99,102,241,0.15)", text: "#818cf8" },
  scheduled: { bg: "rgba(234,179,8,0.15)", text: "#eab308" },
  webhook: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa" },
  approval: { bg: "rgba(249,115,22,0.15)", text: "#f97316" },
};

const PIPELINE_STATUS_COLORS: Record<PipelineStatus, string> = {
  running: "#f97316",
  completed: "#22c55e",
  failed: "#ef4444",
  paused: "#eab308",
};

const STEP_COLORS: Record<StepStatus, string> = {
  completed: "#22c55e",
  running: "#f97316",
  pending: "#3f3f46",
  failed: "#ef4444",
  skipped: "#52525b",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const secs = Math.floor(diff / 1000);
  if (secs < 60) return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

function formatDuration(startedAt?: number, completedAt?: number): string | undefined {
  if (!startedAt) return undefined;
  const end = completedAt ?? Date.now();
  const ms = end - startedAt;
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  const rem = secs % 60;
  return rem > 0 ? `${mins}m ${rem}s` : `${mins}m`;
}

// ─── Output Panel ─────────────────────────────────────────────────────────────

interface OutputLine {
  kind: "text" | "tool" | "error" | "system";
  content: string;
}

interface OutputPanelProps {
  runId: string;
  title: string;
  onClose: () => void;
}

function OutputPanel({ runId, title, onClose }: OutputPanelProps) {
  const [lines, setLines] = useState<OutputLine[]>([]);
  const [status, setStatus] = useState<"queued" | "running" | "completed" | "failed">("queued");
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const addLine = useCallback((line: OutputLine) => {
    setLines((prev) => [...prev, line]);
  }, []);

  // Auto-scroll as new content arrives
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines]);

  useEffect(() => {
    let cancelled = false;

    async function connectStream() {
      try {
        const res = await fetch(`/api/tasks/${runId}/stream`);
        if (!res.ok || !res.body) {
          addLine({ kind: "error", content: `Failed to connect: HTTP ${res.status}` });
          setStatus("failed");
          return;
        }

        const reader = res.body.getReader();
        readerRef.current = reader;
        const decoder = new TextDecoder();
        let buffer = "";

        while (!cancelled) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Process complete SSE messages (separated by \n\n)
          const messages = buffer.split("\n\n");
          buffer = messages.pop() ?? "";

          for (const msg of messages) {
            const dataLine = msg.split("\n").find((l) => l.startsWith("data: "));
            if (!dataLine) continue;
            const jsonStr = dataLine.slice(6).trim();
            if (!jsonStr) continue;

            let event: SSEEvent;
            try {
              event = JSON.parse(jsonStr);
            } catch {
              continue;
            }

            if (event.type === "text" && "text" in event) {
              // Accumulate text — split by newlines for display
              const textChunk = event.text ?? "";
              if (textChunk) {
                // Split into lines but keep partial lines in buffer by appending
                addLine({ kind: "text", content: textChunk });
              }
            } else if (event.type === "tool_start" && "name" in event) {
              setActiveTool(event.name);
              addLine({ kind: "tool", content: `calling: ${event.name}` });
            } else if (event.type === "tool_end" && "name" in event) {
              setActiveTool(null);
              addLine({ kind: "tool", content: `done: ${event.name}` });
            } else if (event.type === "status" && "status" in event) {
              setStatus(event.status as typeof status);
              if (event.status === "running") {
                addLine({ kind: "system", content: "Agent started..." });
              }
            } else if (event.type === "done") {
              setStatus("completed");
              setActiveTool(null);
              addLine({ kind: "system", content: "Task completed." });
            } else if (event.type === "error") {
              const errMsg = ("error" in event ? event.error : undefined)
                ?? ("text" in event ? event.text : undefined)
                ?? "Unknown error";
              setStatus("failed");
              addLine({ kind: "error", content: errMsg ?? "Unknown error" });
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          addLine({ kind: "error", content: String(err) });
          setStatus("failed");
        }
      }
    }

    connectStream();

    return () => {
      cancelled = true;
      readerRef.current?.cancel().catch(() => {});
    };
  }, [runId, addLine]);

  const statusColor =
    status === "completed" ? "#22c55e"
    : status === "failed" ? "#ef4444"
    : status === "running" ? "#f97316"
    : "#71717a";

  const statusLabel =
    status === "running" && activeTool
      ? `running · ⚡ ${activeTool}`
      : status;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 240,
        right: 0,
        height: "40vh",
        background: "#09090b",
        borderTop: "1px solid #27272a",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.6rem 1.25rem",
          borderBottom: "1px solid #18181b",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.8rem", fontWeight: 600, color: "#fafafa" }}>
            {title}
          </span>
          <span
            style={{
              fontSize: "0.65rem",
              padding: "0.2rem 0.6rem",
              borderRadius: 999,
              background: `${statusColor}15`,
              color: statusColor,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            {status === "running" && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: statusColor,
                  display: "inline-block",
                  animation: "pulse 1.2s ease-in-out infinite",
                }}
              />
            )}
            {statusLabel}
          </span>
        </div>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "none",
            color: "#71717a",
            cursor: "pointer",
            fontSize: "0.85rem",
            padding: "0.2rem 0.5rem",
            borderRadius: 4,
            lineHeight: 1,
          }}
        >
          × Close
        </button>
      </div>

      {/* Output area */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "0.75rem 1.25rem",
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          fontSize: "0.75rem",
          lineHeight: 1.7,
          color: "#a1a1aa",
        }}
      >
        {lines.length === 0 && (
          <span style={{ color: "#52525b" }}>Waiting for output...</span>
        )}
        {lines.map((line, i) => {
          if (line.kind === "tool") {
            return (
              <div key={i}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    background: "rgba(249,115,22,0.1)",
                    border: "1px solid rgba(249,115,22,0.2)",
                    borderRadius: 4,
                    padding: "0.1rem 0.5rem",
                    color: "#f97316",
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    margin: "0.15rem 0",
                  }}
                >
                  ⚡ {line.content}
                </span>
              </div>
            );
          }
          if (line.kind === "error") {
            return (
              <div key={i} style={{ color: "#ef4444" }}>
                {line.content}
              </div>
            );
          }
          if (line.kind === "system") {
            return (
              <div key={i} style={{ color: "#52525b", fontStyle: "italic" }}>
                {line.content}
              </div>
            );
          }
          // text — preserve whitespace/newlines
          return (
            <span key={i} style={{ whiteSpace: "pre-wrap", color: "#d4d4d8" }}>
              {line.content}
            </span>
          );
        })}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
      `}</style>
    </div>
  );
}

// ─── New Task Drawer ──────────────────────────────────────────────────────────

interface NewTaskDrawerProps {
  onClose: () => void;
  onSubmitted: (runId: string, title: string) => void;
}

function NewTaskDrawer({ onClose, onSubmitted }: NewTaskDrawerProps) {
  const [agentId, setAgentId] = useState(AGENT_OPTIONS[0].id);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskInput, setTaskInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!taskTitle.trim() || !taskInput.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, title: taskTitle.trim(), input: taskInput.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      }

      const { runId } = (await res.json()) as { runId: string };
      onSubmitted(runId, taskTitle.trim());
    } catch (err) {
      setError(String(err));
      setSubmitting(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          zIndex: 40,
        }}
      />

      {/* Drawer */}
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          bottom: 0,
          width: 420,
          background: "#09090b",
          borderLeft: "1px solid #27272a",
          zIndex: 45,
          display: "flex",
          flexDirection: "column",
          boxShadow: "-8px 0 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Drawer header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #18181b",
            flexShrink: 0,
          }}
        >
          <div>
            <div style={{ fontSize: "1rem", fontWeight: 700, color: "#fafafa" }}>New Task</div>
            <div style={{ fontSize: "0.75rem", color: "#71717a", marginTop: "0.2rem" }}>
              Run an agent on a task
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #27272a",
              borderRadius: 6,
              color: "#71717a",
              cursor: "pointer",
              fontSize: "1rem",
              width: 32,
              height: 32,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1.25rem",
          }}
        >
          {/* Agent select */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#a1a1aa",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Agent
            </label>
            <select
              value={agentId}
              onChange={(e) => setAgentId(e.target.value)}
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 8,
                color: "#fafafa",
                fontSize: "0.85rem",
                cursor: "pointer",
                outline: "none",
              }}
            >
              {AGENT_OPTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.emoji} {a.label}
                </option>
              ))}
            </select>
          </div>

          {/* Task title */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#a1a1aa",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Task Title
            </label>
            <input
              type="text"
              value={taskTitle}
              onChange={(e) => setTaskTitle(e.target.value)}
              placeholder="E.g. Research top AI papers from 2026"
              required
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 8,
                color: "#fafafa",
                fontSize: "0.85rem",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Input / Prompt */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "0.75rem",
                fontWeight: 600,
                color: "#a1a1aa",
                marginBottom: "0.5rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Input / Prompt
            </label>
            <textarea
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="Describe what the agent should do in detail..."
              required
              rows={8}
              style={{
                width: "100%",
                padding: "0.6rem 0.75rem",
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 8,
                color: "#fafafa",
                fontSize: "0.85rem",
                outline: "none",
                resize: "vertical",
                lineHeight: 1.6,
                boxSizing: "border-box",
                fontFamily: "inherit",
              }}
            />
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: "0.6rem 0.75rem",
                background: "rgba(239,68,68,0.1)",
                border: "1px solid rgba(239,68,68,0.3)",
                borderRadius: 8,
                color: "#f87171",
                fontSize: "0.8rem",
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !taskTitle.trim() || !taskInput.trim()}
            style={{
              padding: "0.75rem",
              background: submitting ? "#7c3900" : "#f97316",
              color: submitting ? "#ffa554" : "#000",
              border: "none",
              borderRadius: 8,
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: submitting ? "not-allowed" : "pointer",
              transition: "background 0.2s ease",
            }}
          >
            {submitting ? "Starting..." : "Run Task"}
          </button>
        </form>
      </div>
    </>
  );
}

// ─── Tasks Tab ────────────────────────────────────────────────────────────────

interface TasksTabProps {
  realTasks: RealTask[];
  onSelectTask: (runId: string, title: string) => void;
}

function TasksTab({ realTasks, onSelectTask }: TasksTabProps) {
  const [filter, setFilter] = useState<"all" | TaskStatus>("all");
  const [approvalStates, setApprovalStates] = useState<Record<string, "approved" | "rejected" | null>>({});

  // Use real tasks if any exist, otherwise fall back to mock data
  const useRealData = realTasks.length > 0;

  // Convert real tasks to display format
  const realAsDisplay: Task[] = realTasks.map((rt) => ({
    id: rt.runId,
    title: rt.title,
    agent: rt.agentId,
    status: rt.status,
    priority: "medium" as Priority,
    type: "one-shot" as TaskType,
    createdAt: formatRelativeTime(rt.createdAt),
    duration: formatDuration(rt.startedAt, rt.completedAt),
    input: rt.input,
  }));

  const displayTasks = useRealData ? realAsDisplay : MOCK_TASKS;

  const filtered = filter === "all" ? displayTasks : displayTasks.filter((t) => t.status === filter);

  const counts = {
    all: displayTasks.length,
    running: displayTasks.filter((t) => t.status === "running").length,
    queued: displayTasks.filter((t) => t.status === "queued").length,
    completed: displayTasks.filter((t) => t.status === "completed").length,
    failed: displayTasks.filter((t) => t.status === "failed").length,
  };

  function handleApproval(id: string, action: "approved" | "rejected") {
    setApprovalStates((prev) => ({ ...prev, [id]: action }));
  }

  return (
    <div>
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
        {filtered.map((task) => {
          const stepPct = task.steps ? (task.steps.completed / task.steps.total) * 100 : null;
          const approval = approvalStates[task.id] ?? null;
          const isReal = useRealData;

          return (
            <div
              key={task.id}
              onClick={isReal ? () => onSelectTask(task.id, task.title) : undefined}
              style={{
                background: "#18181b",
                border: "1px solid #27272a",
                borderRadius: 10,
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                cursor: isReal ? "pointer" : "default",
                transition: "border-color 0.15s ease",
              }}
              onMouseEnter={(e) => {
                if (isReal) (e.currentTarget as HTMLDivElement).style.borderColor = "#3f3f46";
              }}
              onMouseLeave={(e) => {
                if (isReal) (e.currentTarget as HTMLDivElement).style.borderColor = "#27272a";
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
                  boxShadow: task.status === "running" ? `0 0 6px ${STATUS_COLORS[task.status]}` : "none",
                }}
              />

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem", flexWrap: "wrap" }}>
                  <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#fafafa" }}>{task.title}</span>
                  {/* Priority badge */}
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
                  {/* Type badge */}
                  <span
                    style={{
                      fontSize: "0.6rem",
                      padding: "0.15rem 0.5rem",
                      borderRadius: 999,
                      background: TYPE_COLORS[task.type].bg,
                      color: TYPE_COLORS[task.type].text,
                      fontWeight: 600,
                    }}
                  >
                    {task.type}
                  </span>
                  {/* Retry badge */}
                  {task.retries && (
                    <span
                      style={{
                        fontSize: "0.6rem",
                        padding: "0.15rem 0.5rem",
                        borderRadius: 999,
                        background: "rgba(239,68,68,0.1)",
                        color: "#f87171",
                        fontWeight: 600,
                      }}
                    >
                      Retry {task.retries.current}/{task.retries.max}
                    </span>
                  )}
                  {/* Live indicator for real running tasks */}
                  {isReal && task.status === "running" && (
                    <span style={{ fontSize: "0.6rem", color: "#f97316" }}>Click to view output</span>
                  )}
                </div>

                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "#71717a",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginBottom: stepPct !== null ? "0.5rem" : 0,
                  }}
                >
                  {task.input}
                </div>

                {/* Step progress bar */}
                {stepPct !== null && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <div
                      style={{
                        flex: 1,
                        height: 4,
                        background: "#27272a",
                        borderRadius: 999,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${stepPct}%`,
                          height: "100%",
                          background: stepPct === 100 ? "#22c55e" : "#f97316",
                          borderRadius: 999,
                          transition: "width 0.3s ease",
                        }}
                      />
                    </div>
                    <span style={{ fontSize: "0.65rem", color: "#52525b", flexShrink: 0 }}>
                      {task.steps!.completed}/{task.steps!.total} steps
                    </span>
                  </div>
                )}
              </div>

              {/* Approval buttons */}
              {task.type === "approval" && (
                <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                  {approval === null ? (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleApproval(task.id, "approved"); }}
                        style={{
                          padding: "0.35rem 0.75rem",
                          background: "rgba(34,197,94,0.1)",
                          border: "1px solid rgba(34,197,94,0.3)",
                          borderRadius: 6,
                          color: "#22c55e",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Approve
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleApproval(task.id, "rejected"); }}
                        style={{
                          padding: "0.35rem 0.75rem",
                          background: "rgba(239,68,68,0.1)",
                          border: "1px solid rgba(239,68,68,0.3)",
                          borderRadius: 6,
                          color: "#ef4444",
                          fontSize: "0.7rem",
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Reject
                      </button>
                    </>
                  ) : (
                    <span
                      style={{
                        padding: "0.35rem 0.75rem",
                        borderRadius: 6,
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        background: approval === "approved" ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
                        color: approval === "approved" ? "#22c55e" : "#ef4444",
                        border: `1px solid ${approval === "approved" ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)"}`,
                      }}
                    >
                      {approval === "approved" ? "Approved" : "Rejected"}
                    </span>
                  )}
                </div>
              )}

              {/* Agent */}
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <Link
                  href={`/agents/${task.agent}`}
                  onClick={(e) => e.stopPropagation()}
                  style={{ fontSize: "0.75rem", color: "#f97316", textDecoration: "none" }}
                >
                  {task.agent}
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
          );
        })}

        {filtered.length === 0 && (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "#52525b",
              fontSize: "0.875rem",
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: 10,
            }}
          >
            No {filter === "all" ? "" : filter + " "}tasks yet.
            {filter === "all" && " Click \"+ New Task\" to run your first agent."}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Cron Jobs Tab (unchanged) ────────────────────────────────────────────────

function CronToggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        position: "relative",
        width: 36,
        height: 20,
        borderRadius: 999,
        background: enabled ? "#f97316" : "#3f3f46",
        border: "none",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.2s ease",
        padding: 0,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 3,
          left: enabled ? 19 : 3,
          width: 14,
          height: 14,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s ease",
        }}
      />
    </button>
  );
}

function CronJobsTab() {
  const [jobs, setJobs] = useState<CronJob[]>(CRON_JOBS);

  function toggleJob(id: string) {
    setJobs((prev) => prev.map((j) => (j.id === id ? { ...j, enabled: !j.enabled } : j)));
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {jobs.map((job) => (
          <div
            key={job.id}
            style={{
              background: "#18181b",
              border: `1px solid ${job.enabled ? "#27272a" : "#1c1c1f"}`,
              borderRadius: 10,
              padding: "1rem 1.25rem",
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              opacity: job.enabled ? 1 : 0.55,
              transition: "opacity 0.2s ease",
            }}
          >
            <CronToggle enabled={job.enabled} onChange={() => toggleJob(job.id)} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.3rem" }}>
                <span style={{ fontSize: "0.875rem", fontWeight: 600, color: "#fafafa" }}>{job.name}</span>
                <span
                  style={{
                    fontFamily: "monospace",
                    fontSize: "0.7rem",
                    color: "#a1a1aa",
                    background: "#09090b",
                    border: "1px solid #27272a",
                    borderRadius: 4,
                    padding: "0.1rem 0.45rem",
                  }}
                >
                  {job.schedule}
                </span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#71717a" }}>{job.humanSchedule}</div>
            </div>

            <div style={{ flexShrink: 0, textAlign: "center", minWidth: 120 }}>
              <Link
                href={`/agents/${job.agent}`}
                style={{ fontSize: "0.75rem", color: "#f97316", textDecoration: "none" }}
              >
                {job.agent}
              </Link>
            </div>

            <div style={{ flexShrink: 0, textAlign: "right", minWidth: 120 }}>
              <div style={{ fontSize: "0.7rem", color: "#52525b" }}>
                Last: <span style={{ color: "#a1a1aa" }}>{job.lastRun ?? "—"}</span>
              </div>
              <div style={{ fontSize: "0.7rem", color: "#52525b" }}>
                Next: <span style={{ color: job.enabled ? "#a1a1aa" : "#52525b" }}>{job.nextRun}</span>
              </div>
            </div>

            <div style={{ flexShrink: 0, minWidth: 90, textAlign: "right" }}>
              <div style={{ fontSize: "0.65rem", color: "#71717a", marginBottom: "0.2rem", textAlign: "right" }}>
                {job.successRate}% success
              </div>
              <div
                style={{
                  width: 90,
                  height: 4,
                  background: "#27272a",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${job.successRate}%`,
                    height: "100%",
                    background: job.successRate >= 95 ? "#22c55e" : job.successRate >= 80 ? "#eab308" : "#ef4444",
                    borderRadius: 999,
                  }}
                />
              </div>
              <div style={{ fontSize: "0.6rem", color: "#52525b", marginTop: "0.2rem", textAlign: "right" }}>
                {job.totalRuns.toLocaleString()} runs
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Pipelines Tab (unchanged) ────────────────────────────────────────────────

function PipelineStepDot({ step, isLast }: { step: PipelineStep; isLast: boolean }) {
  const color = STEP_COLORS[step.status];
  const isRunning = step.status === "running";

  return (
    <div style={{ display: "flex", alignItems: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.3rem" }}>
        <div
          style={{
            width: 18,
            height: 18,
            borderRadius: "50%",
            background: step.status === "pending" || step.status === "skipped" ? "transparent" : color,
            border: `2px solid ${color}`,
            flexShrink: 0,
            boxShadow: isRunning ? `0 0 8px ${color}` : "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {step.status === "completed" && (
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <polyline points="1.5,4.5 3.5,6.5 7.5,2.5" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
          {step.status === "failed" && (
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <line x1="2" y1="2" x2="7" y2="7" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="7" y1="2" x2="2" y2="7" stroke="#000" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </div>
        <span style={{ fontSize: "0.6rem", color: color, whiteSpace: "nowrap", fontWeight: step.status === "running" ? 700 : 400 }}>
          {step.name}
        </span>
      </div>
      {!isLast && (
        <div
          style={{
            width: 28,
            height: 2,
            background: step.status === "completed" ? "#22c55e" : "#27272a",
            marginBottom: "1rem",
            flexShrink: 0,
          }}
        />
      )}
    </div>
  );
}

function PipelinesTab() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      {PIPELINES.map((pipeline) => {
        const statusColor = PIPELINE_STATUS_COLORS[pipeline.status];
        return (
          <div
            key={pipeline.id}
            style={{
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: 10,
              padding: "1.25rem 1.5rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fafafa" }}>{pipeline.name}</span>
                <span
                  style={{
                    fontSize: "0.65rem",
                    padding: "0.2rem 0.6rem",
                    borderRadius: 999,
                    background: `${statusColor}15`,
                    color: statusColor,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  {pipeline.status}
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                <Link
                  href={`/agents/${pipeline.agent}`}
                  style={{ fontSize: "0.75rem", color: "#f97316", textDecoration: "none" }}
                >
                  {pipeline.agent}
                </Link>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "0.7rem", color: "#52525b" }}>Started {pipeline.startedAt}</div>
                  {pipeline.duration && (
                    <div style={{ fontSize: "0.7rem", color: "#52525b" }}>{pipeline.duration}</div>
                  )}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", overflowX: "auto", paddingBottom: "0.25rem" }}>
              {pipeline.steps.map((step, i) => (
                <PipelineStepDot key={step.name} step={step} isLast={i === pipeline.steps.length - 1} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type TabKey = "tasks" | "cron" | "pipelines";

export default function TasksPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("tasks");
  const [showNewTaskDrawer, setShowNewTaskDrawer] = useState(false);
  const [realTasks, setRealTasks] = useState<RealTask[]>([]);

  // Output panel state
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState<string>("");

  // Poll for real tasks
  useEffect(() => {
    let cancelled = false;
    let pollTimer: ReturnType<typeof setTimeout> | null = null;

    async function fetchTasks() {
      try {
        const res = await fetch("/api/tasks");
        if (res.ok && !cancelled) {
          const data = await res.json() as RealTask[];
          setRealTasks(data);
        }
      } catch {
        // Silently ignore fetch errors during polling
      }

      if (!cancelled) {
        pollTimer = setTimeout(fetchTasks, 3000);
      }
    }

    fetchTasks();

    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
    };
  }, []);

  function handleSelectTask(runId: string, title: string) {
    setSelectedRunId(runId);
    setSelectedTitle(title);
  }

  function handleTaskSubmitted(runId: string, title: string) {
    setShowNewTaskDrawer(false);
    setSelectedRunId(runId);
    setSelectedTitle(title);
    // Immediately fetch tasks to show the new one
    fetch("/api/tasks")
      .then((r) => r.json())
      .then((data) => setRealTasks(data as RealTask[]))
      .catch(() => {});
  }

  function closeOutputPanel() {
    setSelectedRunId(null);
    setSelectedTitle("");
  }

  const taskCount = realTasks.length > 0 ? realTasks.length : MOCK_TASKS.length;

  const TABS: { key: TabKey; label: string; count?: number }[] = [
    { key: "tasks", label: "Tasks", count: taskCount },
    { key: "cron", label: "Cron Jobs", count: CRON_JOBS.length },
    { key: "pipelines", label: "Pipelines", count: PIPELINES.length },
  ];

  const headerSubtitle = {
    tasks: "Work items assigned to your agents",
    cron: "Scheduled recurring jobs",
    pipelines: "Multi-step automated workflows",
  }[activeTab];

  const headerActionLabel = {
    tasks: "+ New Task",
    cron: "+ Add Cron Job",
    pipelines: "+ New Pipeline",
  }[activeTab];

  function handleHeaderAction() {
    if (activeTab === "tasks") {
      setShowNewTaskDrawer(true);
    }
  }

  return (
    <div style={{ padding: "2rem", paddingBottom: selectedRunId ? "calc(40vh + 2rem)" : "2rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>Tasks</h1>
          <p style={{ margin: "0.25rem 0 0", color: "#71717a", fontSize: "0.85rem" }}>
            {headerSubtitle}
          </p>
        </div>
        <button
          onClick={handleHeaderAction}
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
          {headerActionLabel}
        </button>
      </div>

      {/* Tab switcher */}
      <div
        style={{
          display: "flex",
          gap: 0,
          marginBottom: "1.5rem",
          background: "#09090b",
          border: "1px solid #27272a",
          borderRadius: 10,
          padding: "0.25rem",
          width: "fit-content",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: "0.45rem 1.1rem",
              borderRadius: 7,
              border: "none",
              background: activeTab === tab.key ? "#18181b" : "transparent",
              color: activeTab === tab.key ? "#fafafa" : "#71717a",
              fontSize: "0.8rem",
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.15s ease",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                style={{
                  fontSize: "0.65rem",
                  background: activeTab === tab.key ? "rgba(249,115,22,0.15)" : "#27272a",
                  color: activeTab === tab.key ? "#f97316" : "#52525b",
                  borderRadius: 999,
                  padding: "0.05rem 0.45rem",
                  fontWeight: 600,
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "tasks" && (
        <TasksTab
          realTasks={realTasks}
          onSelectTask={handleSelectTask}
        />
      )}
      {activeTab === "cron" && <CronJobsTab />}
      {activeTab === "pipelines" && <PipelinesTab />}

      {/* New Task Drawer */}
      {showNewTaskDrawer && (
        <NewTaskDrawer
          onClose={() => setShowNewTaskDrawer(false)}
          onSubmitted={handleTaskSubmitted}
        />
      )}

      {/* Output Panel */}
      {selectedRunId && (
        <OutputPanel
          runId={selectedRunId}
          title={selectedTitle}
          onClose={closeOutputPanel}
        />
      )}
    </div>
  );
}
