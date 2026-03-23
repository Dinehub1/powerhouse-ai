"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState("nvapi-••••••••••••••••••••");
  const [baseUrl, setBaseUrl] = useState("https://integrate.api.nvidia.com/v1");
  const [defaultModel, setDefaultModel] = useState("moonshotai/kimi-k2.5");
  const [maxConcurrent, setMaxConcurrent] = useState(5);
  const [logLevel, setLogLevel] = useState("info");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
    <div style={{ padding: "2rem", maxWidth: 680 }}>
      <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700 }}>Settings</h1>
      <p style={{ margin: "0 0 2rem", color: "#71717a", fontSize: "0.85rem" }}>
        Configure your Powerhouse-AI platform
      </p>

      {/* API Configuration */}
      <Section title="API Configuration">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>API Key</label>
            <input type="password" style={inputStyle} value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
            <div style={{ fontSize: "0.7rem", color: "#52525b", marginTop: "0.25rem" }}>Your NVIDIA / OpenAI-compatible API key</div>
          </div>
          <div>
            <label style={labelStyle}>Base URL</label>
            <input style={inputStyle} value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Default Model</label>
              <select style={{ ...inputStyle, cursor: "pointer" }} value={defaultModel} onChange={(e) => setDefaultModel(e.target.value)}>
                <option>moonshotai/kimi-k2.5</option>
                <option>gpt-4o</option>
                <option>meta/llama-3.3-70b-instruct</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Max Concurrent Agents</label>
              <input type="number" style={inputStyle} value={maxConcurrent} onChange={(e) => setMaxConcurrent(parseInt(e.target.value) || 1)} />
            </div>
          </div>
        </div>
      </Section>

      {/* Logging */}
      <Section title="Logging & Observability">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Log Level</label>
            <select style={{ ...inputStyle, cursor: "pointer" }} value={logLevel} onChange={(e) => setLogLevel(e.target.value)}>
              <option value="debug">Debug</option>
              <option value="info">Info</option>
              <option value="warn">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
          <div>
            <label style={labelStyle}>Retention</label>
            <select style={{ ...inputStyle, cursor: "pointer" }} defaultValue="30d">
              <option value="7d">7 days</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
            </select>
          </div>
        </div>
      </Section>

      {/* Execution */}
      <Section title="Execution Defaults">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
          <div>
            <label style={labelStyle}>Timeout (sec)</label>
            <input type="number" style={inputStyle} defaultValue={120} />
          </div>
          <div>
            <label style={labelStyle}>Retry Count</label>
            <input type="number" style={inputStyle} defaultValue={3} />
          </div>
          <div>
            <label style={labelStyle}>Memory</label>
            <select style={{ ...inputStyle, cursor: "pointer" }} defaultValue="in-memory">
              <option value="none">None</option>
              <option value="in-memory">In-Memory</option>
              <option value="sqlite">SQLite</option>
            </select>
          </div>
        </div>
      </Section>

      {/* Save */}
      <button
        onClick={handleSave}
        style={{
          padding: "0.7rem 2rem",
          background: saved ? "#22c55e" : "#f97316",
          color: "#000",
          border: "none",
          borderRadius: 8,
          fontWeight: 700,
          fontSize: "0.875rem",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
      >
        {saved ? "✓ Saved" : "Save Settings"}
      </button>
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
