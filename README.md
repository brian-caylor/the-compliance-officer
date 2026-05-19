# Compliance Officer v3.11

A workplace tone-translation app, presented as an HR application from 1995. Type a candid workplace message (or paste an email you're worried about) and the Compliance Officer returns a sanitized translation, a danger level on a 10-point scale, flagged phrases, and a snarky note.

## Stack

- Vite + React 18
- [98.css](https://github.com/jdan/98.css) for the Windows 95 aesthetic
- Netlify Functions for the Anthropic API call
- Claude Haiku 4.5 (`claude-haiku-4-5-20251001`)

## Setup

```bash
npm install
cp .env.example .env   # then fill in ANTHROPIC_API_KEY
npx netlify dev
```

Open http://localhost:8888.

## Deploy

Set `ANTHROPIC_API_KEY` in the Netlify dashboard under Site settings → Environment variables, then `netlify deploy --prod`.
