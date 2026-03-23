"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Mock Data ────────────────────────────────────────────────────────────────

const AGENT = {
  id: "agt_01j9x2k8m3n4p5q6r7s8t9u0",
  name: "Research Assistant",
  model: "moonshotai/kimi-k2.5",
  status: "active" as const,
  createdAt: "2026-03-01T09:00:00Z",
  lastRun: "2026-03-22T14:32:11Z",
  instructions:
    "You are a research assistant powered by OpenClaw. Your job is to gather information, synthesize findings, and produce structured reports. Always cite sources, reason step by step, and prefer up-to-date information. When using tools, explain what you are doing and why.",
  temperature: 0.7,
  maxTokens: 4096,
  tools: [
    { name: "web_search", description: "Search the web for current information using Brave Search API" },
    { name: "calculator", description: "Evaluate mathematical expressions safely" },
    { name: "read_file", description: "Read file contents from the workspace filesystem" },
    { name: "write_file", description: "Write or update files in the workspace filesystem" },
    { name: "fetch_url", description: "Fetch and parse the content of any public URL" },
  ],
};

const RECENT_RUNS = [
  {
    id: "run_a1b2",
    timestamp: "2026-03-22T14:32:11Z",
    input: "Research the latest advances in fusion energy and summarize key findings",
    status: "success" as const,
    duration: 18420,
    tokens: 3812,
  },
  {
    id: "run_c3d4",
    timestamp: "2026-03-22T11:05:44Z",
    input: "Analyze competitor pricing data from provided CSV and generate a report",
    status: "success" as const,
    duration: 9830,
    tokens: 2104,
  },
  {
    id: "run_e5f6",
    timestamp: "2026-03-21T16:48:22Z",
    input: "Summarize the top 10 papers on transformer attention mechanisms from arXiv",
    status: "error" as const,
    duration: 4210,
    tokens: 891,
  },
  {
    id: "run_g7h8",
    timestamp: "2026-03-21T09:17:55Z",
    input: "Write a market analysis report for the EV battery sector Q1 2026",
    status: "success" as const,
    duration: 24100,
    tokens: 5421,
  },
  {
    id: "run_i9j0",
    timestamp: "2026-03-20T20:33:01Z",
    input: "Find and compare the top 5 open-source LLM inference frameworks",
    status: "success" as const,
    duration: 12750,
    tokens: 2988,
  },
];

const LOG_ENTRIES = [
  { id: 1, ts: "2026-03-22T14:32:11.001Z", level: "info" as const, message: "Agent run started — run_a1b2" },
  { id: 2, ts: "2026-03-22T14:32:11.120Z", level: "info" as const, message: "System prompt injected (874 tokens)" },
  { id: 3, ts: "2026-03-22T14:32:11.340Z", level: "info" as const, message: "User message tokenized (42 tokens)" },
  { id: 4, ts: "2026-03-22T14:32:12.001Z", level: "info" as const, message: "LLM request sent → moonshotai/kimi-k2.5" },
  { id: 5, ts: "2026-03-22T14:32:14.882Z", level: "tool" as const, message: "Tool call: web_search({ query: 'fusion energy breakthroughs 2026' })" },
  { id: 6, ts: "2026-03-22T14:32:16.211Z", level: "success" as const, message: "web_search returned 8 results (1,204 chars)" },
  { id: 7, ts: "2026-03-22T14:32:16.450Z", level: "tool" as const, message: "Tool call: fetch_url({ url: 'https://nature.com/articles/fusion-2026' })" },
  { id: 8, ts: "2026-03-22T14:32:18.990Z", level: "success" as const, message: "fetch_url returned 3,821 chars" },
  { id: 9, ts: "2026-03-22T14:32:19.100Z", level: "info" as const, message: "LLM continuation request (2nd step)" },
  { id: 10, ts: "2026-03-22T14:32:28.300Z", level: "success" as const, message: "Final response generated — 1,847 tokens" },
  { id: 11, ts: "2026-03-22T14:32:28.420Z", level: "info" as const, message: "Run completed — total: 3,812 tokens, 18.42s" },
  { id: 12, ts: "2026-03-22T11:05:44.001Z", level: "info" as const, message: "Agent run started — run_c3d4" },
  { id: 13, ts: "2026-03-22T11:05:44.210Z", level: "info" as const, message: "System prompt injected (874 tokens)" },
  { id: 14, ts: "2026-03-22T11:05:45.800Z", level: "tool" as const, message: "Tool call: read_file({ path: 'competitor_pricing.csv' })" },
  { id: 15, ts: "2026-03-22T11:05:46.100Z", level: "success" as const, message: "read_file returned 4,201 chars" },
  { id: 16, ts: "2026-03-21T16:48:22.001Z", level: "info" as const, message: "Agent run started — run_e5f6" },
  { id: 17, ts: "2026-03-21T16:48:22.400Z", level: "tool" as const, message: "Tool call: fetch_url({ url: 'https://arxiv.org/search/…' })" },
  { id: 18, ts: "2026-03-21T16:48:26.610Z", level: "error" as const, message: "fetch_url failed: HTTP 429 Too Many Requests — rate limit exceeded" },
  { id: 19, ts: "2026-03-21T16:48:26.700Z", level: "warning" as const, message: "Retrying in 2s (attempt 1/3)" },
  { id: 20, ts: "2026-03-21T16:48:30.880Z", level: "error" as const, message: "All retries exhausted — run aborted" },
];

