import { scheduler } from "node:timers/promises";
import type {
  WorkflowRun,
  WorkflowStep,
  StepContext,
  StepResult,
  HumanApprovalRequest,
  HumanApprovalResponse,
} from "./types.js";

type EventListener<T> = (event: T) => void | Promise<void>;

/**
 * WorkflowRunner — executes a sequence of typed steps with retry,
 * human-in-the-loop approval gates, and event streaming.
 *
 * @example
 * ```ts
 * const runner = new WorkflowRunner("my-workflow");
 *
 * runner.addStep({
 *   name: "fetch-data",
 *   execute: async (input, ctx) => {
 *     const data = await fetchFromAPI(input.url);
 *     await ctx.emit({ type: "data_fetched", count: data.length });
 *     return data;
 *   },
 * });
 *
 * runner.addApprovalGate({
 *   name: "review-data",
 *   approvalRequest: (data) => ({
 *     title: "Review fetched data",
 *     description: `${data.length} items ready for processing`,
 *   }),
 * });
 *
 * const run = await runner.execute({ url: "https://api.example.com/data" });
 * ```
 */
export class WorkflowRunner<TInput = unknown, TOutput = unknown> {
  private steps: Array<WorkflowStep | ApprovalGate> = [];
  private listeners: Map<string, EventListener<unknown>[]> = new Map();
  private pendingApprovals: Map<string, PendingApproval> = new Map();
  private runs: Map<string, WorkflowRun> = new Map();

  constructor(private readonly name: string) {}

  addStep<TStepInput = unknown, TStepOutput = unknown>(
    step: WorkflowStep<TStepInput, TStepOutput>
  ): this {
    this.steps.push(step as WorkflowStep);
    return this;
  }

  addApprovalGate<TStepInput = unknown>(config: {
    name: string;
    approvalRequest: (input: TStepInput) => Omit<HumanApprovalRequest, "token">;
    onApproved?: (input: TStepInput, response: HumanApprovalResponse) => void | Promise<void>;
    onRejected?: (input: TStepInput, response: HumanApprovalResponse) => void | Promise<void>;
    timeoutMs?: number;
  }): this {
    this.steps.push({ ...config, type: "approval" } as ApprovalGate);
    return this;
  }

  on<TEvent>(eventType: string, listener: EventListener<TEvent>): this {
    const existing = this.listeners.get(eventType) ?? [];
    this.listeners.set(eventType, [...existing, listener as EventListener<unknown>]);
    return this;
  }

  async execute(input: TInput): Promise<WorkflowRun<TOutput>> {
    const runId = crypto.randomUUID();
    const run: WorkflowRun<TOutput> = {
      runId,
      status: "running",
      createdAt: new Date(),
      steps: this.steps.map((s) => ({
        name: s.name,
        status: "pending",
        attempts: 0,
      })),
    };
    this.runs.set(runId, run as WorkflowRun);
    await this.emit("workflow_started", { runId, name: this.name, input });

    let currentInput: unknown = input;

    for (let i = 0; i < this.steps.length; i++) {
      const step = this.steps[i];
      const stepResult = run.steps[i];

      if ("type" in step && step.type === "approval") {
        const gate = step as ApprovalGate;
        const request = gate.approvalRequest(currentInput);
        const token = `${runId}:${gate.name}:${crypto.randomUUID()}`;

        const fullRequest: HumanApprovalRequest = { ...request, token };
        await this.emit("approval_requested", { runId, gate: gate.name, request: fullRequest });

        stepResult.status = "running";
        stepResult.startedAt = new Date();
        run.status = "paused";

        const approval = await this.waitForApproval(token, gate.timeoutMs ?? 24 * 60 * 60 * 1000);

        if (!approval.approved) {
          if (gate.onRejected) await gate.onRejected(currentInput, approval);
          stepResult.status = "failed";
          stepResult.error = `Rejected: ${approval.comment ?? "No reason given"}`;
          run.status = "failed";
          await this.emit("workflow_rejected", { runId, gate: gate.name, response: approval });
          return run as WorkflowRun<TOutput>;
        }

        if (gate.onApproved) await gate.onApproved(currentInput, approval);
        stepResult.status = "completed";
        stepResult.completedAt = new Date();
        run.status = "running";
        await this.emit("approval_granted", { runId, gate: gate.name, response: approval });
        continue;
      }

      // Regular step
      const regularStep = step as WorkflowStep;
      stepResult.status = "running";
      stepResult.startedAt = new Date();

      const maxAttempts = (regularStep.retries ?? 0) + 1;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        stepResult.attempts = attempt + 1;
        try {
          const ctx: StepContext = {
            runId,
            stepName: regularStep.name,
            attempt,
            metadata: {},
            emit: async (event) => this.emit("step_event", { runId, step: regularStep.name, event }),
          };

          const output = await withTimeout(
            Promise.resolve(regularStep.execute(currentInput, ctx)),
            regularStep.timeout ?? 60_000
          );

          stepResult.status = "completed";
          stepResult.output = output;
          stepResult.completedAt = new Date();
          currentInput = output;
          lastError = null;
          await this.emit("step_completed", { runId, step: regularStep.name, output });
          break;
        } catch (error) {
          lastError = error as Error;
          await this.emit("step_failed", {
            runId,
            step: regularStep.name,
            error: String(error),
            attempt,
          });
          if (attempt < maxAttempts - 1) {
            // Exponential backoff
            await sleep(Math.min(1000 * 2 ** attempt, 30_000));
          }
        }
      }

      if (lastError) {
        stepResult.status = "failed";
        stepResult.error = lastError.message;
        run.status = "failed";
        run.error = `Step "${regularStep.name}" failed: ${lastError.message}`;
        await this.emit("workflow_failed", { runId, step: regularStep.name, error: lastError.message });
        return run as WorkflowRun<TOutput>;
      }
    }

