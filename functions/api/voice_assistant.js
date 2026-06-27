export async function onRequestPost(context) {
  return context.env.OPENROUTER_API_KEY
    ? context.next?.() || new Response(JSON.stringify({ reply: "Voice backend is now handled by browser speech + /api/chat." }), { headers: { "Content-Type": "application/json" } })
    : new Response(JSON.stringify({ reply: "Voice backend needs OPENROUTER_API_KEY." }), { headers: { "Content-Type": "application/json" } });
}
