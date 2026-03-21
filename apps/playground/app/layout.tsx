import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "OpenClaw — Powerhouse-AI",
  description: "Open-source TypeScript agent framework powered by OpenClaw",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          * { box-sizing: border-box; }
          body { margin: 0; background: #09090b; color: #fafafa; font-family: 'Segoe UI', system-ui, sans-serif; }
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 3px; }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
