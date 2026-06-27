# SAIVEX-Free

This is the static/serverless migration of SAIVEX for free deployment.

## What works in this first SAIVEX-Free build

- Kalinga UI pages converted from Flask templates to normal HTML
- Static frontend in `public/`
- AI chat through Cloudflare Pages Function: `/api/chat`
- Browser voice input/output
- Chat history saved in browser localStorage
- File/image selection preview saved locally in browser

## What is kept for later phases

- Full Supabase login/database
- Cloudinary upload storage
- Cloud image analysis
- PDF/PPT cloud generation
- Admin features

## Local test

Open `public/index.html` directly, or use VS Code Live Server.

AI chat needs Cloudflare Pages Functions, so it will fully work only after Cloudflare deployment.

## Deploy to Cloudflare Pages

1. Push this folder to GitHub.
2. Open Cloudflare Dashboard > Workers & Pages > Create Pages.
3. Connect GitHub repo.
4. Build command: leave empty.
5. Build output directory: `public`.
6. Add environment variables:
   - `OPENROUTER_API_KEY`
   - `SAIVEX_DEFAULT_MODEL` = `openai/gpt-4o-mini`
   - `SAIVEX_PUBLIC_URL` = your final Cloudflare Pages URL
7. Deploy.