const METRICS = {
  totalRuns: 47,
  successRate: 91.5,
  avgLatencyMs: 14820,
  totalTokens: 148230,
  dailyRuns: [12, 8, 15, 9, 11, 6, 14, 10, 13, 7, 11, 9, 16, 8],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function truncate(str: string, len = 60) {
  return str.length > len ? str.slice(0, len) + "…" : str;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "active" | "inactive" | "error" }) {
  const map = {
    active: { bg: "#052e16", border: "#14532d", color: "#22c55e", dot: "#22c55e", label: "Active" },
    inactive: { bg: "#1c1c1c", border: "#3f3f46", color: "#a1a1aa", dot: "#a1a1aa", label: "Inactive" },
    error: { bg: "#2a0a0a", border: "#7f1d1d", color: "#ef4444", dot: "#ef4444", label: "Error" },
  };
  const s = map[status];
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 999,
        padding: "0.2rem 0.65rem",
        fontSize: "0.75rem",
        color: s.color,
        fontWeight: 600,
      }}
    >
      <span style={{ color: s.dot, fontSize: "0.45rem" }}>●</span>
      {s.label}
    </span>
  );
}

function RunStatusBadge({ status }: { status: "success" | "error" }) {
  const s =
    status === "success"
      ? { bg: "#052e16", border: "#14532d", color: "#22c55e", label: "Success" }
      : { bg: "#2a0a0a", border: "#7f1d1d", color: "#ef4444", label: "Failed" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: s.bg,
        border: `1px solid ${s.border}`,
        borderRadius: 6,
        padding: "0.15rem 0.5rem",
        fontSize: "0.7rem",
        color: s.color,
        fontWeight: 600,
      }}
    >
      {s.label}
    </span>
  );
}

function LogLevelChip({ level }: { level: "info" | "tool" | "success" | "error" | "warning" }) {
  const map = {
    info: { color: "#a1a1aa", label: "INFO" },
    tool: { color: "#818cf8", label: "TOOL" },
    success: { color: "#22c55e", label: "OK" },
    error: { color: "#ef4444", label: "ERR" },
    warning: { color: "#eab308", label: "WARN" },
  };
  const s = map[level];
  return (
    <span
      style={{
        fontFamily: "monospace",
        fontSize: "0.65rem",
        fontWeight: 700,
        color: s.color,
        minWidth: 38,
        display: "inline-block",
        textAlign: "right",
      }}
    >
      {s.label}
    </span>
  );
}

// ─── Tab Content ─────────────────────────────────────────────────────────────

