import OpenAI from "openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type {
  AgentConfig,
  AgentResponse,
  GenerateOptions,
  Message,
  ModelId,
  StreamChunk,
  SubAgentTool,
  ToolCall,
  ToolMap,
  Agent as IAgent,
} from "./types.js";

// Default model — reads from env so OPENAI_MODEL works out of the box
const DEFAULT_MODEL: ModelId =
  (process.env.OPENAI_MODEL as ModelId) ?? "moonshotai/kimi-k2.5";
const DEFAULT_MAX_TOKENS = parseInt(process.env.OPENAI_MAX_TOKENS ?? "4096", 10);
const DEFAULT_TEMPERATURE = parseFloat(process.env.OPENAI_TEMPERATURE ?? "0.7");
const DEFAULT_MAX_STEPS = 10;

function createClient(): OpenAI {
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL, // e.g. https://integrate.api.nvidia.com/v1
  });
}

/**
 * Core Agent class — the fundamental building block of Powerhouse-AI.
 * Uses any OpenAI-compatible API (NVIDIA, OpenAI, Groq, Ollama, etc.)
 *
 * Config is read from environment variables:
 *   OPENAI_API_KEY      — your API key
 *   OPENAI_BASE_URL     — custom endpoint (e.g. NVIDIA's API)
 *   OPENAI_MODEL        — default model (e.g. moonshotai/kimi-k2.5)
 *   OPENAI_TEMPERATURE  — default temperature
 *   OPENAI_MAX_TOKENS   — default max tokens
 *
 * @example
 * ```ts
 * const agent = new Agent({
 *   name: "research-agent",
 *   instructions: "You are a research assistant.",
 *   tools: { search: searchTool },
 * });
 *
 * const { text } = await agent.generate("What is quantum computing?");
 * ```
 */
export class Agent implements IAgent {
  readonly name: string;
  readonly config: AgentConfig;
  private _client: OpenAI | null = null;
  private conversationHistory = new Map<string, Message[]>();

  constructor(config: AgentConfig) {
    this.name = config.name;
    this.config = config;
  }

  private get client(): OpenAI {
    if (!this._client) this._client = createClient();
    return this._client;
  }

