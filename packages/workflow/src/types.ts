export type WorkflowStatus = "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";

export interface WorkflowStep<TInput = unknown, TOutput = unknown> {
  name: string;
  description?: string;
  execute: (input: TInput, ctx: StepContext) => TOutput | Promise<TOutput>;
  retries?: number;
  timeout?: number;
}

export interface StepContext {
  runId: string;
  stepName: string;
  attempt: number;
  metadata: Record<string, unknown>;
  emit: <T>(event: T) => Promise<void>;
}

export interface WorkflowRun<TOutput = unknown> {
  runId: string;
  status: WorkflowStatus;
  output?: TOutput;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
  steps: StepResult[];
}

export interface StepResult {
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  output?: unknown;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
  attempts: number;
}

export interface HumanApprovalRequest {
  token: string;
  title: string;
  description: string;
  data?: Record<string, unknown>;
  expiresAt?: Date;
}

export interface HumanApprovalResponse {
  approved: boolean;
  comment?: string;
  approvedBy?: string;
}

export interface WorkflowEvent {
  type: string;
  runId: string;
  timestamp: Date;
  data?: unknown;
}
