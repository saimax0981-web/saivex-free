function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function safeName(text, ext) {
  const base = String(text || "saivex-file").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) || "saivex-file";
  return `${base}.${ext}`;
}

function detectIntent(message) {
  const m = String(message || "").toLowerCase();
  if (m.includes("create ppt") || m.includes("make ppt") || m.includes("presentation") || m.startsWith("ppt")) return "ppt";
  if (m.includes("create pdf") || m.includes("make pdf") || m.startsWith("pdf")) return "pdf";
  if (m.includes("create website") || m.includes("make website") || m.includes("generate website") || m.startsWith("website")) return "website";
  if (m.includes("generate image") || m.includes("create image") || m.includes("make image") || m.startsWith("image")) return "image";
  if (m.startsWith("run code") || m.includes("write code") || m.includes("generate code") || m.startsWith("code")) return "code";
  if (m.startsWith("search:")) return "search";
  if (m.startsWith("agent:")) return "agent";
  return "chat";
}

function systemPrompt(intent) {
  const base = "You are SAIVEX, a smart, friendly AI assistant created by Sai Venkat. Keep answers useful, powerful, and clear. You are part of SAIVEX Free running on Cloudflare Pages.";
  const tool = {
    ppt: "Create a strong presentation outline with slide titles and bullet points. Include 8-10 slides. Use markdown headings.",
    pdf: "Create a clean report/document with title, sections, bullet points, and conclusion. This will be converted into a print-ready document.",
    website: "Create a complete single-file HTML website. Include CSS and JS inside the same HTML file. Return only the full HTML code when possible.",
    code: "Write clean code. Explain briefly how to use it. Do not claim to actually execute unsafe code.",
    image: "Create a rich image generation prompt. Also describe the image clearly. The frontend will show a generated preview using a free image endpoint.",
    search: "Answer like a research assistant, but be honest that live web search is limited in SAIVEX Free unless a web-search API is connected.",
    agent: "Act like an AI project agent. Give steps, priorities, risks, and next actions."
  }[intent] || "Chat normally.";
  return base + "\n" + tool;
}