  /**
   * Generate a single response with multi-step tool calling (agentic loop)
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
    let stopReason = "stop";

    const instructions =
      typeof this.config.instructions === "function"
        ? await (this.config.instructions as Function)({ userId: options.userId, metadata: options.metadata })
        : this.config.instructions;

    const tools =
      typeof this.config.tools === "function"
        ? await (this.config.tools as Function)({ userId: options.userId, metadata: options.metadata })
        : (this.config.tools ?? {});

    const openaiTools = buildOpenAITools(tools, this.config.subAgents ?? []);

    // Build message list for OpenAI format
    let oaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: instructions },
      ...toOpenAIMessages(messages),
    ];

    // Agentic loop
    for (let step = 0; step < maxSteps; step++) {
      if (this.config.onBeforeRequest) {
        await this.config.onBeforeRequest({ agentName: this.name, messages, runId });
      }

      const response = await this.client.chat.completions.create({
        model: this.config.model ?? DEFAULT_MODEL,
        max_tokens: this.config.maxTokens ?? DEFAULT_MAX_TOKENS,
        temperature: this.config.temperature ?? DEFAULT_TEMPERATURE,
        tools: openaiTools.length > 0 ? openaiTools : undefined,
        tool_choice: openaiTools.length > 0 ? "auto" : undefined,
        messages: oaiMessages,
      });

      const choice = response.choices[0];
      stopReason = choice.finish_reason ?? "stop";
      totalInputTokens += response.usage?.prompt_tokens ?? 0;
      totalOutputTokens += response.usage?.completion_tokens ?? 0;

      const assistantMsg = choice.message;
      finalText = assistantMsg.content ?? "";

      // No tool calls — done
      if (!assistantMsg.tool_calls || assistantMsg.tool_calls.length === 0 || stopReason === "stop") {
        break;
      }

      // Execute tool calls
      oaiMessages = [...oaiMessages, assistantMsg];
      for (const tc of assistantMsg.tool_calls) {
        const input = JSON.parse(tc.function.arguments) as Record<string, unknown>;
        const toolCall = await executeToolCall(
          tc.id,
          tc.function.name,
          input,
          tools,
          this.config.subAgents ?? [],
          { agentName: this.name, runId, messages }
        );
        allToolCalls.push(toolCall);
        oaiMessages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: String(toolCall.output),
        });
      }
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

    this.conversationHistory.set(conversationId, [
      ...messages,
      { role: "assistant", content: finalText },
    ]);

    return agentResponse;
  }

  /**
   * Stream a response — yields text chunks as they arrive
   */
  async *stream(prompt: string, options: GenerateOptions = {}): AsyncGenerator<StreamChunk> {
    const conversationId = options.conversationId ?? crypto.randomUUID();
    const history = this.conversationHistory.get(conversationId) ?? [];
    const messages: Message[] = [...history, { role: "user", content: prompt }];

    const instructions =
      typeof this.config.instructions === "function"
        ? await (this.config.instructions as Function)({ userId: options.userId })
        : this.config.instructions;

    const tools = this.config.tools ?? {};
    const openaiTools = buildOpenAITools(tools, this.config.subAgents ?? []);

    let fullText = "";
    const stream = await this.client.chat.completions.create({
      model: this.config.model ?? DEFAULT_MODEL,
      max_tokens: this.config.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: this.config.temperature ?? DEFAULT_TEMPERATURE,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
      stream: true,
      messages: [
        { role: "system", content: instructions },
        ...toOpenAIMessages(messages),
      ],
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        fullText += delta.content;
        yield { type: "text", text: delta.content };
      }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          if (tc.function?.name) {
            yield { type: "tool_start", toolCall: { name: tc.function.name } };
          }
        }
      }
      if (chunk.choices[0]?.finish_reason) {
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
    const instructions = typeof this.config.instructions === "string"
      ? this.config.instructions
      : "[dynamic instructions]";
    return {
      agentName: this.name,
      description: `Delegate a task to the ${this.name} agent: ${instructions.slice(0, 100)}`,
      inputSchema: z.object({ task: z.string().describe("The task to delegate") }),
      execute: async ({ task }) => {
        const { text } = await this.generate(task);
        return text;
      },
    };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildOpenAITools(tools: ToolMap, subAgents: IAgent[]): OpenAI.Chat.ChatCompletionTool[] {
  const result: OpenAI.Chat.ChatCompletionTool[] = [];

  for (const [name, tool] of Object.entries(tools)) {
    result.push({
      type: "function",
      function: {
        name,
        description: tool.description,
        parameters: zodToJsonSchema(tool.inputSchema, { $refStrategy: "none" }) as Record<string, unknown>,
      },
    });
  }

  for (const agent of subAgents) {
    const subTool = agent.asSubAgent();
    result.push({
      type: "function",
      function: {
        name: `delegate_to_${agent.name.replace(/[^a-z0-9_]/gi, "_")}`,
        description: subTool.description,
        parameters: zodToJsonSchema(subTool.inputSchema, { $refStrategy: "none" }) as Record<string, unknown>,
      },
    });
  }

  return result;
}

async function executeToolCall(
  id: string,
  name: string,
  input: Record<string, unknown>,
  tools: ToolMap,
  subAgents: IAgent[],
  ctx: { agentName: string; runId: string; messages: Message[] }
): Promise<ToolCall> {
  // Sub-agent delegation
  if (name.startsWith("delegate_to_")) {
    const agentName = name.replace("delegate_to_", "");
    const subAgent = subAgents.find(
      (a) => a.name.replace(/[^a-z0-9_]/gi, "_") === agentName
    );
    if (subAgent) {
      const { text } = await subAgent.generate(String(input.task));
      return { name, input, output: text };
    }
  }

  const tool = tools[name];
  if (!tool) throw new Error(`Tool "${name}" not found`);

  const parsed = tool.inputSchema.parse(input);
  const output = await tool.execute(parsed, ctx);
  return { name, input, output };
}

function toOpenAIMessages(messages: Message[]): OpenAI.Chat.ChatCompletionMessageParam[] {
  return messages.map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));
}
