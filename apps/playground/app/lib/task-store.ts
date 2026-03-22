/**
 * In-memory task registry for agent task execution.
 * Stores all TaskRun records and supports SSE streaming via registered controllers.
 */

export interface TaskRun {
  runId: string;
  taskId: string;
  title: string;
  agentId: string;
  status: "queued" | "running" | "completed" | "failed";
  input: string;
  output: string;         // accumulated text output
  chunks: string[];       // SSE chunk buffer for late-joining subscribers
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  toolCalls: { name: string; input: unknown; output: unknown }[];
  // SSE subscribers — ReadableStream controllers waiting for live chunks
  controllers: ReadableStreamDefaultController[];
}

// Singleton store — shared across all API route invocations in the same process
export const taskStore = new Map<string, TaskRun>();

export function createTask(data: {
  taskId?: string;
  title: string;
  agentId: string;
  input: string;
}): TaskRun {
  const runId = crypto.randomUUID();
  const task: TaskRun = {
    runId,
    taskId: data.taskId ?? crypto.randomUUID(),
    title: data.title,
    agentId: data.agentId,
    status: "queued",
    input: data.input,
    output: "",
    chunks: [],
    createdAt: Date.now(),
    toolCalls: [],
    controllers: [],
  };
  taskStore.set(runId, task);
  return task;
}

export function getTask(runId: string): TaskRun | undefined {
  return taskStore.get(runId);
}

export function getAllTasks(): TaskRun[] {
  return Array.from(taskStore.values()).sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Push a raw SSE data chunk to all registered subscribers and buffer it
 * for any future subscribers that arrive after the data has been produced.
 */
export function pushChunk(runId: string, chunk: string): void {
  const task = taskStore.get(runId);
  if (!task) return;

  const sseMessage = `data: ${chunk}\n\n`;
  task.chunks.push(sseMessage);

  // Deliver to all live subscribers
  for (const controller of task.controllers) {
    try {
      controller.enqueue(new TextEncoder().encode(sseMessage));
    } catch {
      // Controller may be closed — ignore
    }
  }
}

export function completeTask(runId: string, output: string): void {
  const task = taskStore.get(runId);
  if (!task) return;

  task.status = "completed";
  task.output = output;
  task.completedAt = Date.now();

  // Send a terminal "done" event then close all controllers
  const doneMessage = `data: ${JSON.stringify({ type: "done" })}\n\n`;
  task.chunks.push(doneMessage);
  for (const controller of task.controllers) {
    try {
      controller.enqueue(new TextEncoder().encode(doneMessage));
      controller.close();
    } catch {
      // Already closed — ignore
    }
  }
  task.controllers = [];
}

export function failTask(runId: string, error: string): void {
  const task = taskStore.get(runId);
  if (!task) return;

  task.status = "failed";
  task.error = error;
  task.completedAt = Date.now();

  const errorMessage = `data: ${JSON.stringify({ type: "error", error })}\n\n`;
  task.chunks.push(errorMessage);
  for (const controller of task.controllers) {
    try {
      controller.enqueue(new TextEncoder().encode(errorMessage));
      controller.close();
    } catch {
      // Already closed — ignore
    }
  }
  task.controllers = [];
}
