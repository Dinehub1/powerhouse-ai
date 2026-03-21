import { Sandbox } from "@vercel/sandbox";
import type { ExecutionOptions, ExecutionResult, SandboxRuntime } from "./types.js";

/**
 * CodeExecutor — safe, isolated code execution via Vercel Sandbox.
 * Used by agents to run untrusted or AI-generated code.
 *
 * @example
 * ```ts
 * const executor = new CodeExecutor();
 *
 * const result = await executor.run(
 *   `console.log("Hello from sandbox!")`,
 *   { runtime: "node24" }
 * );
 *
 * console.log(result.stdout); // "Hello from sandbox!\n"
 * ```
 */
export class CodeExecutor {
  async run(code: string, options: ExecutionOptions = {}): Promise<ExecutionResult> {
    const {
      runtime = "node24",
      allowedDomains = [],
      env = {},
      files = [],
    } = options;

    const startTime = Date.now();
    const sandbox = await Sandbox.create({ runtime, env });

    try {
      // Lock down network before running untrusted code
      if (allowedDomains.length > 0) {
        await sandbox.updateNetworkPolicy({ allow: allowedDomains });
      } else {
        await sandbox.updateNetworkPolicy("deny-all");
      }

      // Write additional files
      if (files.length > 0) {
        await sandbox.writeFiles(
          files.map((f) => ({ path: f.path, content: Buffer.from(f.content) }))
        );
      }

      // Write the main code file
      const ext = runtime.startsWith("python") ? "py" : "js";
      await sandbox.writeFiles([
        { path: `main.${ext}`, content: Buffer.from(code) },
      ]);

      const cmd = runtime.startsWith("python") ? "python3" : "node";
      const result = await sandbox.runCommand(cmd, [`main.${ext}`]);

      return {
        stdout: await result.stdout(),
        stderr: await result.stderr(),
        exitCode: 0,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        stdout: "",
        stderr: String(error),
        exitCode: 1,
        duration: Date.now() - startTime,
      };
    } finally {
      await sandbox.stop();
    }
  }
}
