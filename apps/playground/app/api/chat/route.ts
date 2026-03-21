import { Agent, defineTool } from "@powerhouse-ai/core";
import { z } from "zod";

const calculatorTool = defineTool(
  "Perform arithmetic calculations",
  z.object({ expression: z.string().describe("A math expression e.g. '2 + 2'") }),
  ({ expression }) => {
    const result = Function(`"use strict"; return (${expression})`)();
    return `${expression} = ${result}`;
  }
);

const timeTool = defineTool(
  "Get the current date and time",
  z.object({}),
  () => new Date().toLocaleString("en-US", { timeZone: "UTC", dateStyle: "full", timeStyle: "long" })
);

const agent = new Agent({
  name: "openclaw-demo",
  instructions: `You are a helpful assistant powered by OpenClaw (Kimi K2.5 via NVIDIA).
You are running inside Powerhouse-AI — an open-source TypeScript agent framework.
Be concise, friendly, and use your tools when appropriate.
When asked about yourself, mention you are powered by OpenClaw / Kimi K2.5.`,
  tools: { calculator: calculatorTool, current_time: timeTool },
});

export async function POST(request: Request) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "OPENAI_API_KEY not set. Add it to your .env file." },
      { status: 500 }
    );
  }

  const { prompt, conversationId } = (await request.json()) as {
    prompt: string;
    conversationId?: string;
  };

  if (!prompt?.trim()) {
    return Response.json({ error: "prompt is required" }, { status: 400 });
  }

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        const gen = agent.stream(prompt, { conversationId });
        for await (const chunk of gen) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
          );
        }
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", text: String(err) })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
