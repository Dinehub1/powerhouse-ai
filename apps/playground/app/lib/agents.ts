import { Agent, defineTool } from "@powerhouse-ai/core";
import { z } from "zod";

// ─── Shared Tools ─────────────────────────────────────────────────────────────

const calculatorTool = defineTool(
  "Perform arithmetic calculations on a math expression",
  z.object({
    expression: z
      .string()
      .describe("A valid JavaScript math expression, e.g. '(12 * 3.14) / 2'"),
  }),
  ({ expression }) => {
    try {
      // Safe eval — no access to scope, only arithmetic
      const result = Function(`"use strict"; return (${expression})`)();
      return `${expression} = ${result}`;
    } catch (err) {
      return `Error evaluating expression: ${String(err)}`;
    }
  }
);

const currentTimeTool = defineTool(
  "Get the current date and time in ISO 8601 format (UTC)",
  z.object({}),
  () => new Date().toISOString()
);

const wordCountTool = defineTool(
  "Count the number of words, characters, and sentences in a text string",
  z.object({
    text: z.string().describe("The text to analyze"),
  }),
  ({ text }) => {
    const words = text
      .trim()
      .split(/\s+/)
      .filter((w) => w.length > 0);
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    return JSON.stringify({
      words: words.length,
      characters: text.length,
      sentences: sentences.length,
      avgWordLength:
        words.length > 0
          ? (words.reduce((s, w) => s + w.length, 0) / words.length).toFixed(1)
          : 0,
    });
  }
);

const jsonParseTool = defineTool(
  "Parse a JSON string and return a pretty-printed, human-readable version with validation",
  z.object({
    json: z.string().describe("The JSON string to parse and pretty-print"),
  }),
  ({ json }) => {
    try {
      const parsed = JSON.parse(json);
      const keys =
        typeof parsed === "object" && parsed !== null
          ? Object.keys(parsed).length
          : 0;
      const pretty = JSON.stringify(parsed, null, 2);
      return `Parsed successfully (${keys} top-level keys):\n${pretty}`;
    } catch (err) {
      return `Invalid JSON: ${String(err)}`;
    }
  }
);

const base64EncodeTool = defineTool(
  "Encode a plain text string to Base64",
  z.object({
    text: z.string().describe("The text to encode in Base64"),
  }),
  ({ text }) => {
    return Buffer.from(text, "utf-8").toString("base64");
  }
);

const base64DecodeTool = defineTool(
  "Decode a Base64 string back to plain text",
  z.object({
    encoded: z.string().describe("The Base64-encoded string to decode"),
  }),
  ({ encoded }) => {
    try {
      return Buffer.from(encoded, "base64").toString("utf-8");
    } catch {
      return "Error: invalid Base64 string";
    }
  }
);

const urlInfoTool = defineTool(
  "Parse a URL and extract its components: protocol, host, pathname, search params, and hash",
  z.object({
    url: z.string().describe("The full URL to parse"),
  }),
  ({ url }) => {
    try {
      const parsed = new URL(url);
      const params: Record<string, string> = {};
      parsed.searchParams.forEach((value, key) => {
        params[key] = value;
      });
      return JSON.stringify(
        {
          protocol: parsed.protocol,
          host: parsed.host,
          hostname: parsed.hostname,
          port: parsed.port || "(default)",
          pathname: parsed.pathname,
          searchParams: params,
          hash: parsed.hash || "(none)",
          origin: parsed.origin,
        },
        null,
        2
      );
    } catch {
      return `Error: could not parse URL. Make sure it includes the protocol (e.g. https://)`;
    }
  }
);

const textSummarizeHintTool = defineTool(
  "Return a structured summarization prompt that instructs the agent to summarize given text inline",
  z.object({
    text: z.string().describe("The text to be summarized"),
    maxWords: z
      .number()
      .optional()
      .describe("Target word count for the summary (default 100)"),
    style: z
      .enum(["bullet", "paragraph", "headline"])
      .optional()
      .describe("Output format: bullet points, paragraph, or headline"),
  }),
  ({ text, maxWords = 100, style = "paragraph" }) => {
    return `SUMMARIZE the following text in ${style} format using at most ${maxWords} words. Focus on the main ideas and preserve key facts.\n\nTEXT TO SUMMARIZE:\n${text}`;
  }
);

const codeLintHintTool = defineTool(
  "Return a structured code review prompt to guide the agent in analyzing code for issues and improvements",
  z.object({
    code: z.string().describe("The code snippet to review"),
    language: z
      .string()
      .optional()
      .describe("Programming language (e.g. TypeScript, Python)"),
    focus: z
      .array(
        z.enum([
          "security",
          "performance",
          "readability",
          "correctness",
          "style",
        ])
      )
      .optional()
      .describe("Areas to focus the review on"),
  }),
  ({ code, language = "unknown", focus = ["correctness", "security", "readability"] }) => {
    const focusAreas = focus.join(", ");
    return `REVIEW the following ${language} code. Focus on: ${focusAreas}.\n\nFor each issue found, provide:\n1. Severity: [critical | warning | suggestion]\n2. Line or area affected\n3. Description of the problem\n4. Recommended fix\n\nCODE:\n\`\`\`${language}\n${code}\n\`\`\``;
  }
);

