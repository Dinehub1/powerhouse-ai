import { NextResponse } from "next/server";
import { Agent, defineTool } from "@powerhouse-ai/core";
import { z } from "zod";

const calculatorTool = defineTool(
  "Perform arithmetic calculations",
  z.object({
    expression: z.string().describe("A safe math expression, e.g. '2 + 2'"),
  }),
  ({ expression }) => {
    const result = Function(`"use strict"; return (${expression})`)();
    return `${expression} = ${result}`;
  }
);

const demoAgent = new Agent({
  name: "demo-agent",
  instructions: "You are a helpful demo agent for Powerhouse-AI. Be concise.",
  model: "claude-haiku-4-5-20251001",
  tools: { calculator: calculatorTool },
  maxTokens: 512,
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const prompt = url.searchParams.get("prompt") ?? "What is 42 * 7? Show your work.";

  try {
    const result = await demoAgent.generate(prompt);
    return NextResponse.json({
      agent: "demo-agent",
      prompt,
      response: result.text,
      usage: result.usage,
      toolCalls: result.toolCalls,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
