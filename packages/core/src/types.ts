import { z } from "zod";

export type ModelId =
  | "claude-opus-4-6"
  | "claude-sonnet-4-6"
  | "claude-haiku-4-5-20251001"
  | (string & {});

export interface AgentConfig<TTools extends ToolMap = ToolMap> {
  /** Agent name — used in traces and supervisor delegation */
  name: string;
  /** System instructions for the agent */
  instructions: string;
  /** Claude model to use */
  model?: ModelId;
  /** Typed tools available to the agent */
  tools?: TTools;
  /** Memory adapter */
  memory?: MemoryAdapter;
  /** Max tokens per response */
  maxTokens?: number;
  /** Temperature (0–1) */
  temperature?: number;
  /** Sub-agents this agent can delegate to */
  subAgents?: Agent[];
  /** Hook called before each LLM request */
  onBeforeRequest?: (ctx: RequestContext) => void | Promise<void>;
  /** Hook called after each LLM response */
  onAfterResponse?: (ctx: ResponseContext) => void | Promise<void>;
}

export type ToolMap = Record<string, Tool<z.ZodTypeAny, unknown>>;

export interface Tool<TInput extends z.ZodTypeAny = z.ZodTypeAny, TOutput = unknown> {
  description: string;
  inputSchema: TInput;
  execute: (input: z.infer<TInput>, ctx: ToolContext) => TOutput | Promise<TOutput>;
}

export interface ToolContext {
  agentName: string;
  runId: string;
  messages: Message[];
}

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface AgentResponse {
  text: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  toolCalls: ToolCall[];
  stopReason: string;
}

export interface ToolCall {
  name: string;
  input: unknown;
  output: unknown;
}

export interface StreamChunk {
  type: "text" | "tool_start" | "tool_end" | "done";
  text?: string;
  toolCall?: Partial<ToolCall>;
}

export interface RequestContext {
  agentName: string;
  messages: Message[];
  runId: string;
}

export interface ResponseContext extends RequestContext {
  response: AgentResponse;
}

export interface MemoryAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  clear(namespace?: string): Promise<void>;
}

/** For dynamic agents — instructions/tools resolved at runtime */
export interface DynamicAgentConfig<TTools extends ToolMap = ToolMap>
  extends Omit<AgentConfig<TTools>, "instructions" | "tools"> {
  instructions: string | ((ctx: { userId?: string; metadata?: Record<string, unknown> }) => string | Promise<string>);
  tools?:
    | TTools
    | ((ctx: { userId?: string; metadata?: Record<string, unknown> }) => TTools | Promise<TTools>);
}

export interface Agent {
  readonly name: string;
  readonly config: AgentConfig;
  generate(prompt: string, options?: GenerateOptions): Promise<AgentResponse>;
  stream(prompt: string, options?: GenerateOptions): AsyncGenerator<StreamChunk>;
  asSubAgent(): SubAgentTool;
}

export interface GenerateOptions {
  conversationId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  maxSteps?: number;
}

export interface SubAgentTool extends Tool<z.ZodObject<{ task: z.ZodString }>, string> {
  agentName: string;
}
