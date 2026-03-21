import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpenClaw — Powerhouse-AI",
  description: "Open-source TypeScript agent framework powered by OpenClaw",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          background: "#09090b",
          color: "#fafafa",
          fontFamily: "'Segoe UI', system-ui, sans-serif",
          minHeight: "100vh",
        }}
      >
        {children}
      </body>
    </html>
  );
}
