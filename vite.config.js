import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Vite plugin that handles /api/chat locally so `npm run dev` works without
// Vercel CLI. In production, Vercel routes /api/* to the real serverless function.
function localApiPlugin() {
  return {
    name: "local-api",
    configureServer(server) {
      server.middlewares.use("/api/moderate", async (req, res) => {
        if (req.method !== "POST") {
          res.writeHead(405).end(); return;
        }
        let body = "";
        req.on("data", (chunk) => { body += chunk; });
        req.on("end", async () => {
          try {
            const mod = await import("./api/moderate.js");
            await mod.default(
              { method: "POST", body },
              {
                status: (code) => ({ json: (d) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(d)); } }),
                json: (d) => { res.writeHead(200, { "content-type": "application/json" }); res.end(JSON.stringify(d)); },
              }
            );
          } catch {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(JSON.stringify({ flagged: false }));
          }
        });
      });

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
            const SYSTEM = `You are the IPP Assistant built into the Independence Pathway Platform (IPP) by Reena and York University C4 Design Lab. The platform has: Home (age-gate routing to teen 14-17, adult 18+, or registered-with-DSO paths), Intake (5-step assessment), Timeline (milestone tracking), Portfolio (readiness profile), Resources (matched day programs with pricing), Community (family chat), and Profile. Ontario knowledge: DSO registration starts at 16 (1-855-464-0902), Passport funding $5,000-$35,000/year for adults 18+ (pays for day programs, employment, respite, transportation), ODSP income support, Henson Trust protects ODSP, SDM as alternative to guardianship. Day programs in directory: Reena $85/day, Meta Centre $92/day, Community Living Toronto $78/day, Kerry's Place $95/day, Corbrook $65/day, L'Arche Toronto $75/day, DramaWay $55/day, Karis $88/day, E3 Community $68/day, LiveWorkPlay $70/day, Extend-A-Family $60/day, Sunbeam $72/day. ONLY answer questions about the IPP platform, DSO, Passport, day programs, ODSP, transition planning, or Ontario developmental services. For anything else say: "I can only help with questions about the IPP platform and Ontario developmental services."`;
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
            if (!upstream.ok) {
              console.error("[/api/chat] Anthropic error", upstream.status, JSON.stringify(data));
              res.writeHead(upstream.status, { "content-type": "application/json" });
              res.end(JSON.stringify({ error: data.error?.message || "Upstream error" }));
              return;
            }
            res.writeHead(200, { "content-type": "application/json" });
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

export default defineConfig(({ mode }) => {
  // loadEnv with empty prefix loads ALL .env vars (not just VITE_-prefixed ones).
  // We then inject the server-only vars into process.env so the local API middleware can read them.
  const env = loadEnv(mode, process.cwd(), "");
  process.env.ANTHROPIC_API_KEY    ??= env.ANTHROPIC_API_KEY;
  process.env.AI_CHATBOT_ENABLED   ??= env.AI_CHATBOT_ENABLED;
  process.env.FIREBASE_API_KEY     ??= env.FIREBASE_API_KEY;

  return {
    plugins: [react(), localApiPlugin()],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react:     ["react", "react-dom", "react-router-dom"],
            "fb-app":  ["firebase/app"],
            "fb-auth": ["firebase/auth"],
            "fb-db":   ["firebase/firestore"],
            icons:     ["@tabler/icons-react"],
          },
        },
      },
    },
  };
});
