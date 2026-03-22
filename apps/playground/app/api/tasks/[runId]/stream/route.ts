import { getTask } from "../../../../lib/task-store";

export const dynamic = "force-dynamic";

// GET /api/tasks/[runId]/stream — SSE stream of task execution chunks
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ runId: string }> }
) {
  const { runId } = await params;
  const task = getTask(runId);

  if (!task) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }

  const encoder = new TextEncoder();

  // Track the controller so the cancel hook can remove it from the task's list
  let registeredController: ReadableStreamDefaultController | null = null;

  const readable = new ReadableStream({
    start(controller) {
      // Always flush the buffered chunks first so late-joining clients
      // get a complete picture of what has already happened.
      for (const buffered of task.chunks) {
        try {
          controller.enqueue(encoder.encode(buffered));
        } catch {
          // Controller closed before we could flush — bail out
          return;
        }
      }

      // If the task is already terminal, close immediately after flushing
      if (task.status === "completed" || task.status === "failed") {
        try {
          controller.close();
        } catch {
          // Already closed
        }
        return;
      }

      // Task is still queued or running — register this controller to receive
      // live chunks as they are produced by runTaskAsync
      registeredController = controller;
      task.controllers.push(controller);
    },

    cancel() {
      // Remove this controller from the task's subscriber list when the
      // client disconnects early
      if (!task || !registeredController) return;
      const idx = task.controllers.indexOf(registeredController);
      if (idx !== -1) {
        task.controllers.splice(idx, 1);
      }
      registeredController = null;
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Prevent proxies from buffering the SSE stream
      "X-Accel-Buffering": "no",
    },
  });
}
