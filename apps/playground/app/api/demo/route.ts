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
    "You are a demo agent for Powerhouse-AI, powered by OpenClaw. Be helpful and concise. Use your calculator tool for any math.",
  tools: { calculator: calculatorTool },
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const prompt = url.searchParams.get("prompt") ?? "What is 42 * 7? Show your calculation.";

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      {
        error: "OPENAI_API_KEY not set.",
        hint: "Copy .env.example to .env and add your API key, then restart the server.",
      },
      { status: 500 }
    );
  }

  try {
    const result = await demoAgent.generate(prompt);
    return NextResponse.json({
      framework: "Powerhouse-AI",
      engine: "OpenClaw",
      provider: process.env.OPENAI_BASE_URL ?? "openai",
      model: process.env.OPENAI_MODEL ?? "default",
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
