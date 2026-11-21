# OWL_AI — local setup

OWL_AI is the site assistant. The browser talks to `/api/owl-ai`, which forwards a short, validated chat to a
BitNet `llama-server` (llama.cpp compatible) and streams the answer back.

## Run locally
1. Start BitNet (in the `BitNet` folder, conda env `bitnet-cpp`, Developer PowerShell):
   `python run_inference_server.py -m models/BitNet-b1.58-2B-4T/ggml-model-i2_s.gguf -t 4 -c 2048 --host 127.0.0.1 --port 8080`
2. In this repo: `npm ci` then `npm run dev`, open the URL Vite prints.
3. Click the owl button (bottom right). Switch EN / BR / ES: the answers follow the site language.

`vite.config.ts` serves `/api/owl-ai` in dev with the same handler (`api/owl-ai.js`) that Vercel runs in production.

## What the API enforces
- POST only; Origin must be the site, `localhost`/`127.0.0.1`, or listed in `OWL_AI_ALLOWED_ORIGINS` (required in Vercel production).
- Max 8 messages, 500 chars each, only `user`/`assistant` roles; chat-template tokens (`<|...|>`) and control characters are stripped.
- Per-IP rate limit (default 15 / 5 min) and max 2 simultaneous generations (CPU protection). The limit is best effort on
  serverless: for the public site also add a Cloudflare rate-limiting rule in front of the tunnel.
- Obvious prompt-injection attempts (EN / PT / ES) get a fixed reply without calling the model.
- The model is told to use only the facts in `FACTS` (top of `api/owl-ai.js`) — edit that block to teach it new, true information.

## Phase 2 (public, via Cloudflare Tunnel)
Set `LLAMA_URL` to the tunnel hostname in Vercel, protect it with a Cloudflare Access service token
(`CF_ACCESS_CLIENT_ID` / `CF_ACCESS_CLIENT_SECRET`) and/or `llama-server --api-key` + `LLAMA_API_KEY`.
If the PC is off the widget shows a friendly "offline" message.
