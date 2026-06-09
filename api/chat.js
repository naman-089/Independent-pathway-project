const SYSTEM = `You are a helpful guide for families navigating Ontario's developmental services system. You ONLY answer questions about:
- Developmental Services Ontario (DSO): registration, intake process, waitlists, eligibility
- Passport funding program: amounts ($5,000–$35,000/year), eligibility, approved uses
- Day programs in Ontario for adults with developmental disabilities
- ODSP (Ontario Disability Support Program)
- Transition planning for youth aged 14–21 in Ontario
- Supported Decision Making (SDM) and legal/financial planning (Henson Trust)
- The IPP (Independence Pathway Platform) — how to use it, what it does

If a user asks about ANYTHING else (weather, recipes, sports, news, coding, general knowledge, etc.), respond with: "I can only help with questions about developmental services in Ontario, DSO, Passport funding, and related topics. Is there something about that I can help you with?"

Keep responses concise (2–4 sentences), warm, and practical. When unsure, recommend contacting the local DSO office at 1-855-464-0902 or visiting ontario.ca/developmentalservices.`;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (process.env.AI_CHATBOT_ENABLED !== "true") {
    return res.status(503).json({ error: "Chatbot is disabled" });
  }

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Invalid request body" });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
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
        messages: messages.slice(-10).map((m) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: String(m.content).slice(0, 2000),
        })),
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return res.status(response.status).json({ error: err.error?.message || "Upstream error" });
    }

    const data = await response.json();
    return res.json({ text: data.content?.[0]?.text || "" });
  } catch (err) {
    console.error("[/api/chat]", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
