# ⚡ Powerhouse-AI Agents

**OpenClaw-powered, open-source TypeScript agent framework for building production AI agents.**

Inspired by VoltAgent — built natively on the OpenClaw API + Vercel infrastructure.

## What is it?

Powerhouse-AI gives you everything you need to build, run, and operate AI agents:

- **Agent** — core building block with tools, memory, streaming, and multi-step tool calling
- **SupervisorAgent** — orchestrate multiple specialized sub-agents automatically
- **WorkflowRunner** — durable pipelines with human-in-the-loop approval gates
- **CodeExecutor** — safe code execution via Vercel Sandbox (Firecracker microVMs)

## Quick Start

```bash
pnpm add @powerhouse-ai/core
```

### Simple Agent

```typescript
import { Agent, defineTool } from "@powerhouse-ai/core";
import { z } from "zod";

const agent = new Agent({
  name: "research-assistant",
  instructions: "You are a research assistant powered by OpenClaw.",
  model: "claude-sonnet-4-6",
  tools: {
    search: defineTool(
      "Search the web for information",
      z.object({ query: z.string() }),
      async ({ query }) => {
        // your search implementation
        return `Results for: ${query}`;
      }
    ),
  },
});

const { text } = await agent.generate("What are the latest advances in fusion energy?");
console.log(text);
```

### Multi-Agent Supervisor

```typescript
import { Agent, SupervisorAgent } from "@powerhouse-ai/core";

const researcher = new Agent({
  name: "researcher",
  instructions: "You gather information and data.",
});

const writer = new Agent({
  name: "writer",
  instructions: "You write compelling content.",
});

const supervisor = new SupervisorAgent({
  name: "content-coordinator",
  instructions: "Coordinate research and writing tasks.",
  subAgents: [researcher, writer],
});

const { text } = await supervisor.generate(
  "Research quantum computing and write a blog post about it."
);
```

### Human-in-the-Loop Workflow

```typescript
import { WorkflowRunner } from "@powerhouse-ai/workflow";

const workflow = new WorkflowRunner("expense-approval")
  .addStep({
    name: "validate-expense",
    execute: async (expense) => {
      return { ...expense, validated: true };
    },
  })
  .addApprovalGate({
    name: "manager-approval",
    approvalRequest: (expense) => ({
      title: `Approve expense: $${expense.amount}`,
      description: expense.description,
    }),
  })
  .addStep({
    name: "process-payment",
    execute: async (expense) => {
      return { success: true, transactionId: crypto.randomUUID() };
    },
  });

workflow.on("approval_requested", ({ request }) => {
  console.log(`Approval needed: ${request.title} (token: ${request.token})`);
});

const run = await workflow.execute({ amount: 1500, description: "Conference ticket" });
```

### Safe Code Execution

```typescript
import { createCodeExecutionTool } from "@powerhouse-ai/sandbox";
import { Agent } from "@powerhouse-ai/core";

const coderAgent = new Agent({
  name: "coder",
  instructions: "You are an OpenClaw-powered coding agent. Write and test code to solve problems.",
  tools: {
    execute_code: createCodeExecutionTool({ runtime: "node24" }),
  },
});

const { text } = await coderAgent.generate(
  "Write a function to find prime numbers up to 100 and execute it."
);
```

## Packages

| Package | Description |
|---------|-------------|
| `@powerhouse-ai/core` | Agent, SupervisorAgent, tools, memory adapters |
| `@powerhouse-ai/workflow` | WorkflowRunner with human-in-the-loop approval |
| `@powerhouse-ai/sandbox` | Code execution via Vercel Sandbox |

## Supported Models (via OpenClaw)

| Model | ID | Best For |
|-------|-----|----------|
| OpenClaw Opus 4.6 | `claude-opus-4-6` | Complex reasoning, hard tasks |
| OpenClaw Sonnet 4.6 | `claude-sonnet-4-6` | Balanced — default |
| OpenClaw Haiku 4.5 | `claude-haiku-4-5-20251001` | Fast, cost-efficient |

## Environment Variables

```bash
ANTHROPIC_API_KEY=sk-ant-...          # Your OpenClaw API key
VERCEL_SANDBOX_TOKEN=...              # Required for @powerhouse-ai/sandbox
```

## Architecture

```
powerhouse-ai/
├── packages/
│   ├── core/       @powerhouse-ai/core     — Agent, tools, memory
│   ├── workflow/   @powerhouse-ai/workflow  — Durable workflows
│   └── sandbox/    @powerhouse-ai/sandbox   — Safe code execution
└── apps/
    └── playground/ — Next.js demo + API
```

## Comparison with VoltAgent

| Feature | VoltAgent | **Powerhouse-AI** |
|---------|-----------|---------------|
| Language | TypeScript | TypeScript |
| Primary LLM | Multi-provider | **OpenClaw** (Anthropic) |
| Workflows | Custom DSL | **Pure TypeScript** |
| Code Execution | E2B / Daytona | **Vercel Sandbox** (Firecracker) |
| Memory | SQLite, Postgres, Supabase | SQLite, Postgres (extensible) |
| Human-in-the-loop | Yes | Yes (approval gates) |

## Contributing

```bash
git clone https://github.com/Dinehub1/powerhouse-ai
cd powerhouse-ai
pnpm install
pnpm build
```

## License

MIT — built with OpenClaw ⚡