function OverviewTab() {
  const successCount = RECENT_RUNS.filter((r) => r.status === "success").length;
  const successRate = Math.round((successCount / RECENT_RUNS.length) * 100);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Info card */}
      <div
        style={{
          background: "#18181b",
          border: "1px solid #27272a",
          borderRadius: 12,
          padding: "1.25rem",
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            color: "#52525b",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "1rem",
          }}
        >
          Agent Info
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "1rem",
          }}
        >
          {[
            { label: "Name", value: AGENT.name },
            { label: "Model", value: AGENT.model },
            { label: "Status", value: <StatusBadge status={AGENT.status} /> },
            { label: "Created", value: formatDate(AGENT.createdAt) },
            { label: "Last Run", value: formatDate(AGENT.lastRun) },
            { label: "Agent ID", value: AGENT.id },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: "0.7rem", color: "#52525b", marginBottom: "0.3rem" }}>{label}</div>
              <div
                style={{
                  fontSize: "0.875rem",
                  color: typeof value === "string" ? "#e4e4e7" : undefined,
                  fontFamily: label === "Agent ID" ? "monospace" : undefined,
                  wordBreak: "break-all",
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tools */}
      <div
        style={{
          background: "#18181b",
          border: "1px solid #27272a",
          borderRadius: 12,
          padding: "1.25rem",
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            color: "#52525b",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "1rem",
          }}
        >
          Attached Tools ({AGENT.tools.length})
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {AGENT.tools.map((tool) => (
            <div
              key={tool.name}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "0.75rem",
                padding: "0.625rem 0.875rem",
                background: "#09090b",
                border: "1px solid #27272a",
                borderRadius: 8,
              }}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 28,
                  height: 28,
                  background: "#1a1a1a",
                  border: "1px solid #3f3f46",
                  borderRadius: 6,
                  fontSize: "0.75rem",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                🔧
              </span>
              <div>
                <div style={{ fontSize: "0.825rem", color: "#f97316", fontWeight: 600, marginBottom: "0.2rem" }}>
                  {tool.name}
                </div>
                <div style={{ fontSize: "0.775rem", color: "#71717a", lineHeight: 1.5 }}>{tool.description}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent runs */}
      <div
        style={{
          background: "#18181b",
          border: "1px solid #27272a",
          borderRadius: 12,
          padding: "1.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
          }}
        >
          <div
            style={{
              fontSize: "0.7rem",
              color: "#52525b",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Recent Runs
          </div>
          <span style={{ fontSize: "0.75rem", color: "#71717a" }}>
            {successRate}% success rate
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.825rem" }}>
            <thead>
              <tr>
                {["Timestamp", "Input", "Status", "Duration", "Tokens"].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: "left",
                      padding: "0.5rem 0.75rem",
                      color: "#52525b",
                      fontWeight: 500,
                      fontSize: "0.7rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      borderBottom: "1px solid #27272a",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {RECENT_RUNS.map((run, i) => (
                <tr
                  key={run.id}
                  style={{
                    borderBottom: i < RECENT_RUNS.length - 1 ? "1px solid #27272a" : "none",
                  }}
                >
                  <td style={{ padding: "0.625rem 0.75rem", color: "#71717a", whiteSpace: "nowrap" }}>
                    {formatDate(run.timestamp)}
                  </td>
                  <td style={{ padding: "0.625rem 0.75rem", color: "#a1a1aa", maxWidth: 280 }}>
                    {truncate(run.input, 55)}
                  </td>
                  <td style={{ padding: "0.625rem 0.75rem" }}>
                    <RunStatusBadge status={run.status} />
                  </td>
                  <td
                    style={{
                      padding: "0.625rem 0.75rem",
                      color: "#71717a",
                      whiteSpace: "nowrap",
                      fontFamily: "monospace",
                      fontSize: "0.775rem",
                    }}
                  >
                    {formatDuration(run.duration)}
                  </td>
                  <td
                    style={{
                      padding: "0.625rem 0.75rem",
                      color: "#71717a",
                      whiteSpace: "nowrap",
                      fontFamily: "monospace",
                      fontSize: "0.775rem",
                    }}
                  >
                    {formatTokens(run.tokens)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ConfigurationTab() {
  const fieldStyle: React.CSSProperties = {
    background: "#09090b",
    border: "1px solid #27272a",
    borderRadius: 8,
    padding: "0.625rem 0.875rem",
    color: "#a1a1aa",
    fontSize: "0.875rem",
    width: "100%",
    fontFamily: "inherit",
    outline: "none",
    resize: "vertical" as const,
    cursor: "default",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.75rem",
    color: "#71717a",
    marginBottom: "0.375rem",
    display: "block",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <div
        style={{
          background: "#18181b",
          border: "1px solid #27272a",
          borderRadius: 12,
          padding: "1.25rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.25rem",
          }}
        >
          <div
            style={{
              fontSize: "0.7rem",
              color: "#52525b",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Configuration
          </div>
          <span
            style={{
              fontSize: "0.7rem",
              color: "#52525b",
              background: "#27272a",
              borderRadius: 6,
              padding: "0.2rem 0.5rem",
            }}
          >
            Read-only
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Name */}
          <div>
            <label style={labelStyle}>Agent Name</label>
            <input readOnly value={AGENT.name} style={fieldStyle} />
          </div>

          {/* Model */}
          <div>
            <label style={labelStyle}>Model</label>
            <input readOnly value={AGENT.model} style={fieldStyle} />
          </div>

          {/* Instructions */}
          <div>
            <label style={labelStyle}>System Instructions</label>
            <textarea readOnly value={AGENT.instructions} rows={5} style={fieldStyle} />
          </div>

          {/* Temperature + Max tokens row */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Temperature</label>
              <div style={{ position: "relative" }}>
                <input readOnly value={AGENT.temperature} style={fieldStyle} />
                <div
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    height: 3,
                    width: `${AGENT.temperature * 100}%`,
                    background: "#f97316",
                    borderRadius: "0 0 0 8px",
                    opacity: 0.6,
                  }}
                />
              </div>
            </div>
            <div>
              <label style={labelStyle}>Max Tokens</label>
              <input readOnly value={AGENT.maxTokens} style={fieldStyle} />
            </div>
          </div>

          {/* Tools */}
          <div>
            <label style={labelStyle}>Tools ({AGENT.tools.length})</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
              {AGENT.tools.map((t) => (
                <span
                  key={t.name}
                  style={{
                    background: "#09090b",
                    border: "1px solid #3f3f46",
                    borderRadius: 6,
                    padding: "0.25rem 0.625rem",
                    fontSize: "0.775rem",
                    color: "#a1a1aa",
                    fontFamily: "monospace",
                  }}
                >
                  {t.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LogsTab() {
  const [filter, setFilter] = useState<"all" | "info" | "tool" | "success" | "error" | "warning">("all");

  const filtered = filter === "all" ? LOG_ENTRIES : LOG_ENTRIES.filter((e) => e.level === filter);

  const filterColors: Record<string, string> = {
    all: "#a1a1aa",
    info: "#a1a1aa",
    tool: "#818cf8",
    success: "#22c55e",
    error: "#ef4444",
    warning: "#eab308",
  };

  const lineColors: Record<string, string> = {
    info: "#a1a1aa",
    tool: "#c7d2fe",
    success: "#86efac",
    error: "#fca5a5",
    warning: "#fde68a",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      {/* Filter bar */}
      <div
        style={{
          display: "flex",
          gap: "0.375rem",
          flexWrap: "wrap",
        }}
      >
        {(["all", "info", "tool", "success", "error", "warning"] as const).map((lvl) => (
          <button
            key={lvl}
            onClick={() => setFilter(lvl)}
            style={{
              background: filter === lvl ? "#27272a" : "transparent",
              border: `1px solid ${filter === lvl ? "#3f3f46" : "#27272a"}`,
              borderRadius: 6,
              padding: "0.25rem 0.75rem",
              fontSize: "0.75rem",
              color: filter === lvl ? filterColors[lvl] : "#52525b",
              cursor: "pointer",
              fontWeight: filter === lvl ? 600 : 400,
              textTransform: "capitalize",
              transition: "all 0.15s",
            }}
          >
            {lvl}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "#52525b", alignSelf: "center" }}>
          {filtered.length} entries
        </span>
      </div>

      {/* Log panel */}
      <div
        style={{
          background: "#09090b",
          border: "1px solid #27272a",
          borderRadius: 12,
          padding: "1rem",
          fontFamily: "monospace",
          fontSize: "0.775rem",
          lineHeight: 1.7,
          maxHeight: 480,
          overflowY: "auto",
        }}
      >
        {filtered.length === 0 ? (
          <div style={{ color: "#52525b", textAlign: "center", padding: "2rem" }}>
            No entries for this filter
          </div>
        ) : (
          filtered.map((entry) => (
            <div
              key={entry.id}
              style={{
                display: "flex",
                alignItems: "baseline",
                gap: "0.75rem",
                padding: "0.1rem 0",
                borderBottom: "1px solid #18181b",
              }}
            >
              <span style={{ color: "#3f3f46", whiteSpace: "nowrap", flexShrink: 0 }}>
                {new Date(entry.ts).toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  fractionalSecondDigits: 3,
                })}
              </span>
              <LogLevelChip level={entry.level} />
              <span style={{ color: lineColors[entry.level], wordBreak: "break-all" }}>
                {entry.message}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function MetricsTab() {
  const maxBarVal = Math.max(...METRICS.dailyRuns);

  const statCards = [
    {
      label: "Total Runs",
      value: METRICS.totalRuns,
      unit: "runs",
      color: "#f97316",
    },
    {
      label: "Success Rate",
      value: `${METRICS.successRate}%`,
      unit: "of runs succeeded",
      color: "#22c55e",
    },
    {
      label: "Avg Latency",
      value: formatDuration(METRICS.avgLatencyMs),
      unit: "per run",
      color: "#818cf8",
    },
    {
      label: "Total Tokens",
      value: formatTokens(METRICS.totalTokens),
      unit: "tokens consumed",
      color: "#eab308",
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* Stat cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "1rem",
        }}
      >
        {statCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: 12,
              padding: "1.125rem 1.25rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.375rem",
            }}
          >
            <div style={{ fontSize: "0.7rem", color: "#52525b", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              {card.label}
            </div>
            <div style={{ fontSize: "1.75rem", fontWeight: 800, color: card.color, lineHeight: 1 }}>
              {card.value}
            </div>
            <div style={{ fontSize: "0.7rem", color: "#71717a" }}>{card.unit}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div
        style={{
          background: "#18181b",
          border: "1px solid #27272a",
          borderRadius: 12,
          padding: "1.25rem",
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            color: "#52525b",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "1.25rem",
          }}
        >
          Daily Runs — Last 14 Days
        </div>

        {/* Y-axis + bars */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "1rem" }}>
          {/* Y axis labels */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              height: 140,
              alignItems: "flex-end",
              flexShrink: 0,
            }}
          >
            {[maxBarVal, Math.round(maxBarVal / 2), 0].map((v) => (
              <span key={v} style={{ fontSize: "0.65rem", color: "#3f3f46", fontFamily: "monospace" }}>
                {v}
              </span>
            ))}
          </div>

          {/* Bars */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "flex-end",
              gap: "0.375rem",
              height: 140,
              position: "relative",
            }}
          >
            {/* Gridlines */}
            {[0, 50, 100].map((pct) => (
              <div
                key={pct}
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: `${pct}%`,
                  height: 1,
                  background: "#27272a",
                  zIndex: 0,
                }}
              />
            ))}

            {METRICS.dailyRuns.map((val, i) => {
              const heightPct = maxBarVal > 0 ? (val / maxBarVal) * 100 : 0;
              const isLast = i === METRICS.dailyRuns.length - 1;
              return (
                <div
                  key={i}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    height: "100%",
                    zIndex: 1,
                    position: "relative",
                    gap: "0.25rem",
                  }}
                  title={`${val} runs`}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${heightPct}%`,
                      background: isLast ? "#f97316" : "#3f3f46",
                      borderRadius: "3px 3px 0 0",
                      minHeight: val > 0 ? 4 : 0,
                      transition: "height 0.3s ease",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* X axis labels */}
        <div
          style={{
            display: "flex",
            gap: "0.375rem",
            paddingLeft: 28,
            marginTop: "0.375rem",
          }}
        >
          {METRICS.dailyRuns.map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (METRICS.dailyRuns.length - 1 - i));
            const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  textAlign: "center",
                  fontSize: "0.55rem",
                  color: "#3f3f46",
                  overflow: "hidden",
                }}
              >
                {i % 2 === 0 ? label : ""}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", fontSize: "0.7rem", color: "#71717a" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <div style={{ width: 10, height: 10, background: "#f97316", borderRadius: 2 }} />
            Today
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <div style={{ width: 10, height: 10, background: "#3f3f46", borderRadius: 2 }} />
            Previous days
          </div>
        </div>
      </div>

      {/* Success / error breakdown */}
      <div
        style={{
          background: "#18181b",
          border: "1px solid #27272a",
          borderRadius: 12,
          padding: "1.25rem",
        }}
      >
        <div
          style={{
            fontSize: "0.7rem",
            color: "#52525b",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: "1rem",
          }}
        >
          Run Outcomes (All Time)
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
          {[
            { label: "Successful", pct: METRICS.successRate, color: "#22c55e", count: Math.round(METRICS.totalRuns * METRICS.successRate / 100) },
            { label: "Failed", pct: 100 - METRICS.successRate, color: "#ef4444", count: Math.round(METRICS.totalRuns * (100 - METRICS.successRate) / 100) },
          ].map((row) => (
            <div key={row.label}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "0.3rem",
                  fontSize: "0.8rem",
                }}
              >
                <span style={{ color: "#a1a1aa" }}>{row.label}</span>
                <span style={{ color: row.color, fontWeight: 600 }}>
                  {row.pct.toFixed(1)}% ({row.count})
                </span>
              </div>
              <div
                style={{
                  height: 6,
                  background: "#27272a",
                  borderRadius: 999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${row.pct}%`,
                    background: row.color,
                    borderRadius: 999,
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = "overview" | "configuration" | "logs" | "metrics";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "configuration", label: "Configuration" },
  { key: "logs", label: "Logs" },
  { key: "metrics", label: "Metrics" },
];

export default function AgentDetailPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        {/* Top header */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.5rem",
            borderBottom: "1px solid #27272a",
            background: "#09090b",
            flexShrink: 0,
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          {/* Breadcrumb + title */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.375rem" }}>
              <Link href="/agents" style={{ color: "#52525b", textDecoration: "none", fontSize: "0.8rem" }}>
                Agents
              </Link>
              <span style={{ color: "#3f3f46", fontSize: "0.8rem" }}>/</span>
              <span style={{ color: "#71717a", fontSize: "0.8rem" }}>{AGENT.id}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#fafafa" }}>
                {AGENT.name}
              </h1>
              <StatusBadge status={AGENT.status} />
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 1rem",
                background: "#f97316",
                color: "#000",
                border: "none",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: "0.825rem",
                cursor: "pointer",
              }}
            >
              ▶ Run
            </button>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 1rem",
                background: "transparent",
                color: "#a1a1aa",
                border: "1px solid #3f3f46",
                borderRadius: 8,
                fontWeight: 500,
                fontSize: "0.825rem",
                cursor: "pointer",
              }}
            >
              ✎ Edit
            </button>
            <button
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 1rem",
                background: "transparent",
                color: "#ef4444",
                border: "1px solid #7f1d1d",
                borderRadius: 8,
                fontWeight: 500,
                fontSize: "0.825rem",
                cursor: "pointer",
              }}
            >
              ✕ Delete
            </button>
          </div>
        </header>

        {/* Tab bar */}
        <div
          style={{
            display: "flex",
            gap: 0,
            borderBottom: "1px solid #27272a",
            padding: "0 1.5rem",
            background: "#09090b",
            flexShrink: 0,
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "0.75rem 1rem",
                fontSize: "0.875rem",
                fontWeight: activeTab === tab.key ? 600 : 400,
                color: activeTab === tab.key ? "#fafafa" : "#71717a",
                background: "transparent",
                border: "none",
                borderBottom: activeTab === tab.key ? "2px solid #f97316" : "2px solid transparent",
                marginBottom: -1,
                cursor: "pointer",
                transition: "color 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <main
          style={{
            flex: 1,
            padding: "1.5rem",
            overflowY: "auto",
            maxWidth: 960,
            width: "100%",
          }}
        >
          {activeTab === "overview" && <OverviewTab />}
          {activeTab === "configuration" && <ConfigurationTab />}
          {activeTab === "logs" && <LogsTab />}
          {activeTab === "metrics" && <MetricsTab />}
        </main>
    </div>
  );
}
