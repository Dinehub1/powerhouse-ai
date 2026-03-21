export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ maxWidth: 640, width: "100%" }}>
        <h1 style={{ fontSize: "3rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          <span style={{ color: "#f97316" }}>⚡</span> Powerhouse-AI
        </h1>
        <p style={{ color: "#a1a1aa", fontSize: "1.125rem", marginBottom: "2rem" }}>
          Claude-first TypeScript agent framework
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
          <Card title="Agent" description="Core building block — tools, memory, streaming" />
          <Card title="SupervisorAgent" description="Orchestrate multiple specialists automatically" />
          <Card title="WorkflowRunner" description="Durable pipelines with human-in-the-loop approval" />
          <Card title="CodeExecutor" description="Safe code execution via Vercel Sandbox" />
        </div>

        <div style={{ display: "flex", gap: "1rem" }}>
          <a
            href="/api/demo"
            style={{ padding: "0.5rem 1rem", background: "#f97316", color: "#000", fontWeight: 600, borderRadius: 8, textDecoration: "none" }}
          >
            Try API →
          </a>
          <a
            href="https://github.com/powerhouse-ai/powerhouse-ai"
            style={{ padding: "0.5rem 1rem", border: "1px solid #3f3f46", color: "#a1a1aa", borderRadius: 8, textDecoration: "none" }}
          >
            GitHub
          </a>
        </div>
      </div>
    </main>
  );
}

function Card({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ border: "1px solid #27272a", borderRadius: 12, padding: "1rem 1.25rem" }}>
      <div style={{ color: "#fb923c", fontWeight: 600, marginBottom: "0.25rem" }}>{title}</div>
      <div style={{ color: "#71717a", fontSize: "0.875rem" }}>{description}</div>
    </div>
  );
}
