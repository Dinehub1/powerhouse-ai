import { getTask } from "../../../lib/task-store";

// GET /api/tasks/[runId] — return task status, output, toolCalls, timestamps
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const task = getTask(runId);

  if (!task) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }

  // Omit internal streaming state from the API response
  return Response.json({
    runId: task.runId,
    taskId: task.taskId,
    title: task.title,
    agentId: task.agentId,
    status: task.status,
    input: task.input,
    output: task.output,
    error: task.error,
    createdAt: task.createdAt,
    startedAt: task.startedAt,
    completedAt: task.completedAt,
    toolCalls: task.toolCalls,
  });
}
