# SAIVEX Free V2

This build connects the main tools in a Cloudflare Pages compatible way.

Working in this version:
- Basic AI chat through OpenRouter
- Tool buttons for PPT / PDF / website / code / image prompts
- Generated downloadable files as HTML/TXT
- Image generation preview using a free image endpoint
- Voice and wake mode through browser speech recognition
- Camera/image vision through OpenRouter vision model
- Local demo login/signup in browser storage

Important:
- PDF/PPT are generated as print-ready/presentation HTML. Open them and use Print → Save as PDF. True .pptx/.pdf generation needs a heavier backend.
- Login is local demo auth. Real Google/email auth needs Supabase setup.
- Vision requires a vision-capable OpenRouter model. Set SAIVEX_VISION_MODEL if needed.

Cloudflare Pages settings:
- Build command: leave empty
- Build output directory: public
- Environment variables:
  - OPENROUTER_API_KEY = your key
  - SAIVEX_DEFAULT_MODEL = openai/gpt-4o-mini
  - SAIVEX_VISION_MODEL = openai/gpt-4o-mini
