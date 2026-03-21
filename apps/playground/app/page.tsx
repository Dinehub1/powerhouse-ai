import Link from "next/link";

export default function Home() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        background: "#09090b",
      }}
    >
      <div style={{ maxWidth: 680, width: "100%" }}>
        {/* Badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "#18181b",
            border: "1px solid #27272a",
            borderRadius: 999,
            padding: "0.25rem 0.75rem",
            fontSize: "0.75rem",
            color: "#a1a1aa",
            marginBottom: "1.5rem",
          }}
        >
          <span style={{ color: "#f97316" }}>●</span> Open Source · MIT · OpenClaw powered
        </div>

        {/* Headline */}
        <h1 style={{ fontSize: "3rem", fontWeight: 800, margin: 0, lineHeight: 1.1, letterSpacing: "-0.03em" }}>
          <span style={{ color: "#f97316" }}>⚡</span> Powerhouse
          <span style={{ color: "#f97316" }}>-AI</span>
        </h1>
        <p style={{ color: "#71717a", fontSize: "1.125rem", marginTop: "0.75rem", marginBottom: "2rem" }}>
          Open-source TypeScript agent framework built on{" "}
          <strong style={{ color: "#f97316" }}>OpenClaw</strong> — tools, memory,
          workflows, and safe code execution in one package.
        </p>

        {/* Feature grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "2rem" }}>
          <FeatureCard icon="🤖" title="Agent" description="OpenClaw-powered agents with typed tools, memory, and multi-step reasoning" />
          <FeatureCard icon="🧑‍✈️" title="SupervisorAgent" description="Orchestrate multiple specialist agents — delegate tasks automatically" />
          <FeatureCard icon="🔀" title="WorkflowRunner" description="Durable pipelines with human-in-the-loop approval gates and retry" />
          <FeatureCard icon="🔒" title="CodeExecutor" description="Run AI-generated code safely in isolated Vercel Sandbox microVMs" />
        </div>

        {/* Quick start */}
        <div
          style={{
            background: "#18181b",
            border: "1px solid #27272a",
            borderRadius: 12,
            padding: "1.25rem",
            marginBottom: "2rem",
          }}
        >
          <div style={{ fontSize: "0.7rem", color: "#52525b", marginBottom: "0.75rem", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Quick Start
          </div>
          <pre style={{ margin: 0, fontSize: "0.8rem", color: "#a1a1aa", lineHeight: 1.7, overflowX: "auto" }}>
            <code>{`import { Agent, defineTool } from "@powerhouse-ai/core";

const agent = new Agent({
  name: "my-agent",
  // reads OPENAI_API_KEY + OPENAI_BASE_URL from env
  instructions: "You are an OpenClaw-powered assistant.",
  tools: { search: mySearchTool },
});

const { text } = await agent.generate("Research fusion energy");`}</code>
          </pre>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link
            href="/chat"
            style={{
              padding: "0.625rem 1.5rem",
              background: "#f97316",
              color: "#000",
              fontWeight: 700,
              borderRadius: 8,
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            Try the Chat →
          </Link>
          <a
            href="https://github.com/Dinehub1/powerhouse-ai"
            target="_blank"
            rel="noreferrer"
            style={{
              padding: "0.625rem 1.25rem",
              border: "1px solid #3f3f46",
              color: "#a1a1aa",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            GitHub
          </a>
          <a
            href="/api/demo"
            style={{
              padding: "0.625rem 1.25rem",
              border: "1px solid #3f3f46",
              color: "#a1a1aa",
              borderRadius: 8,
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            API Demo
          </a>
        </div>

        <div style={{ marginTop: "2rem", color: "#3f3f46", fontSize: "0.8rem" }}>
          <code>pnpm add @powerhouse-ai/core</code>
          <span style={{ margin: "0 0.5rem" }}>·</span>
          <span>MIT</span>
          <span style={{ margin: "0 0.5rem" }}>·</span>
          <span>moonshotai/kimi-k2.5 · NVIDIA</span>
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div style={{ border: "1px solid #27272a", borderRadius: 12, padding: "1rem", background: "#18181b" }}>
      <div style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>{icon}</div>
      <div style={{ color: "#f97316", fontWeight: 600, fontSize: "0.875rem", marginBottom: "0.25rem" }}>{title}</div>
      <div style={{ color: "#71717a", fontSize: "0.8rem", lineHeight: 1.5 }}>{description}</div>
    </div>
  );
}
