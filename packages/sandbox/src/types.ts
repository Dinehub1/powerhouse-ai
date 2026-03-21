export type SandboxRuntime = "node24" | "node22" | "python3.13";

export interface ExecutionOptions {
  runtime?: SandboxRuntime;
  timeout?: number;
  allowedDomains?: string[];
  env?: Record<string, string>;
  files?: Array<{ path: string; content: string }>;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  duration: number;
}