    run.status = "completed";
    run.output = currentInput as TOutput;
    run.completedAt = new Date();
    await this.emit("workflow_completed", { runId, output: run.output });
    return run as WorkflowRun<TOutput>;
  }

  /**
   * Resume a paused workflow by providing approval
   */
  async approve(token: string, response: HumanApprovalResponse): Promise<void> {
    const pending = this.pendingApprovals.get(token);
    if (!pending) throw new Error(`No pending approval for token: ${token}`);
    pending.resolve(response);
    this.pendingApprovals.delete(token);
  }

  getRun(runId: string): WorkflowRun | undefined {
    return this.runs.get(runId);
  }

  private waitForApproval(token: string, timeoutMs: number): Promise<HumanApprovalResponse> {
    const timeoutPromise = sleep(timeoutMs).then(() => {
      this.pendingApprovals.delete(token);
      return Promise.reject(new Error(`Approval timeout after ${timeoutMs}ms for token: ${token}`));
    });

    const approvalPromise = new Promise<HumanApprovalResponse>((resolve) => {
      this.pendingApprovals.set(token, { resolve });
    });

    return Promise.race([approvalPromise, timeoutPromise]);
  }

  private async emit(type: string, data: unknown): Promise<void> {
    const listeners = [...(this.listeners.get(type) ?? []), ...(this.listeners.get("*") ?? [])];
    await Promise.all(listeners.map((l) => l({ type, ...((data as object) ?? {}) })));
  }
}

interface ApprovalGate {
  name: string;
  type: "approval";
  approvalRequest: (input: unknown) => Omit<HumanApprovalRequest, "token">;
  onApproved?: (input: unknown, response: HumanApprovalResponse) => void | Promise<void>;
  onRejected?: (input: unknown, response: HumanApprovalResponse) => void | Promise<void>;
  timeoutMs?: number;
}

interface PendingApproval {
  resolve: (response: HumanApprovalResponse) => void;
}

function sleep(ms: number): Promise<void> {
  return scheduler.wait(ms);
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const ac = new AbortController();
  const timeoutPromise = scheduler.wait(ms, { signal: ac.signal })
    .then(() => Promise.reject(new Error(`Step timed out after ${ms}ms`)))
    .catch((err: Error) => {
      if (err.name === "AbortError") return Promise.resolve() as Promise<never>;
      return Promise.reject(err);
    });
  return promise.finally(() => ac.abort()).then(
    (v) => v,
    (e) => Promise.race([promise.catch(() => Promise.reject(e)), timeoutPromise])
  );
}
