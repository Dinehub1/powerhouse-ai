"use client";

import { useState, useRef, useEffect } from "react";

interface ToolCall {
  name: string;
  input: Record<string, unknown>;
  output: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ToolCall[];
  streaming?: boolean;
}

const conversationId = crypto.randomUUID();

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hey! I'm your OpenClaw-powered assistant running on **Kimi K2.5** via NVIDIA. I can chat, do math, tell you the time, and more. What would you like to explore?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const prompt = input.trim();
    if (!prompt || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: prompt };
    const assistantId = crypto.randomUUID();
    const assistantMsg: Message = { id: assistantId, role: "assistant", content: "", streaming: true };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, conversationId }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: `Error: ${err.error}`, streaming: false }
              : m
          )
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      const pendingTools: ToolCall[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const chunk = JSON.parse(line.slice(6));

            if (chunk.type === "text") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: m.content + chunk.text }
                    : m
                )
              );
            } else if (chunk.type === "tool_start") {
              pendingTools.push({ name: chunk.toolCall?.name ?? "", input: {}, output: "" });
            } else if (chunk.type === "done") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, streaming: false, toolCalls: pendingTools.length ? [...pendingTools] : undefined }
                    : m
                )
              );
            } else if (chunk.type === "error") {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? { ...m, content: `Error: ${chunk.text}`, streaming: false }
                    : m
                )
              );
            }
          } catch {
            // malformed chunk, skip
          }
        }
      }
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#09090b" }}>
      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0.875rem 1.5rem",
          borderBottom: "1px solid #27272a",
          background: "#09090b",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <a href="/" style={{ color: "#f97316", textDecoration: "none", fontWeight: 800, fontSize: "1.1rem" }}>
            ⚡ Powerhouse-AI
          </a>
          <span style={{ color: "#3f3f46", fontSize: "0.875rem" }}>/</span>
          <span style={{ color: "#a1a1aa", fontSize: "0.875rem" }}>Chat</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div
            style={{
              background: "#18181b",
              border: "1px solid #27272a",
              borderRadius: 999,
              padding: "0.25rem 0.75rem",
              fontSize: "0.75rem",
              color: "#71717a",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <span style={{ color: "#22c55e", fontSize: "0.5rem" }}>●</span>
            OpenClaw · Kimi K2.5 · NVIDIA
          </div>
        </div>
      </header>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1.5rem",
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          maxWidth: 760,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {messages.map((msg) => (
          <ChatMessage key={msg.id} message={msg} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div
        style={{
          borderTop: "1px solid #27272a",
          padding: "1rem 1.5rem",
          background: "#09090b",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            maxWidth: 760,
            margin: "0 auto",
            display: "flex",
            gap: "0.75rem",
            alignItems: "flex-end",
          }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask anything… (Enter to send, Shift+Enter for newline)"
            rows={1}
            style={{
              flex: 1,
              background: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: 10,
              color: "#fafafa",
              fontSize: "0.9rem",
              padding: "0.75rem 1rem",
              resize: "none",
              outline: "none",
              fontFamily: "inherit",
              lineHeight: 1.5,
              maxHeight: 160,
              overflowY: "auto",
              transition: "border-color 0.15s",
            }}
            onFocus={(e) => (e.target.style.borderColor = "#f97316")}
            onBlur={(e) => (e.target.style.borderColor = "#3f3f46")}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            style={{
              background: loading || !input.trim() ? "#27272a" : "#f97316",
              color: loading || !input.trim() ? "#52525b" : "#000",
              border: "none",
              borderRadius: 10,
              padding: "0.75rem 1.25rem",
              fontWeight: 700,
              fontSize: "0.875rem",
              cursor: loading || !input.trim() ? "not-allowed" : "pointer",
              flexShrink: 0,
              transition: "background 0.15s",
            }}
          >
            {loading ? "…" : "Send"}
          </button>
        </div>
        <p style={{ textAlign: "center", color: "#3f3f46", fontSize: "0.7rem", marginTop: "0.5rem", marginBottom: 0 }}>
          Powered by OpenClaw · moonshotai/kimi-k2.5 · NVIDIA API
        </p>
      </div>
    </div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        gap: "0.375rem",
      }}
    >
      {/* Role label */}
      <span style={{ fontSize: "0.7rem", color: "#52525b", paddingLeft: isUser ? 0 : "0.25rem" }}>
        {isUser ? "You" : "⚡ OpenClaw"}
      </span>

      {/* Bubble */}
      <div
        style={{
          background: isUser ? "#f97316" : "#18181b",
          border: isUser ? "none" : "1px solid #27272a",
          borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
          padding: "0.75rem 1rem",
          maxWidth: "85%",
          color: isUser ? "#000" : "#e4e4e7",
          fontSize: "0.9rem",
          lineHeight: 1.6,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {message.content || (message.streaming ? <BlinkCursor /> : "")}
      </div>

      {/* Tool calls */}
      {message.toolCalls && message.toolCalls.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem", maxWidth: "85%" }}>
          {message.toolCalls.map((tc, i) => (
            <div
              key={i}
              style={{
                background: "#0c1a0c",
                border: "1px solid #14532d",
                borderRadius: 8,
                padding: "0.5rem 0.75rem",
                fontSize: "0.75rem",
                color: "#86efac",
              }}
            >
              <span style={{ color: "#4ade80", fontWeight: 600 }}>⚙ {tc.name}</span>
              {tc.output && <span style={{ color: "#71717a", marginLeft: "0.5rem" }}>→ {tc.output}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BlinkCursor() {
  return (
    <span
      style={{
        display: "inline-block",
        width: 2,
        height: "1em",
        background: "#f97316",
        marginLeft: 2,
        verticalAlign: "text-bottom",
        animation: "blink 1s step-end infinite",
      }}
    />
  );
}
