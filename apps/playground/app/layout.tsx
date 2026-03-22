import type { Metadata } from "next";
import Sidebar from "./components/Sidebar";

export const metadata: Metadata = {
  title: "Powerhouse-AI · Mission Control",
  description: "Open-source AI agent platform — build, deploy, and monitor autonomous agents",
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
      <body>
        <Sidebar />
        <main style={{ marginLeft: 240, minHeight: "100vh" }}>{children}</main>
      </body>
    </html>
  );
}
