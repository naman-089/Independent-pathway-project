export async function checkMessage(text) {
  try {
    const res = await fetch("/api/moderate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    return data.flagged === true;
  } catch {
    return false; // fail open
  }
}
