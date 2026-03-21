import { NextResponse } from "next/server";
import { Agent, defineTool } from "@powerhouse-ai/core";
import { z } from "zod";

const calculatorTool = defineTool(
  "Perform arithmetic calculations",
  z.object({
    expression: z.string().describe("A math expression, e.g. '2 + 2'"),
  }),
  ({ expression }) => {
    const result = Function(`"use strict"; return (${expression})`)();
    return `${expression} = ${result}`;
  }
);

const demoAgent = new Agent({
  name: "openclaw-demo",
  instructions:
    "You are a demo agent for Powerhouse-AI, powered by OpenClaw. Be helpful and concise. You can do math with your calculator tool.",
  model: "claude-haiku-4-5-20251001",
  tools: { calculator: calculatorTool },
  maxTokens: 512,
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const prompt = url.searchParams.get("prompt") ?? "What is 42 * 7? Show your calculation.";

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error: "ANTHROPIC_API_KEY not set. Add it to your .env file.",
        hint: "cp .env.example .env  →  add your key  →  restart the server",
      },
      { status: 500 }
    );
  }

  try {
    const result = await demoAgent.generate(prompt);
    return NextResponse.json({
      framework: "Powerhouse-AI",
      engine: "OpenClaw",
      agent: "openclaw-demo",
      prompt,
      response: result.text,
      usage: result.usage,
      toolCalls: result.toolCalls,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
