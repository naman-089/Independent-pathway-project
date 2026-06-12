export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  let text = "";
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    text = (body?.text || "").trim().slice(0, 1000);
  } catch {
    return res.json({ flagged: false });
  }

  if (!text) return res.json({ flagged: false });

  // If no API key is configured, fail open (allow the message)
  if (!process.env.ANTHROPIC_API_KEY) return res.json({ flagged: false });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type":    "application/json",
        "x-api-key":       process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model:      "claude-haiku-4-5-20251001",
        max_tokens: 5,
        system: `You are a content moderator for a disability services platform used by families,
caregivers, and caseworkers supporting adults with developmental disabilities.
Reply with exactly one word — SAFE or BLOCKED.
Block messages that contain: hate speech, slurs, sexual content, threats, harassment,
severe profanity, or anything that would make a vulnerable person feel unsafe.
Allow: disagreements, frustration expressed respectfully, questions, personal struggles.`,
        messages: [{
          role:    "user",
          content: `Message to review: "${text}"`,
        }],
      }),
    });

    const data = await response.json();
    const verdict = (data.content?.[0]?.text || "SAFE").trim().toUpperCase();
    return res.json({ flagged: verdict === "BLOCKED" });
  } catch {
    // Fail open — don't block messages if moderation is unavailable
    return res.json({ flagged: false });
  }
}