function htmlEscape(s) {
  return String(s || "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function markdownToSimpleHtml(md, title="SAIVEX Document") {
  let body = htmlEscape(md)
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/\n/g, '<br>');
  body = body.replace(/(<li>.*?<\/li>)(<br>)?/gs, '<ul>$1</ul>');
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${htmlEscape(title)}</title><style>body{font-family:Arial,sans-serif;max-width:900px;margin:40px auto;padding:30px;line-height:1.65;color:#211;background:#fff}h1{color:#9a5200;border-bottom:3px solid #ffbf3c;padding-bottom:10px}h2{color:#b66a00;margin-top:28px}li{margin:8px 0}.brand{color:#805000;font-weight:900;letter-spacing:2px}.print{position:fixed;right:18px;top:18px;padding:12px 16px;border:0;border-radius:10px;background:#ffbf3c;font-weight:bold;cursor:pointer}@media print{.print{display:none}body{margin:0;max-width:none}}</style></head><body><button class="print" onclick="print()">Print / Save as PDF</button><div class="brand">SAIVEX</div>${body}</body></html>`;
}

function slidesHtml(md, title="SAIVEX Presentation") {
  const parts = String(md || "").split(/(?=^#{1,2}\s+)/m).filter(Boolean).slice(0, 12);
  const slides = (parts.length ? parts : [md]).map((p, i) => `<section class="slide"><div class="num">${i+1}</div><div>${markdownToSlideInner(p)}</div></section>`).join("\n");
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${htmlEscape(title)}</title><style>body{margin:0;background:#080300;color:#fff7d6;font-family:Arial,sans-serif}.deck{display:flex;flex-direction:column;gap:28px;padding:32px}.slide{min-height:540px;border:1px solid rgba(255,191,60,.4);border-radius:28px;padding:54px;background:radial-gradient(circle at top right,rgba(255,191,60,.22),transparent 360px),linear-gradient(135deg,#180801,#050200);box-shadow:0 20px 70px rgba(0,0,0,.45);position:relative;page-break-after:always}.num{position:absolute;right:28px;top:20px;color:#ffbf3c;font-weight:900}h1,h2{font-size:46px;color:#ffe7a3;text-shadow:0 0 20px #ff6a00}li{font-size:25px;margin:16px 0;line-height:1.35}.top{position:sticky;top:0;background:#000;padding:12px;z-index:2}.top button{padding:10px 16px;border:0;border-radius:10px;background:#ffbf3c;font-weight:bold}@media print{.top{display:none}.slide{border-radius:0;min-height:90vh}}</style></head><body><div class="top"><button onclick="print()">Print / Save as PDF</button></div><main class="deck">${slides}</main></body></html>`;
}

function markdownToSlideInner(md){
  return htmlEscape(md).replace(/^### (.*)$/gm,'<h2>$1</h2>').replace(/^## (.*)$/gm,'<h1>$1</h1>').replace(/^# (.*)$/gm,'<h1>$1</h1>').replace(/^- (.*)$/gm,'<li>$1</li>').replace(/\n/g,'<br>').replace(/(<li>.*?<\/li>)(<br>)?/gs,'<ul>$1</ul>');
}

function imageUrlFromPrompt(prompt, ratio="1:1") {
  const dims = {"1:1":"1024/1024","16:9":"1280/720","9:16":"720/1280","4:5":"960/1200"}[ratio] || "1024/1024";
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${dims.split('/')[0]}&height=${dims.split('/')[1]}&nologo=true&enhance=true`;
}

async function askOpenRouter(env, messages, maxTokens=1400) {
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
      max_tokens: Number(env.SAIVEX_MAX_TOKENS || maxTokens)
    })
  });
  const result = await response.json();
  if (!response.ok || !result.choices) throw new Error(JSON.stringify(result).slice(0, 400));
  return result.choices?.[0]?.message?.content || "No reply received.";
}

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const message = (body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];
    const ratio = body.ratio || "1:1";
    if (!message) return json({ reply: "Please type a message first." });
    if (!env.OPENROUTER_API_KEY) return json({ reply: "OpenRouter API key is missing. Add OPENROUTER_API_KEY in Cloudflare Pages → Settings → Environment variables." });

    const intent = detectIntent(message);
    const messages = [{ role: "system", content: systemPrompt(intent) }];
    for (const item of history.slice(-8)) {
      if (!item || !item.message) continue;
      messages.push({ role: item.sender === "bot" ? "assistant" : "user", content: String(item.message).slice(0, 2500) });
    }
    messages.push({ role: "user", content: message });
    const reply = await askOpenRouter(env, messages, intent === "website" ? 3000 : 1600);

    let extra = { intent };
    const topic = message.replace(/^(create|make|generate|run)?\s*(ppt|pdf|presentation|website|image|code)\s*(about|for|:)?/i, "").trim() || "SAIVEX";

    if (intent === "image") {
      const style = body.style || "cinematic";
      const prompt = `${reply}\nStyle: ${style}, premium, detailed, high quality, SAIVEX Kalinga UI energy`;
      extra.image = imageUrlFromPrompt(prompt, ratio);
    }

    if (intent === "pdf") {
      const html = markdownToSimpleHtml(reply, topic);
      extra.file_name = safeName(topic || "saivex-document", "html");
      extra.file_mime = "text/html";
      extra.file_content = html;
      extra.preview_content = html;
      extra.reply = reply + "\n\nI created a print-ready document. Open it, then use Print → Save as PDF.";
    }

    if (intent === "ppt") {
      const html = slidesHtml(reply, topic);
      extra.file_name = safeName(topic || "saivex-presentation", "html");
      extra.file_mime = "text/html";
      extra.file_content = html;
      extra.preview_content = html;
      extra.reply = reply + "\n\nI created a slide-deck style HTML presentation. Open it, then present or print/save as PDF.";
    }

    if (intent === "website") {
      let html = reply;
      const match = reply.match(/```html([\s\S]*?)```/i) || reply.match(/```([\s\S]*?)```/);
      if (match) html = match[1].trim();
      if (!/<!doctype html|<html/i.test(html)) html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>SAIVEX Website</title></head><body><pre>${htmlEscape(reply)}</pre></body></html>`;
      extra.file_name = safeName(topic || "saivex-website", "html");
      extra.file_mime = "text/html";
      extra.file_content = html;
      extra.preview_content = html;
      extra.reply = "Website generated. Use Preview to view it or Download File to save it.";
    }

    if (intent === "code") {
      extra.file_name = safeName(topic || "saivex-code", "txt");
      extra.file_mime = "text/plain";
      extra.file_content = reply;
    }

    return json({ reply: extra.reply || reply, conversation_id: body.conversation_id || Date.now(), ...extra });
  } catch (error) {
    return json({ reply: "Something went wrong in SAIVEX serverless function: " + String(error.message || error).slice(0, 220) }, 200);
  }
}
