"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const MODELS = [
  "moonshotai/kimi-k2.5",
  "gpt-4o",
  "gpt-4o-mini",
  "meta/llama-3.3-70b-instruct",
  "nvidia/llama-3.1-nemotron-ultra-253b-v1",
  "deepseek-ai/deepseek-r1",
];

const AVAILABLE_TOOLS = [
  { id: "calculator", name: "Calculator", description: "Evaluate math expressions" },
  { id: "web_search", name: "Web Search", description: "Search the web for information" },
  { id: "code_executor", name: "Code Executor", description: "Run code in sandboxed environments" },
  { id: "file_reader", name: "File Reader", description: "Read files from workspace" },
  { id: "api_caller", name: "API Caller", description: "Make HTTP requests to external APIs" },
  { id: "database", name: "Database", description: "Query SQL/NoSQL databases" },
];

export default function CreateAgentPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [model, setModel] = useState(MODELS[0]);
  const [instructions, setInstructions] = useState("");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(4096);
  const [maxSteps, setMaxSteps] = useState(10);
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [memoryType, setMemoryType] = useState("in-memory");

  function toggleTool(id: string) {
    setSelectedTools((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  }

  function handleCreate() {
    alert(`Agent "${name}" created! (Demo — backend integration coming soon)`);
    router.push("/agents");
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "#27272a",
    border: "1px solid #3f3f46",
    borderRadius: 8,
    color: "#fafafa",
    fontSize: "0.875rem",
    padding: "0.625rem 0.75rem",
    outline: "none",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.8rem",
    color: "#a1a1aa",
    marginBottom: "0.375rem",
    fontWeight: 500,
  };

  return (
    <div style={{ padding: "2rem", maxWidth: 720 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "2rem" }}>
        <Link href="/agents" style={{ color: "#71717a", textDecoration: "none", fontSize: "1.25rem" }}>
          ←
        </Link>
        <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>Create New Agent</h1>
      </div>

      {/* Basic Info */}
      <Section title="Basic Info">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Agent Name</label>
            <input style={inputStyle} placeholder="e.g. research-agent" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>Model</label>
            <select style={{ ...inputStyle, cursor: "pointer" }} value={model} onChange={(e) => setModel(e.target.value)}>
              {MODELS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
        <div style={{ marginTop: "1rem" }}>
          <label style={labelStyle}>Description</label>
          <input style={inputStyle} placeholder="Brief description of what this agent does" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </Section>

      {/* Instructions */}
      <Section title="System Instructions">
        <label style={labelStyle}>Prompt / Instructions</label>
        <textarea
          style={{ ...inputStyle, minHeight: 120, resize: "vertical", lineHeight: 1.6 }}
          placeholder="You are a helpful research assistant. Always cite sources, reason step by step..."
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </Section>

      {/* Model Config */}
      <Section title="Model Configuration">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Temperature: {temperature}</label>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "#f97316" }}
            />
          </div>
          <div>
            <label style={labelStyle}>Max Tokens</label>
            <input type="number" style={inputStyle} value={maxTokens} onChange={(e) => setMaxTokens(parseInt(e.target.value) || 0)} />
          </div>
          <div>
            <label style={labelStyle}>Max Steps</label>
            <input type="number" style={inputStyle} value={maxSteps} onChange={(e) => setMaxSteps(parseInt(e.target.value) || 0)} />
          </div>
        </div>
      </Section>

      {/* Tools */}
      <Section title="Tools">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
          {AVAILABLE_TOOLS.map((tool) => {
            const checked = selectedTools.includes(tool.id);
            return (
              <div
                key={tool.id}
                onClick={() => toggleTool(tool.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.75rem",
                  borderRadius: 8,
                  border: `1px solid ${checked ? "#f97316" : "#27272a"}`,
                  background: checked ? "rgba(249,115,22,0.08)" : "#18181b",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 4,
                    border: `2px solid ${checked ? "#f97316" : "#3f3f46"}`,
                    background: checked ? "#f97316" : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    color: "#000",
                    flexShrink: 0,
                  }}
                >
                  {checked ? "✓" : ""}
                </div>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#fafafa", fontWeight: 500 }}>{tool.name}</div>
                  <div style={{ fontSize: "0.7rem", color: "#71717a" }}>{tool.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Advanced */}
      <Section title="Advanced">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Memory Type</label>
            <select style={{ ...inputStyle, cursor: "pointer" }} value={memoryType} onChange={(e) => setMemoryType(e.target.value)}>
              <option value="none">None</option>
              <option value="in-memory">In-Memory</option>
              <option value="sqlite">SQLite (Persistent)</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>API Endpoint</label>
            <input style={inputStyle} placeholder="https://integrate.api.nvidia.com/v1" readOnly value="https://integrate.api.nvidia.com/v1" />
          </div>
        </div>
      </Section>

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem", paddingBottom: "3rem" }}>
        <button
          onClick={handleCreate}
          disabled={!name.trim()}
          style={{
            padding: "0.7rem 2rem",
            background: name.trim() ? "#f97316" : "#27272a",
            color: name.trim() ? "#000" : "#52525b",
            border: "none",
            borderRadius: 8,
            fontWeight: 700,
            fontSize: "0.875rem",
            cursor: name.trim() ? "pointer" : "not-allowed",
          }}
        >
          Create Agent
        </button>
        <Link
          href="/agents"
          style={{
            padding: "0.7rem 1.5rem",
            border: "1px solid #3f3f46",
            color: "#a1a1aa",
            borderRadius: 8,
            textDecoration: "none",
            fontSize: "0.875rem",
            display: "flex",
            alignItems: "center",
          }}
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "#18181b",
        border: "1px solid #27272a",
        borderRadius: 12,
        padding: "1.25rem",
        marginBottom: "1.25rem",
      }}
    >
      <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 600, color: "#f97316" }}>{title}</h2>
      {children}
    </div>
  );
}
