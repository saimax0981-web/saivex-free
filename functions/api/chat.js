export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const message = (body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];

    if (!message) {
      return json({ reply: "Please type a message first." });
    }

    if (!env.OPENROUTER_API_KEY) {
      return json({ reply: "OpenRouter API key is missing. Add OPENROUTER_API_KEY in Cloudflare Pages environment variables." });
    }

    const messages = [
      {
        role: "system",
        content: "You are SAIVEX, a smart, friendly AI assistant created by Sai Venkat. Use a clear helpful style. Support coding, planning, Kalinga UI ideas, study help, and project guidance."
      }
    ];

    for (const item of history.slice(-10)) {
      if (!item || !item.message) continue;
      messages.push({
        role: item.sender === "bot" ? "assistant" : "user",
        content: String(item.message).slice(0, 4000)
      });
    }

    if (messages[messages.length - 1]?.content !== message) {
      messages.push({ role: "user", content: message });
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": env.SAIVEX_PUBLIC_URL || "https://saivex.pages.dev",
        "X-Title": "SAIVEX"
      },
      body: JSON.stringify({
        model: env.SAIVEX_DEFAULT_MODEL || "openai/gpt-4o-mini",
        messages,
        max_tokens: Number(env.SAIVEX_MAX_TOKENS || 1200)
      })
    });

    const result = await response.json();

    if (!response.ok || !result.choices) {
      return json({ reply: "Sorry, SAIVEX could not connect to OpenRouter. Check your API key and model name." }, 200);
    }

    const reply = result.choices?.[0]?.message?.content || "No reply received.";
    return json({ reply, conversation_id: body.conversation_id || Date.now() });
  } catch (error) {
    return json({ reply: "Something went wrong in SAIVEX serverless function." }, 200);
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
