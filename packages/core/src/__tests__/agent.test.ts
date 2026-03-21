import { describe, it, expect, vi, beforeEach } from "vitest";
import { Agent } from "../agent.js";
import { defineTool } from "../tool.js";
import { z } from "zod";

// Mock Anthropic SDK
vi.mock("@anthropic-ai/sdk", () => {
  const mockCreate = vi.fn().mockResolvedValue({
    content: [{ type: "text", text: "Hello! I can help you with that." }],
    stop_reason: "end_turn",
    usage: { input_tokens: 10, output_tokens: 20 },
  });

  return {
    default: vi.fn().mockImplementation(() => ({
      messages: { create: mockCreate },
    })),
  };
});

describe("Agent", () => {
  let agent: Agent;

  beforeEach(() => {
    agent = new Agent({
      name: "test-agent",
      instructions: "You are a helpful assistant.",
      model: "claude-sonnet-4-6",
    });
  });

  it("generates a response", async () => {
    const result = await agent.generate("Hello");
    expect(result.text).toBe("Hello! I can help you with that.");
    expect(result.usage.inputTokens).toBe(10);
  });

  it("executes tool calls", async () => {
    const { default: Anthropic } = await import("@anthropic-ai/sdk");
    const mockCreate = vi.fn()
      .mockResolvedValueOnce({
        content: [
          { type: "tool_use", id: "t1", name: "get_weather", input: { city: "London" } },
        ],
        stop_reason: "tool_use",
        usage: { input_tokens: 15, output_tokens: 10 },
      })
      .mockResolvedValueOnce({
        content: [{ type: "text", text: "It's 15°C in London." }],
        stop_reason: "end_turn",
        usage: { input_tokens: 25, output_tokens: 15 },
      });

    (Anthropic as ReturnType<typeof vi.fn>).mockImplementation(() => ({
      messages: { create: mockCreate },
    }));

    const agentWithTools = new Agent({
      name: "weather-agent",
      instructions: "You check the weather.",
      tools: {
        get_weather: defineTool(
          "Get weather for a city",
          z.object({ city: z.string() }),
          async ({ city }) => `15°C in ${city}`
        ),
      },
    });

    const result = await agentWithTools.generate("What's the weather in London?");
    expect(result.text).toBe("It's 15°C in London.");
    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0].name).toBe("get_weather");
  });

  it("converts to sub-agent tool", () => {
    const subTool = agent.asSubAgent();
    expect(subTool.agentName).toBe("test-agent");
    expect(subTool.description).toContain("test-agent");
  });
});
