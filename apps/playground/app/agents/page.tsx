"use client";

import { useState } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type AgentStatus = "online" | "offline" | "error";

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
}

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
          gap: "0.875rem",
          height: "100%",
        }}
      >
        {/* Top row: avatar + name + status */}
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

          {/* Name + status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "0.5rem",
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
                }}
              >
                {agent.name}
              </span>
              {/* Status badge */}
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.3rem",
                  padding: "0.2rem 0.55rem",
                  borderRadius: 999,
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  color: STATUS_COLOR[agent.status],
                  background: STATUS_BG[agent.status],
                  flexShrink: 0,
                  textTransform: "capitalize",
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: STATUS_COLOR[agent.status],
                    display: "inline-block",
                    boxShadow: agent.status === "online"
                      ? `0 0 6px ${STATUS_COLOR[agent.status]}`
                      : "none",
                  }}
                />
                {agent.status}
              </span>
            </div>

            {/* Model */}
            <div
              style={{
                marginTop: "0.25rem",
                fontSize: "0.72rem",
                color: "#52525b",
                fontFamily: "monospace",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {agent.model}
            </div>
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
            paddingTop: "0.75rem",
            borderTop: "1px solid #27272a",
            marginTop: "auto",
          }}
        >
          {/* Tools */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.375rem" }}>
            <span style={{ fontSize: "0.75rem" }}>🔧</span>
            <span style={{ fontSize: "0.75rem", color: "#71717a" }}>
              {agent.toolCount} tools
            </span>
          </div>

          {/* Last active */}
          <div style={{ fontSize: "0.72rem", color: "#52525b" }}>
            Active {agent.lastActive}
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
      a.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
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

          <button
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
            }}
          >
            <span style={{ fontSize: "1rem" }}>+</span> Create Agent
          </button>
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
              placeholder="Search agents…"
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
                onClick={() => { setSearch(""); setStatusFilter("all"); }}
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
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
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
