import { Agent } from "./agent.js";
import type { AgentConfig, AgentResponse, GenerateOptions, ToolMap } from "./types.js";

/**
 * SupervisorAgent — orchestrates multiple sub-agents.
 * The supervisor automatically routes tasks to the right agent.
 *
 * @example
 * ```ts
 * const supervisor = new SupervisorAgent({
 *   name: "coordinator",
 *   instructions: "Route tasks to the right specialist.",
 *   subAgents: [researchAgent, writerAgent, coderAgent],
 * });
 *
 * const { text } = await supervisor.generate("Research and write a blog post about AI.");
 * ```
 */
export class SupervisorAgent extends Agent {
  constructor(config: AgentConfig) {
    if (!config.subAgents || config.subAgents.length === 0) {
      throw new Error("SupervisorAgent requires at least one sub-agent");
    }

    // Enhance instructions with sub-agent context
    const subAgentDescriptions = config.subAgents
      .map((a) => `- ${a.name}: ${a.config.instructions.slice(0, 150)}`)
      .join("\n");

    super({
      ...config,
      instructions: `${config.instructions}\n\nAvailable specialists:\n${subAgentDescriptions}\n\nDelegate tasks to specialists using the provided tools when appropriate.`,
    });
  }
}
