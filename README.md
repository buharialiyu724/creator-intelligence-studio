# Creator Intelligence Studio

A responsive creator strategy workspace inspired by common creator-tool workflows. It is an independent project and is not affiliated with vidIQ, YouTube, OpenAI or Anthropic.

## Included modules
- YouTube niche analyzer with a local validation framework and optional AI-generated analysis
- Long-form script outline builder and optional full-script generation
- YouTube public channel/video statistics via YouTube Data API v3
- Web research desk with search shortcuts; live web research requires a search provider integration
- AI assistant with OpenAI and Anthropic provider options
- Copy and `.txt` export for generated outputs
- Mobile responsive UI

## Deploy the frontend with GitHub Pages
1. Upload `index.html`, `style.css`, and `app.js` to the root of a repository or a subfolder.
2. Enable GitHub Pages from the branch and folder containing `index.html`.
3. Deploy `worker.js` separately to Cloudflare Workers. Do not place API keys in the frontend.

## Configure the Cloudflare Worker
Create a Worker and paste `worker.js`, then add secrets:
- `OPENAI_API_KEY` for OpenAI model requests
- `ANTHROPIC_API_KEY` for Claude requests (optional)
- `YOUTUBE_API_KEY` for public YouTube channel/video statistics (optional)

Optional variables:
- `OPENAI_MODEL` — defaults to `gpt-4.1-mini`
- `ANTHROPIC_MODEL` — defaults to `claude-3-5-haiku-latest`
- `APP_ORIGIN` — exact origin of your deployed frontend, e.g. `https://YOURNAME.github.io`; set it carefully for CORS

In the frontend, open **AI assistant → Worker endpoint**, paste your `https://...workers.dev` URL and save. The URL is stored only in that browser's localStorage.

## API notes
- OpenAI API billing is separate from ChatGPT subscriptions.
- Anthropic API billing is separate from Claude chat subscriptions.
- YouTube Data API v3 has quota limits and returns public statistics. Subscriber counts may be hidden or rounded by YouTube.
- Private YouTube Analytics (watch time, impressions, CTR, revenue, audience retention) requires implementing OAuth 2.0 with channel-owner consent and calling the YouTube Analytics API. This starter does not implement that OAuth flow.
- Live web research is deliberately not faked. The research module provides direct search shortcuts until a licensed search API is configured and integrated.
- Add authentication, rate limiting and usage controls before public launch. Unauthenticated Worker endpoints can incur API costs.
- This app is a starter product, not a full clone of vidIQ, ChatGPT or Claude.

## Test locally
Open `index.html` in a modern browser. For Worker calls, deploy the Worker on HTTPS and configure the URL in the AI Assistant tab.
