"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", icon: "📊", label: "Dashboard" },
  { href: "/agents", icon: "🤖", label: "Agents" },
  { href: "/tasks", icon: "📋", label: "Tasks" },
  { href: "/activity", icon: "📡", label: "Activity" },
  { href: "/chat", icon: "💬", label: "Chat" },
  { href: "/settings", icon: "⚙️", label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: 240,
        height: "100vh",
        background: "#111113",
        borderRight: "1px solid #27272a",
        display: "flex",
        flexDirection: "column",
        zIndex: 50,
      }}
    >
      {/* Brand */}
      <div style={{ padding: "1.25rem 1.25rem 0.5rem" }}>
        <Link
          href="/dashboard"
          style={{
            textDecoration: "none",
            color: "#f97316",
            fontWeight: 800,
            fontSize: "1.15rem",
            display: "block",
          }}
        >
          ⚡ Powerhouse-AI
        </Link>
        <div
          style={{
            fontSize: "0.7rem",
            color: "#52525b",
            marginTop: "0.25rem",
            letterSpacing: "0.05em",
          }}
        >
          Mission Control
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "1rem 0.75rem", display: "flex", flexDirection: "column", gap: "0.25rem" }}>
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                padding: "0.6rem 0.75rem",
                borderRadius: 8,
                textDecoration: "none",
                fontSize: "0.875rem",
                fontWeight: active ? 600 : 400,
                color: active ? "#fafafa" : "#71717a",
                background: active ? "#27272a" : "transparent",
                borderLeft: active ? "3px solid #f97316" : "3px solid transparent",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: "1rem" }}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer / User */}
      <div
        style={{
          padding: "1rem 1.25rem",
          borderTop: "1px solid #27272a",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: "50%",
            background: "#27272a",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.8rem",
            color: "#a1a1aa",
          }}
        >
          A
        </div>
        <div>
          <div style={{ fontSize: "0.8rem", color: "#fafafa", fontWeight: 500 }}>Admin</div>
          <div style={{ fontSize: "0.65rem", color: "#52525b", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <span style={{ color: "#22c55e", fontSize: "0.5rem" }}>●</span> Online
          </div>
        </div>
      </div>
    </aside>
  );
}
