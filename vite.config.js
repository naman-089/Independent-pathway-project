import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Vite plugin that handles /api/chat locally so `npm run dev` works without
// Vercel CLI. In production, Vercel routes /api/* to the real serverless function.
function localApiPlugin() {
  return {
    name: "local-api",
    configureServer(server) {
      server.middlewares.use("/api/chat", async (req, res) => {
        if (req.method !== "POST") {
          res.writeHead(405).end(JSON.stringify({ error: "Method not allowed" }));
          return;
        }
        if (process.env.AI_CHATBOT_ENABLED !== "true") {
          res.writeHead(503, { "content-type": "application/json" });
          res.end(JSON.stringify({ error: "Chatbot is disabled" }));
          return;
        }
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", async () => {
          try {
            const { messages } = JSON.parse(body);
            const SYSTEM = `You are a helpful guide for families navigating Ontario's developmental services system. You ONLY answer questions about DSO, Passport funding, day programs, ODSP, transition planning for youth in Ontario, Supported Decision Making, Henson Trust, and the IPP platform. If a user asks about anything else, politely decline and redirect them to ask about developmental services.`;
            const upstream = await fetch("https://api.anthropic.com/v1/messages", {
              method: "POST",
              headers: {
                "content-type": "application/json",
                "x-api-key": process.env.ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
              },
              body: JSON.stringify({
                model: "claude-haiku-4-5",
                max_tokens: 512,
                system: SYSTEM,
                messages: (messages || []).slice(-10).map((m) => ({
                  role: m.role === "user" ? "user" : "assistant",
                  content: String(m.content).slice(0, 2000),
                })),
              }),
            });
            const data = await upstream.json();
            res.writeHead(upstream.status, { "content-type": "application/json" });
            res.end(JSON.stringify({ text: data.content?.[0]?.text || "" }));
          } catch (err) {
            res.writeHead(500, { "content-type": "application/json" });
            res.end(JSON.stringify({ error: "Internal server error" }));
          }
        });
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  build: {
    rollupOptions: {
      output: {
        // Split large, slow-changing vendor libs into their own chunks so
        // browsers can cache and parallel-fetch them independently of app code.
        manualChunks: {
          react: ["react", "react-dom", "react-router-dom"],
          firebase: ["firebase/app", "firebase/auth", "firebase/firestore"],
        },
      },
    },
  },
});
