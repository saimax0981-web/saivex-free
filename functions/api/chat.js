function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

function detectIntent(message) {
  const m = String(message || "").toLowerCase();
  if (/\b(search|latest|news|internet|web)\b/.test(m)) return "search";
  if (/\b(ppt|presentation|slides|slide deck)\b/.test(m)) return "ppt";
  if (/\b(pdf|document|report)\b/.test(m)) return "pdf";
  if (/\b(website|web page|landing page|html site)\b/.test(m)) return "website";
  if (/\b(generate image|create image|make image|draw|poster|wallpaper|logo)\b/.test(m)) return "image";
  if (/\b(code|program|script|app|run code)\b/.test(m)) return "code";
  if (/\b(agent|plan|roadmap|tasks)\b/.test(m)) return "agent";
  return "chat";
}

function cleanTopic(message, intent) {
  return String(message || "")
    .replace(/^(create|make|generate|build|prepare|write)?\s*/i, "")
    .replace(new RegExp(`\\b(${intent}|ppt|pdf|presentation|slides|website|web page|image|poster|wallpaper|code|search)\\b`, "ig"), "")
    .replace(/\b(about|on|for|regarding|of|with internet sources|from internet|using sources)\b/ig, "")
    .replace(/[:\-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim() || "SAIVEX";
}

function safeName(name, ext) {
  const base = String(name || "saivex-file").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 48) || "saivex-file";
  return `${base}.${ext}`;
}

function htmlEscape(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sourceText(sources) {
  if (!sources.length) return "No live source snippets were available from the configured free search providers.";
  return sources.map((s, i) => `[${i + 1}] ${s.title}\n${s.snippet}\n${s.url}`).join("\n\n");
}

async function braveSearch(query, env) {
  if (!env.BRAVE_SEARCH_API_KEY) return [];
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=8&safesearch=moderate`, {
    headers: { "Accept": "application/json", "X-Subscription-Token": env.BRAVE_SEARCH_API_KEY }
  });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.web?.results || []).slice(0, 8).map(r => ({
    title: r.title || "Brave Search result",
    snippet: r.description || "",
    url: r.url || ""
  }));
}

async function duckDuckGoInstant(query) {
  const sources = [];
  try {
    const res = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`);
    const data = await res.json();
    if (data.AbstractText) sources.push({ title: data.Heading || "DuckDuckGo", snippet: data.AbstractText, url: data.AbstractURL || "" });
    for (const t of (data.RelatedTopics || []).slice(0, 6)) {
      if (t.Text) sources.push({ title: "DuckDuckGo related", snippet: t.Text, url: t.FirstURL || "" });
      if (t.Topics) {
        for (const inner of t.Topics.slice(0, 3)) {
          if (inner.Text) sources.push({ title: "DuckDuckGo related", snippet: inner.Text, url: inner.FirstURL || "" });
        }
      }
    }
  } catch (_) {}
  return sources;
}

async function wikipediaSearch(query) {
  const sources = [];
  try {
    const res = await fetch(`https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(query)}&limit=6&namespace=0&format=json&origin=*`);
    const data = await res.json();
    const titles = data[1] || [], snippets = data[2] || [], urls = data[3] || [];
    titles.forEach((title, i) => sources.push({ title, snippet: snippets[i] || "Wikipedia article", url: urls[i] || "" }));
  } catch (_) {}
  return sources;
}

