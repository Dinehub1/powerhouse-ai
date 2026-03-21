import { z } from "zod";
import type { Tool, ToolContext } from "./types.js";

/**
 * Helper to create a fully-typed tool with Zod validation.
 *
 * @example
 * ```ts
 * const weatherTool = createTool({
 *   description: "Get current weather for a city",
 *   inputSchema: z.object({
 *     city: z.string(),
 *     units: z.enum(["celsius", "fahrenheit"]).default("celsius"),
 *   }),
 *   execute: async ({ city, units }) => {
 *     const data = await fetchWeather(city, units);
 *     return `${data.temp}°${units === "celsius" ? "C" : "F"} in ${city}`;
 *   },
 * });
 * ```
 */
export function createTool<TInput extends z.ZodTypeAny, TOutput>(
  config: Tool<TInput, TOutput>
): Tool<TInput, TOutput> {
  return config;
}

/**
 * Shorthand for createTool with inline execute
 */
export function defineTool<TInput extends z.ZodTypeAny, TOutput>(
  description: string,
  inputSchema: TInput,
  execute: (input: z.infer<TInput>, ctx: ToolContext) => TOutput | Promise<TOutput>
): Tool<TInput, TOutput> {
  return { description, inputSchema, execute };
}
