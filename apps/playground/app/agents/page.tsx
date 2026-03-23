"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = "online" | "offline" | "error";
type ExecutionMode = "continuous" | "scheduled" | "on-demand";
type MemoryType = "none" | "in-memory" | "sqlite" | "vector";

interface Skill {
  name: string;
  icon: string;
}

interface Agent {
  id: string;
  name: string;
  icon: string;
  status: AgentStatus;
  model: string;
  toolCount: number;
  lastActive: string;
  description: string;
  tags: string[];
  skills: Skill[];
  mode: ExecutionMode;
  schedule?: string;
  sessions: number;
  memory: MemoryType;
}

// ─── Skill definitions ────────────────────────────────────────────────────────

const SKILL_DEFS: Record<string, Skill> = {
  browser:       { name: "browser",       icon: "🌐" },
  cron:          { name: "cron",          icon: "⏰" },
  voice:         { name: "voice",         icon: "🎙️" },
  canvas:        { name: "canvas",        icon: "🎨" },
  code_exec:     { name: "code_exec",     icon: "⚡" },
  web_search:    { name: "web_search",    icon: "🔍" },
  file_io:       { name: "file_io",       icon: "📁" },
  api_call:      { name: "api_call",      icon: "🔗" },
  database:      { name: "database",      icon: "🗄️" },
  email:         { name: "email",         icon: "📧" },
  notifications: { name: "notifications", icon: "🔔" },
  multi_agent:   { name: "multi_agent",   icon: "🤝" },
};

const sk = (...keys: string[]): Skill[] => keys.map((k) => SKILL_DEFS[k]);

// ─── Mock Data ────────────────────────────────────────────────────────────────

const AGENTS: Agent[] = [
  {
    id: "research-agent",
    name: "Research Agent",
    icon: "🔬",
    status: "online",
    model: "moonshotai/kimi-k2.5",
    toolCount: 7,
    lastActive: "2 minutes ago",
    description:
      "Performs deep web research, synthesizes information from multiple sources, and produces structured reports with citations.",
    tags: ["research", "web", "synthesis"],
    skills: sk("web_search", "browser", "file_io", "email"),
    mode: "on-demand",
    sessions: 2,
    memory: "vector",
  },
  {
    id: "code-reviewer",
    name: "Code Reviewer",
    icon: "🧑‍💻",
    status: "online",
    model: "moonshotai/kimi-k2.5",
    toolCount: 5,
    lastActive: "11 minutes ago",
    description:
      "Analyzes pull requests for bugs, security vulnerabilities, style violations, and suggests idiomatic improvements.",
    tags: ["code", "security", "PR"],
    skills: sk("code_exec", "file_io", "api_call"),
    mode: "on-demand",
    sessions: 1,
    memory: "in-memory",
  },
  {
    id: "data-pipeline",
    name: "Data Pipeline",
    icon: "🔀",
    status: "online",
    model: "nvidia/llama-3.1-nemotron-70b",
    toolCount: 9,
    lastActive: "34 seconds ago",
    description:
      "Orchestrates ETL workflows, monitors data quality metrics, and auto-remediates schema drift and ingestion failures.",
    tags: ["ETL", "pipeline", "monitoring"],
    skills: sk("database", "api_call", "file_io", "email", "notifications"),
    mode: "scheduled",
    schedule: "*/15 * * * *",
    sessions: 0,
    memory: "sqlite",
  },
  {
    id: "customer-support",
    name: "Customer Support",
    icon: "🎧",
    status: "offline",
    model: "moonshotai/kimi-k2.5",
    toolCount: 4,
    lastActive: "3 hours ago",
    description:
      "Handles tier-1 support tickets, resolves common issues autonomously, and escalates complex cases to human agents.",
    tags: ["support", "tickets", "CX"],
    skills: sk("web_search", "email", "notifications", "multi_agent"),
    mode: "continuous",
    sessions: 3,
    memory: "vector",
  },
  {
    id: "content-writer",
    name: "Content Writer",
    icon: "✍️",
    status: "online",
    model: "moonshotai/kimi-k2.5",
    toolCount: 3,
    lastActive: "18 minutes ago",
    description:
      "Drafts blog posts, social copy, and marketing materials aligned with brand voice. Supports SEO keyword injection.",
    tags: ["writing", "SEO", "marketing"],
    skills: sk("web_search", "file_io", "browser"),
    mode: "on-demand",
    sessions: 1,
    memory: "in-memory",
  },
  {
    id: "security-scanner",
    name: "Security Scanner",
    icon: "🔒",
    status: "error",
    model: "nvidia/llama-3.1-nemotron-70b",
    toolCount: 11,
    lastActive: "1 hour ago",
    description:
      "Continuously scans infrastructure, dependencies, and API endpoints for CVEs, misconfigurations, and anomalous access patterns.",
    tags: ["security", "CVE", "infra"],
    skills: sk("code_exec", "browser", "api_call", "database", "notifications"),
    mode: "scheduled",
    schedule: "0 */6 * * *",
    sessions: 0,
    memory: "sqlite",
  },
];

