function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } }); }
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const imageData = body.imageData;
    const question = body.question || "Analyze this image clearly.";
    if (!imageData) return json({ reply: "No image received." });
    if (!env.OPENROUTER_API_KEY) return json({ reply: "OpenRouter API key is missing." });
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${env.OPENROUTER_API_KEY}`, "Content-Type": "application/json", "HTTP-Referer": env.SAIVEX_PUBLIC_URL || "https://saivex.pages.dev", "X-Title": "SAIVEX Vision" },
      body: JSON.stringify({
        model: env.SAIVEX_VISION_MODEL || "openai/gpt-4o-mini",
        messages: [{ role: "user", content: [{ type: "text", text: question }, { type: "image_url", image_url: { url: imageData } }] }],
        max_tokens: 900
      })
    });
    const result = await response.json();
    if (!response.ok || !result.choices) return json({ reply: "Vision model could not analyze the image. Check OpenRouter model access." });
    return json({ reply: result.choices[0].message.content || "No vision reply.", image: imageData });
  } catch (e) { return json({ reply: "Vision error: " + String(e.message || e).slice(0, 160) }); }
}
