import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type {
  AgentConfig,
  AgentResponse,
  DynamicAgentConfig,
  GenerateOptions,
  Message,
  ModelId,
  StreamChunk,
  SubAgentTool,
  ToolCall,
  ToolMap,
  Agent as IAgent,
} from "./types.js";

const DEFAULT_MODEL: ModelId = "claude-sonnet-4-6";
const DEFAULT_MAX_TOKENS = 8192;
const DEFAULT_MAX_STEPS = 10;

/**
 * Core Agent class — the fundamental building block of Powerhouse-AI.
 *
 * @example
 * ```ts
 * const agent = new Agent({
 *   name: "research-agent",
 *   instructions: "You are a research assistant.",
 *   model: "claude-sonnet-4-6",
 *   tools: { search: searchTool },
 * });
 *
 * const { text } = await agent.generate("What is quantum computing?");
 * ```
 */
export class Agent implements IAgent {
  readonly name: string;
  readonly config: AgentConfig;
  private client: Anthropic;
  private conversationHistory = new Map<string, Message[]>();

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.config = config;
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Generate a single response (non-streaming, multi-step tool calling)
   */
  async generate(prompt: string, options: GenerateOptions = {}): Promise<AgentResponse> {
    const conversationId = options.conversationId ?? crypto.randomUUID();
    const runId = crypto.randomUUID();
    const maxSteps = options.maxSteps ?? DEFAULT_MAX_STEPS;

    const history = this.conversationHistory.get(conversationId) ?? [];
    const messages: Message[] = [...history, { role: "user", content: prompt }];

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const allToolCalls: ToolCall[] = [];
    let finalText = "";
    let stopReason = "end_turn";

    // Resolve dynamic instructions
    const instructions =
      typeof this.config.instructions === "function"
        ? await (this.config.instructions as Function)({ userId: options.userId, metadata: options.metadata })
        : this.config.instructions;

    // Resolve dynamic tools
    const tools =
      typeof this.config.tools === "function"
        ? await (this.config.tools as Function)({ userId: options.userId, metadata: options.metadata })
        : (this.config.tools ?? {});

    // Build Anthropic tool definitions
    const anthropicTools = buildAnthropicTools(tools, this.config.subAgents ?? []);

    // Agentic loop — runs until end_turn or max steps
    let anthropicMessages = toAnthropicMessages(messages);
    for (let step = 0; step < maxSteps; step++) {
      if (this.config.onBeforeRequest) {
        await this.config.onBeforeRequest({ agentName: this.name, messages, runId });
      }

      const response = await this.client.messages.create({
        model: this.config.model ?? DEFAULT_MODEL,
        max_tokens: this.config.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: this.config.temperature,
        system: instructions,
        tools: anthropicTools.length > 0 ? anthropicTools : undefined,
        messages: anthropicMessages,
      });

      totalInputTokens += response.usage.input_tokens;
      totalOutputTokens += response.usage.output_tokens;
      stopReason = response.stop_reason ?? "end_turn";

      // Extract text from response
      const textBlock = response.content.find((b) => b.type === "text");
      if (textBlock?.type === "text") finalText = textBlock.text;

      // If no tool calls, we're done
      const toolUseBlocks = response.content.filter((b) => b.type === "tool_use");
      if (toolUseBlocks.length === 0 || stopReason === "end_turn") break;

      // Execute tool calls
      const toolResults: Anthropic.ToolResultBlockParam[] = [];
      for (const block of toolUseBlocks) {
        if (block.type !== "tool_use") continue;
        const toolCall = await executeToolCall(block, tools, this.config.subAgents ?? [], {
          agentName: this.name,
          runId,
          messages,
        });
        allToolCalls.push(toolCall);
        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: String(toolCall.output),
        });
      }