const generateIdTool = defineTool(
  "Generate a unique identifier — either a UUID v4 or a short alphanumeric nanoid-style ID",
  z.object({
    style: z
      .enum(["uuid", "short"])
      .optional()
      .describe(
        'ID format: "uuid" for UUID v4, "short" for a 12-char alphanumeric ID'
      ),
    prefix: z
      .string()
      .optional()
      .describe("Optional prefix string (e.g. 'task_', 'usr_')"),
  }),
  ({ style = "uuid", prefix = "" }) => {
    if (style === "uuid") {
      return `${prefix}${crypto.randomUUID()}`;
    }
    // nanoid-style: 12 alphanumeric chars
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const id = Array.from(crypto.getRandomValues(new Uint8Array(12)))
      .map((b) => chars[b % chars.length])
      .join("");
    return `${prefix}${id}`;
  }
);

// ─── Agent Definitions ────────────────────────────────────────────────────────

const researchAgent = new Agent({
  name: "research-agent",
  instructions: `You are an expert research analyst with deep knowledge across science, technology, history, and current events.
When given a research topic or question, you break it down systematically, gather relevant facts, perform any necessary calculations, and synthesize a comprehensive, well-structured answer.
You always cite your reasoning clearly, check the current date when time-sensitivity matters, and analyze URLs when the user provides links for context.
Your responses are thorough yet accessible, avoiding jargon unless the topic demands it.`,
  tools: {
    calculator: calculatorTool,
    current_time: currentTimeTool,
    url_info: urlInfoTool,
    word_count: wordCountTool,
  },
});

const codeReviewerAgent = new Agent({
  name: "code-reviewer",
  instructions: `You are a senior software engineer with 15+ years of experience in production systems, specializing in code quality, security, and architecture.
When reviewing code, you analyze it for correctness, security vulnerabilities (XSS, injection, race conditions), performance issues, and adherence to best practices.
You provide specific, actionable feedback with code examples when helpful, and you generate tracking IDs for issues so they can be referenced in follow-up discussions.
Your tone is constructive and educational — you explain why something is a problem, not just that it is one.`,
  tools: {
    calculator: calculatorTool,
    json_parse: jsonParseTool,
    code_lint_hint: codeLintHintTool,
    generate_id: generateIdTool,
  },
});

const dataPipelineAgent = new Agent({
  name: "data-pipeline",
  instructions: `You are a data engineer specializing in ETL pipeline design, data transformation, and distributed systems.
You help design and troubleshoot data workflows, parse and validate JSON payloads, encode/decode data for transit, and analyze API endpoints involved in pipelines.
You think in terms of data lineage, schema validation, throughput optimization, and fault tolerance — always considering what happens when upstream data is malformed or a step fails.
Your recommendations include specific implementation details and error-handling strategies.`,
  tools: {
    calculator: calculatorTool,
    json_parse: jsonParseTool,
    base64_encode: base64EncodeTool,
    base64_decode: base64DecodeTool,
    url_info: urlInfoTool,
  },
});

const customerSupportAgent = new Agent({
  name: "customer-support",
  instructions: `You are a tier-1 customer support specialist trained to handle a wide range of product inquiries, billing questions, and technical troubleshooting with empathy and efficiency.
You follow a structured approach: acknowledge the customer's issue, gather necessary context (account details, error messages), diagnose the problem, and provide clear step-by-step resolution guidance.
You always log the current timestamp for support ticket purposes, assess message length to ensure concise responses, and parse structured data like JSON configs that customers may share.
You escalate to tier-2 when an issue requires system access or falls outside your resolution authority, always summarizing the issue clearly for the next agent.`,
  tools: {
    current_time: currentTimeTool,
    word_count: wordCountTool,
    json_parse: jsonParseTool,
  },
});

const contentWriterAgent = new Agent({
  name: "content-writer",
  instructions: `You are a content marketing expert with expertise in SEO, brand voice, and audience engagement across blogs, social media, email campaigns, and technical documentation.
You craft compelling narratives backed by data, always tailoring tone and format to the target audience and platform.
You use word count analysis to hit optimal length targets for each content type, reference current dates for timely content, and condense source material into tight, punchy summaries before expanding them into full pieces.
Your output is polished, ready-to-publish, and consistently aligned with the stated brand voice and campaign goals.`,
  tools: {
    current_time: currentTimeTool,
    word_count: wordCountTool,
    text_summarize_hint: textSummarizeHintTool,
  },
});

const securityScannerAgent = new Agent({
  name: "security-scanner",
  instructions: `You are a security engineer specializing in application security, vulnerability assessment, and threat modeling.
You analyze code, configurations, and API endpoints for OWASP Top 10 vulnerabilities, authentication flaws, insecure data handling, and supply chain risks.
For each finding, you assign a severity level (critical/high/medium/low), generate a unique tracking ID, and provide remediation guidance with code examples.
You approach security holistically — analyzing not just the code but also the data it handles, the endpoints it calls, and the permissions it requires.`,
  tools: {
    json_parse: jsonParseTool,
    url_info: urlInfoTool,
    generate_id: generateIdTool,
    code_lint_hint: codeLintHintTool,
  },
});

// ─── Registry ─────────────────────────────────────────────────────────────────

const agentRegistry: Record<string, Agent> = {
  "research-agent": researchAgent,
  "code-reviewer": codeReviewerAgent,
  "data-pipeline": dataPipelineAgent,
  "customer-support": customerSupportAgent,
  "content-writer": contentWriterAgent,
  "security-scanner": securityScannerAgent,
};

export function getAgentById(id: string): Agent | null {
  return agentRegistry[id] ?? null;
}

export { agentRegistry };
