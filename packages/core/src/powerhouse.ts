import type { Agent } from "./agent.js";

interface PowerhouseConfig {
  agents: Agent[];
  port?: number;
}

/**
 * PowerhouseAI — the agent registry and HTTP server.
 * Register agents, start the server, and connect to the Ops dashboard.
 *
 * @example
 * ```ts
 * const powerhouse = new PowerhouseAI({
 *   agents: [researchAgent, writerAgent],
 *   port: 3141,
 * });
 *
 * await powerhouse.start();
 * ```
 */
export class PowerhouseAI {
  private agents: Map<string, Agent> = new Map();
  private port: number;

  constructor(config: PowerhouseConfig) {
    for (const agent of config.agents) {
      this.agents.set(agent.name, agent);
    }
    this.port = config.port ?? 3141;
  }

  async start(): Promise<void> {
    // Dynamic import for Node.js http server
    const { createServer } = await import("node:http");

    const server = createServer(async (req, res) => {
      const url = new URL(req.url ?? "/", `http://localhost:${this.port}`);

      // CORS headers
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type");

      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
      }

      try {
        const response = await this.handleRequest(req.method ?? "GET", url.pathname, req);
        res.writeHead(response.status, { "Content-Type": "application/json" });
        res.end(JSON.stringify(response.body));
      } catch (error) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: String(error) }));
      }
    });

    server.listen(this.port, () => {
      console.log(`\n⚡ Powerhouse-AI (OpenClaw) running on http://localhost:${this.port}`);
      console.log(`   Agents: ${[...this.agents.keys()].join(", ")}`);
      console.log(`   API: POST /agents/:name/generate`);
    });
  }

  private async handleRequest(
    method: string,
    path: string,
    req: import("node:http").IncomingMessage
  ): Promise<{ status: number; body: unknown }> {
    // GET /agents — list all agents
    if (method === "GET" && path === "/agents") {
      return {
        status: 200,
        body: [...this.agents.entries()].map(([name, agent]) => ({
          name,
          model: agent.config.model ?? "claude-sonnet-4-6",
          tools: Object.keys(agent.config.tools ?? {}),
        })),
      };
    }

    // POST /agents/:name/generate
    const generateMatch = path.match(/^\/agents\/([^/]+)\/generate$/);
    if (method === "POST" && generateMatch) {
      const agentName = decodeURIComponent(generateMatch[1]);
      const agent = this.agents.get(agentName);
      if (!agent) return { status: 404, body: { error: `Agent "${agentName}" not found` } };

      const body = await readBody(req);
      const { prompt, conversationId, userId } = JSON.parse(body) as {
        prompt: string;
        conversationId?: string;
        userId?: string;
      };

      const result = await agent.generate(prompt, { conversationId, userId });
      return { status: 200, body: result };
    }

    return { status: 404, body: { error: "Not found" } };
  }
}

function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}