      // Append assistant turn + tool results
      anthropicMessages = [
        ...anthropicMessages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ];
    }

    const agentResponse: AgentResponse = {
      text: finalText,
      usage: { inputTokens: totalInputTokens, outputTokens: totalOutputTokens },
      toolCalls: allToolCalls,
      stopReason,
    };

    if (this.config.onAfterResponse) {
      await this.config.onAfterResponse({ agentName: this.name, messages, runId, response: agentResponse });
    }

    // Persist conversation
    this.conversationHistory.set(conversationId, [
      ...messages,
      { role: "assistant", content: finalText },
    ]);

    return agentResponse;
  }

  /**
   * Stream a response — yields chunks as they arrive
   */
  async *stream(prompt: string, options: GenerateOptions = {}): AsyncGenerator<StreamChunk> {
    const runId = crypto.randomUUID();
    const conversationId = options.conversationId ?? crypto.randomUUID();
    const history = this.conversationHistory.get(conversationId) ?? [];
    const messages: Message[] = [...history, { role: "user", content: prompt }];

    const instructions =
      typeof this.config.instructions === "function"
        ? await (this.config.instructions as Function)({ userId: options.userId })
        : this.config.instructions;

    const tools = this.config.tools ?? {};
    const anthropicTools = buildAnthropicTools(tools, this.config.subAgents ?? []);

    let fullText = "";
    const stream = await this.client.messages.stream({
      model: this.config.model ?? DEFAULT_MODEL,
      max_tokens: this.config.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: instructions,
      tools: anthropicTools.length > 0 ? anthropicTools : undefined,
      messages: toAnthropicMessages(messages),
    });

    for await (const chunk of stream) {
      if (chunk.type === "content_block_delta" && chunk.delta.type === "text_delta") {
        fullText += chunk.delta.text;
        yield { type: "text", text: chunk.delta.text };
      } else if (chunk.type === "content_block_start" && chunk.content_block.type === "tool_use") {
        yield { type: "tool_start", toolCall: { name: chunk.content_block.name } };
      } else if (chunk.type === "message_stop") {
        yield { type: "done" };
      }
    }

    this.conversationHistory.set(conversationId, [
      ...messages,
      { role: "assistant", content: fullText },
    ]);
  }

  /**
   * Convert this agent into a sub-agent tool for supervisor patterns
   */
  asSubAgent(): SubAgentTool {
    return {
      agentName: this.name,
      description: `Delegate a task to the ${this.name} agent: ${this.config.instructions.slice(0, 100)}`,
      inputSchema: z.object({ task: z.string().describe("The task to delegate") }),
      execute: async ({ task }) => {
        const { text } = await this.generate(task);
        return text;
      },
    };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildAnthropicTools(
  tools: ToolMap,
  subAgents: IAgent[]
): Anthropic.Tool[] {
  const result: Anthropic.Tool[] = [];

  for (const [name, tool] of Object.entries(tools)) {
    result.push({
      name,
      description: tool.description,
      input_schema: zodToJsonSchema(tool.inputSchema, { $refStrategy: "none" }) as Anthropic.Tool["input_schema"],
    });
  }

  for (const agent of subAgents) {
    const subTool = agent.asSubAgent();
    result.push({
      name: `delegate_to_${agent.name.replace(/[^a-z0-9_]/gi, "_")}`,
      description: subTool.description,
      input_schema: zodToJsonSchema(subTool.inputSchema, { $refStrategy: "none" }) as Anthropic.Tool["input_schema"],
    });
  }

  return result;
}

async function executeToolCall(
  block: Anthropic.ToolUseBlock,
  tools: ToolMap,
  subAgents: IAgent[],
  ctx: { agentName: string; runId: string; messages: Message[] }
): Promise<ToolCall> {
  const input = block.input as Record<string, unknown>;

  // Check if it's a sub-agent delegation
  if (block.name.startsWith("delegate_to_")) {
    const agentName = block.name.replace("delegate_to_", "").replace(/_/g, "-");
    const subAgent = subAgents.find((a) => a.name.replace(/[^a-z0-9_]/gi, "_") === agentName.replace(/-/g, "_"));
    if (subAgent) {
      const { text } = await subAgent.generate(String(input.task));
      return { name: block.name, input, output: text };
    }
  }

  const tool = tools[block.name];
  if (!tool) throw new Error(`Tool "${block.name}" not found`);

  const parsed = tool.inputSchema.parse(input);
  const output = await tool.execute(parsed, ctx);
  return { name: block.name, input, output };
}

function toAnthropicMessages(messages: Message[]): Anthropic.MessageParam[] {
  return messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
}
