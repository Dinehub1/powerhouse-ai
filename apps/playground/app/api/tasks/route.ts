import {
  createTask,
  getAllTasks,
  getTask,
  pushChunk,
  completeTask,
  failTask,
  type TaskRun,
} from "../../lib/task-store";
import { getAgentById } from "../../lib/agents";

// ─── GET /api/tasks — list all tasks ─────────────────────────────────────────

export async function GET() {
  const tasks = getAllTasks().slice(0, 50).map(serializeTask);
  return Response.json(tasks);
}

// ─── POST /api/tasks — create and enqueue a new task ─────────────────────────

export async function POST(request: Request) {
  let body: { agentId?: string; title?: string; input?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { agentId, title, input } = body;

  if (!agentId?.trim()) {
    return Response.json({ error: "agentId is required" }, { status: 400 });
  }
  if (!title?.trim()) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  if (!input?.trim()) {
    return Response.json({ error: "input is required" }, { status: 400 });
  }

  const task = createTask({ agentId, title, input });

  // Fire-and-forget — do not await
  runTaskAsync(task).catch((err) => {
    failTask(task.runId, String(err));
  });

  return Response.json({ runId: task.runId, status: "queued" }, { status: 202 });
}

// ─── Task execution ───────────────────────────────────────────────────────────

async function runTaskAsync(task: TaskRun): Promise<void> {
  const { runId, agentId, input } = task;

  // Mark as running
  const stored = getTask(runId);
  if (!stored) return;
  stored.status = "running";
  stored.startedAt = Date.now();

  // Push a status event so streaming subscribers know execution started
  pushChunk(runId, JSON.stringify({ type: "status", status: "running" }));

  // Validate agent
  const agent = getAgentById(agentId);
  if (!agent) {
    failTask(runId, `Unknown agent: "${agentId}"`);
    return;
  }

  // Validate API key
  if (!process.env.OPENAI_API_KEY) {
    failTask(runId, "OPENAI_API_KEY not configured");
    return;
  }

  let fullText = "";

  try {
    const gen = agent.stream(input);
    for await (const chunk of gen) {
      if (chunk.type === "text") {
        fullText += chunk.text ?? "";
        pushChunk(runId, JSON.stringify({ type: "text", text: chunk.text }));
      } else if (chunk.type === "tool_start") {
        const toolName = chunk.toolCall?.name ?? "unknown";
        pushChunk(runId, JSON.stringify({ type: "tool_start", name: toolName }));

        // Record tool call entry (output will be unknown until tool_end)
        stored.toolCalls.push({ name: toolName, input: null, output: null });
      } else if (chunk.type === "tool_end") {
        // Update the last matching tool call with its output
        const toolName = chunk.toolCall?.name;
        const lastIdx = stored.toolCalls.findLastIndex((tc) => tc.name === toolName && tc.output === null);
        if (lastIdx !== -1) {
          stored.toolCalls[lastIdx].input = chunk.toolCall?.input ?? null;
          stored.toolCalls[lastIdx].output = chunk.toolCall?.output ?? null;
        }
        pushChunk(
          runId,
          JSON.stringify({
            type: "tool_end",
            name: toolName,
            output: chunk.toolCall?.output,
          })
        );
      } else if (chunk.type === "done") {
        // handled below after the loop
      }
    }

    completeTask(runId, fullText);
  } catch (err) {
    failTask(runId, String(err));
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function serializeTask(task: TaskRun) {
  // Omit internal SSE controllers and chunk buffer from API responses
  const { controllers, chunks, ...rest } = task;
  void controllers;
  void chunks;
  return rest;
}