// ─── Status helpers ───────────────────────────────────────────────────────────

const STATUS_COLOR: Record<AgentStatus, string> = {
  online: "#22c55e",
  offline: "#71717a",
  error: "#ef4444",
};

const STATUS_BG: Record<AgentStatus, string> = {
  online: "rgba(34,197,94,0.1)",
  offline: "rgba(113,113,122,0.1)",
  error: "rgba(239,68,68,0.1)",
};

// ─── Mode helpers ─────────────────────────────────────────────────────────────

const MODE_COLOR: Record<ExecutionMode, string> = {
  continuous: "#3b82f6",
  scheduled:  "#a855f7",
  "on-demand": "#71717a",
};

const MODE_BG: Record<ExecutionMode, string> = {
  continuous: "rgba(59,130,246,0.12)",
  scheduled:  "rgba(168,85,247,0.12)",
  "on-demand": "rgba(113,113,122,0.12)",
};

// ─── Memory helpers ───────────────────────────────────────────────────────────

const MEMORY_COLOR: Record<MemoryType, string> = {
  none:        "#52525b",
  "in-memory": "#f59e0b",
  sqlite:      "#06b6d4",
  vector:      "#f97316",
};

// ─── Agent Card ───────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: Agent }) {
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={`/agents/${agent.id}`}
      style={{ textDecoration: "none" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          background: "#18181b",
          border: `1px solid ${hovered ? "#3f3f46" : "#27272a"}`,
          borderRadius: 12,
          padding: "1.25rem",
          cursor: "pointer",
          transition: "border-color 0.15s, transform 0.15s, box-shadow 0.15s",
          transform: hovered ? "translateY(-2px)" : "none",
          boxShadow: hovered ? "0 8px 24px rgba(0,0,0,0.4)" : "none",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          height: "100%",
        }}
      >
        {/* Top row: avatar + name + badges */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
          {/* Avatar */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              background: "#27272a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.375rem",
              flexShrink: 0,
            }}
          >
            {agent.icon}
          </div>

          {/* Name + badges */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Name row with status + mode badges */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.4rem",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  fontSize: "0.9rem",
                  color: "#fafafa",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "9rem",
                }}
              >
                {agent.name}
              </span>

              {/* Badge group */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
                {/* Status badge */}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.28rem",
                    padding: "0.18rem 0.5rem",
                    borderRadius: 999,
                    fontSize: "0.67rem",
                    fontWeight: 600,
                    color: STATUS_COLOR[agent.status],
                    background: STATUS_BG[agent.status],
                    textTransform: "capitalize",
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: STATUS_COLOR[agent.status],
                      display: "inline-block",
                      boxShadow:
                        agent.status === "online"
                          ? `0 0 5px ${STATUS_COLOR[agent.status]}`
                          : "none",
                    }}
                  />
                  {agent.status}
                </span>

                {/* Mode badge */}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0.18rem 0.5rem",
                    borderRadius: 999,
                    fontSize: "0.67rem",
                    fontWeight: 600,
                    color: MODE_COLOR[agent.mode],
                    background: MODE_BG[agent.mode],
                    textTransform: "capitalize",
                  }}
                >
                  {agent.mode}
                </span>
              </div>
            </div>

            {/* Model */}
            <div
              style={{
                marginTop: "0.2rem",
                fontSize: "0.7rem",
                color: "#52525b",
                fontFamily: "monospace",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {agent.model}
            </div>

            {/* Schedule (if present) */}
            {agent.schedule && (
              <div
                style={{
                  marginTop: "0.2rem",
                  fontSize: "0.68rem",
                  color: "#a855f7",
                  fontFamily: "monospace",
                }}
              >
                ⏰ {agent.schedule}
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <p
          style={{
            margin: 0,
            fontSize: "0.8rem",
            color: "#a1a1aa",
            lineHeight: 1.55,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {agent.description}
        </p>

        {/* Skills row */}
        <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
          {agent.skills.map((skill) => (
            <span
              key={skill.name}
              title={skill.name}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.2rem",
                padding: "0.15rem 0.45rem",
                borderRadius: 5,
                background: "#1f1f23",
                border: "1px solid #2e2e35",
                fontSize: "0.67rem",
                color: "#a1a1aa",
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              <span style={{ fontSize: "0.72rem" }}>{skill.icon}</span>
              {skill.name.replace("_", " ")}
            </span>
          ))}
        </div>

        {/* Tags */}
        <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
          {agent.tags.map((tag) => (
            <span
              key={tag}
              style={{
                fontSize: "0.68rem",
                padding: "0.15rem 0.5rem",
                borderRadius: 4,
                background: "#27272a",
                color: "#71717a",
                fontWeight: 500,
              }}
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Footer row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "0.625rem",
            borderTop: "1px solid #27272a",
            marginTop: "auto",
            gap: "0.5rem",
            flexWrap: "wrap",
          }}
        >
          {/* Left cluster: tools + sessions */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ fontSize: "0.72rem" }}>🔧</span>
              <span style={{ fontSize: "0.72rem", color: "#71717a" }}>
                {agent.toolCount} tools
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
              <span style={{ fontSize: "0.72rem" }}>💬</span>
              <span style={{ fontSize: "0.72rem", color: "#71717a" }}>
                {agent.sessions} session{agent.sessions !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Right cluster: memory tag + last active */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {/* Memory type tag */}
            <span
              style={{
                fontSize: "0.63rem",
                padding: "0.1rem 0.4rem",
                borderRadius: 4,
                border: `1px solid ${MEMORY_COLOR[agent.memory]}33`,
                color: MEMORY_COLOR[agent.memory],
                fontWeight: 600,
                letterSpacing: "0.01em",
                background: `${MEMORY_COLOR[agent.memory]}0f`,
                whiteSpace: "nowrap",
              }}
            >
              {agent.memory}
            </span>

            {/* Last active */}
            <div style={{ fontSize: "0.68rem", color: "#52525b", whiteSpace: "nowrap" }}>
              {agent.lastActive}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AgentStatus | "all">("all");

  const filtered = AGENTS.filter((a) => {
    const matchesSearch =
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase()) ||
      a.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
      a.skills.some((s) => s.name.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const counts = {
    all: AGENTS.length,
    online: AGENTS.filter((a) => a.status === "online").length,
    offline: AGENTS.filter((a) => a.status === "offline").length,
    error: AGENTS.filter((a) => a.status === "error").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* Top bar */}
      <div
        style={{
          padding: "1.5rem 2rem",
          borderBottom: "1px solid #27272a",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "1.375rem",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: "#fafafa",
            }}
          >
            Agents
          </h1>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#71717a" }}>
            {counts.online} online · {counts.offline} offline · {counts.error} error
          </p>
        </div>

        <Link
          href="/agents/new"
          style={{
            padding: "0.5rem 1.125rem",
            background: "#f97316",
            color: "#000",
            fontWeight: 700,
            fontSize: "0.875rem",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            letterSpacing: "-0.01em",
            textDecoration: "none",
          }}
        >
          <span style={{ fontSize: "1rem" }}>+</span> Create Agent
        </Link>
      </div>

      {/* Filter bar */}
      <div
        style={{
          padding: "1rem 2rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
          borderBottom: "1px solid #27272a",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1 1 260px", maxWidth: 360 }}>
          <span
            style={{
              position: "absolute",
              left: "0.75rem",
              top: "50%",
              transform: "translateY(-50%)",
              color: "#52525b",
              fontSize: "0.85rem",
              pointerEvents: "none",
            }}
          >
            🔍
          </span>
          <input
            type="text"
            placeholder="Search agents, skills…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "0.5rem 0.75rem 0.5rem 2.1rem",
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: 8,
              color: "#fafafa",
              fontSize: "0.875rem",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Status filters */}
        <div style={{ display: "flex", gap: "0.375rem" }}>
          {(["all", "online", "offline", "error"] as const).map((s) => {
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "0.375rem 0.75rem",
                  borderRadius: 6,
                  border: `1px solid ${active ? "#f97316" : "#27272a"}`,
                  background: active ? "rgba(249,115,22,0.1)" : "#18181b",
                  color: active ? "#f97316" : "#71717a",
                  fontSize: "0.78rem",
                  fontWeight: active ? 600 : 400,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  textTransform: "capitalize",
                  transition: "all 0.15s",
                }}
              >
                {s !== "all" && (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      background: STATUS_COLOR[s as AgentStatus] ?? "#71717a",
                      display: "inline-block",
                    }}
                  />
                )}
                {s}
                <span
                  style={{
                    marginLeft: "0.15rem",
                    color: active ? "#f97316" : "#52525b",
                    fontWeight: 700,
                  }}
                >
                  {counts[s]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      <div style={{ padding: "1.5rem 2rem", flex: 1 }}>
        {filtered.length === 0 ? (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.75rem",
              padding: "4rem 2rem",
              color: "#52525b",
              textAlign: "center",
            }}
          >
            <span style={{ fontSize: "2.5rem" }}>🤖</span>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>
              No agents match your filters.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setStatusFilter("all");
              }}
              style={{
                padding: "0.375rem 0.875rem",
                border: "1px solid #27272a",
                background: "transparent",
                color: "#71717a",
                borderRadius: 6,
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: "1rem",
            }}
          >
            {filtered.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