async function gatherSources(query, env) {
  const all = [];
  all.push(...await braveSearch(query, env));
  all.push(...await duckDuckGoInstant(query));
  all.push(...await wikipediaSearch(query));
  const seen = new Set();
  return all.filter(s => {
    const key = (s.url || s.title).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 10);
}

function systemPrompt(intent) {
  const common = `You are SAIVEX, a powerful AI assistant with premium Kalinga UI identity. Be useful, direct, and structured. If sources are provided, use them and include a Sources section with the source numbers. Do not invent citations.`;
  const prompts = {
    search: "Answer using the provided live source snippets. Include a short Sources section.",
    pdf: "Create a polished report/document. Use headings, short paragraphs, bullet points, and a Sources section. The content will be converted into a PDF.",
    ppt: "Create a presentation outline. Use clear slide titles and 4-6 bullet points per slide. Make 8-10 slides when possible. Include a final Sources slide.",
    website: "Create a complete single-file HTML website. Include CSS inside a style tag and JavaScript only if needed. Use modern premium design. Use source data when provided. Return only the HTML code inside one html code block.",
    image: "Create a detailed image-generation prompt and a short explanation. Premium cinematic style is preferred.",
    code: "Write clean usable code with brief setup instructions.",
    agent: "Act like a project agent. Give plan, steps, risks, and next actions.",
    chat: "Chat normally."
  };
  return common + "\n" + (prompts[intent] || prompts.chat);
}

async function askOpenRouter(env, messages, maxTokens = 2000) {
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
  if (!response.ok || !result.choices) throw new Error(JSON.stringify(result).slice(0, 500));
  return result.choices?.[0]?.message?.content || "No reply received.";
}

function extractSlides(markdown, fallbackTitle) {
  const lines = String(markdown || "").split("\n").map(x => x.trim()).filter(Boolean);
  const slides = [];
  let current = null;
  for (const line of lines) {
    const heading = line.match(/^#{1,3}\s+(.+)/) || line.match(/^Slide\s*\d+[:.\-]\s*(.+)/i);
    if (heading) {
      if (current) slides.push(current);
      current = { title: heading[1].replace(/\*\*/g, "").slice(0, 90), bullets: [] };
    } else if (/^[-*•]\s+/.test(line)) {
      if (!current) current = { title: fallbackTitle || "SAIVEX", bullets: [] };
      current.bullets.push(line.replace(/^[-*•]\s+/, "").replace(/\*\*/g, "").slice(0, 220));
    }
  }
  if (current) slides.push(current);
  if (!slides.length) {
    const chunks = String(markdown || "").split(/\n\n+/).slice(0, 8);
    chunks.forEach((chunk, i) => slides.push({ title: i === 0 ? fallbackTitle : `Slide ${i + 1}`, bullets: chunk.split(/[.?!]\s+/).filter(Boolean).slice(0, 5) }));
  }
  return slides.slice(0, 12).map((s, i) => ({ title: s.title || `Slide ${i + 1}`, bullets: (s.bullets || []).slice(0, 6) }));
}

function imageUrlFromPrompt(prompt, ratio = "1:1") {
  const map = { "1:1": [1024, 1024], "16:9": [1280, 720], "9:16": [720, 1280], "4:5": [960, 1200] };
  const [width, height] = map[ratio] || map["1:1"];
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&enhance=true`;
}

function extractHtml(reply) {
  const htmlBlock = String(reply || "").match(/```html([\s\S]*?)```/i) || String(reply || "").match(/```([\s\S]*?)```/);
  let html = htmlBlock ? htmlBlock[1].trim() : String(reply || "").trim();
  if (!/<!doctype html|<html/i.test(html)) {
    html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>SAIVEX Website</title><style>body{font-family:Arial;padding:40px;line-height:1.6}</style></head><body><pre>${htmlEscape(reply)}</pre></body></html>`;
  }
  return html;
}

export async function onRequestOptions() { return json({ ok: true }); }

export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const message = String(body.message || "").trim();
    const history = Array.isArray(body.history) ? body.history : [];
    const ratio = body.ratio || "1:1";
    if (!message) return json({ reply: "Please type a message first." });
    if (!env.OPENROUTER_API_KEY) return json({ reply: "OpenRouter API key missing. Add OPENROUTER_API_KEY in Cloudflare Pages environment variables." });

    const intent = detectIntent(message);
    const topic = cleanTopic(message, intent);
    const shouldSearch = ["search", "ppt", "pdf", "website"].includes(intent) || /\b(internet|sources|latest|current|news|web)\b/i.test(message);
    const sources = shouldSearch ? await gatherSources(topic || message, env) : [];

    const messages = [{ role: "system", content: systemPrompt(intent) }];
    if (sources.length || shouldSearch) {
      messages.push({ role: "system", content: "Live internet/source snippets:\n\n" + sourceText(sources) });
    }
    for (const item of history.slice(-8)) {
      if (!item || !item.message) continue;
      messages.push({ role: item.sender === "bot" ? "assistant" : "user", content: String(item.message).slice(0, 2500) });
    }
    messages.push({ role: "user", content: message });

    const maxTokens = intent === "website" ? 3500 : intent === "ppt" || intent === "pdf" ? 2600 : 1800;
    const reply = await askOpenRouter(env, messages, maxTokens);

    const extra = { intent, sources };
    if (intent === "search") {
      extra.reply = reply + (sources.length ? "" : "\n\nNote: free live search returned limited snippets. For stronger real-time web search, add BRAVE_SEARCH_API_KEY later.");
    }
    if (intent === "image") {
      const prompt = `${reply}\nStyle: ${body.style || "cinematic"}, premium, detailed, SAIVEX Kalinga UI, high quality`;
      extra.image = imageUrlFromPrompt(prompt, ratio);
    }
    if (intent === "pdf") {
      extra.file_name = safeName(topic || "saivex-document", "pdf");
      extra.file_mime = "application/pdf";
      extra.document_text = reply;
      extra.reply = reply + "\n\n✅ Real PDF download is ready. Click Download PDF.";
    }
    if (intent === "ppt") {
      extra.file_name = safeName(topic || "saivex-presentation", "pptx");
      extra.file_mime = "application/vnd.openxmlformats-officedocument.presentationml.presentation";
      extra.ppt_slides = extractSlides(reply, topic || "SAIVEX Presentation");
      extra.reply = reply + "\n\n✅ Real PPTX download is ready. Click Download PPTX.";
    }
    if (intent === "website") {
      const html = extractHtml(reply);
      extra.file_name = safeName(topic || "saivex-website", "html");
      extra.file_mime = "text/html";
      extra.file_content = html;
      extra.preview_content = html;
      extra.reply = "✅ Website generated using available source snippets. Click Preview Website or Download HTML.";
    }
    if (intent === "code") {
      extra.file_name = safeName(topic || "saivex-code", "txt");
      extra.file_mime = "text/plain";
      extra.file_content = reply;
    }

    return json({ reply: extra.reply || reply, conversation_id: body.conversation_id || Date.now(), ...extra });
  } catch (error) {
    return json({ reply: "SAIVEX function error: " + String(error.message || error).slice(0, 260) }, 200);
  }
}
