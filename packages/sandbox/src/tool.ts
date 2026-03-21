import { z } from "zod";
import type { Tool } from "@powerhouse-ai/core";
import { CodeExecutor } from "./executor.js";
import type { SandboxRuntime } from "./types.js";

const inputSchema = z.object({
  code: z.string().describe("The code to execute"),
  language: z.enum(["javascript", "python"]).optional().describe("Programming language"),
});

/**
 * Creates a code-execution tool that agents can use to safely run code.
 *
 * @example
 * ```ts
 * const agent = new Agent({
 *   name: "coder",
 *   instructions: "You write and execute code to solve problems.",
 *   tools: {
 *     execute_code: createCodeExecutionTool(),
 *   },
 * });
 * ```
 */
export function createCodeExecutionTool(
  options: { runtime?: SandboxRuntime } = {}
): Tool<typeof inputSchema, string> {
  const executor = new CodeExecutor();

  return {
    description:
      "Execute code safely in an isolated sandbox. Returns stdout, stderr, and exit code.",
    inputSchema,
    execute: async ({ code, language }) => {
      const runtime =
        language === "python" ? "python3.13" : (options.runtime ?? "node24");

      const result = await executor.run(code, { runtime });
      const lines: string[] = [];
      if (result.stdout) lines.push(`stdout:\n${result.stdout}`);
      if (result.stderr) lines.push(`stderr:\n${result.stderr}`);
      lines.push(`exit code: ${result.exitCode} | duration: ${result.duration}ms`);
      return lines.join("\n\n");
    },
  };
}
