# LifeBalance AI

## What This App Does

Personal time-management PWA. Users create events and tasks across 7 life categories (Faith, Sleep, Work/Money, Food/Meals, Family, Entertainment, Personal/Other), track a 24-hour daily budget, set weekly hour goals per category, and see a Life Balance Score. V3 adds an AI planner powered by Claude that analyzes schedules and suggests improvements — users must approve every AI-generated change before it's applied.

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JS — no framework, no build step. Single `app.js`, `index.html`, `style.css`.
- **Persistence**: localStorage (`chronosEvents`, `chronosGoals`, `chronosPreferences`, `chronosDataVersion`).
- **AI Backend**: Netlify Function (`netlify/functions/ai-planner.js`) calling the Anthropic API via `@anthropic-ai/sdk`.
- **Hosting**: Netlify static site + serverless functions.
- **Model**: `claude-sonnet-5-5` (set in the Netlify Function, not the frontend).

## Folder Structure

```
.
├── index.html                      # Single-page HTML shell
├── app.js                          # All frontend logic (~1700 lines)
├── style.css                       # All styles (~1900 lines)
├── netlify.toml                    # Netlify config (functions dir, /api/* redirect)
├── package.json                    # Node deps (@anthropic-ai/sdk)
├── .env.example                    # Template for local dev
├── .gitignore                      # node_modules, .env, .netlify
├── netlify/
│   └── functions/
│       └── ai-planner.js           # Serverless Claude API proxy (~200 lines)
└── tasks/
    └── todo.md                     # Implementation plans with checklists
```

## How to Run Locally

1. `npm install`
2. Copy `.env.example` to `.env` and add your Anthropic API key
3. `netlify dev` — serves at `http://localhost:8888`
4. The AI panel works in demo/fallback mode without an API key

## How to Deploy

```
netlify deploy --prod
```

The `ANTHROPIC_API_KEY` env var must be set via `netlify env:set` (already done). The function reads it from `process.env` at runtime.

## Rules

- **NEVER write ANTHROPIC_API_KEY into any file.** The key exists only in Netlify environment variables and optionally in `.env` (which is gitignored). It must never appear in `app.js`, `index.html`, `style.css`, `netlify.toml`, `package.json`, localStorage, or git history.
- Write a plan in `tasks/todo.md` before starting work. Check in before implementing.
- Complete todos one by one, marking them off as you go. Explain each change.
- Keep changes simple and minimal.
- Add a review section in `todo.md` summarizing changes when done.
- All AI-generated schedule changes must be shown to the user for approval — never silently modify calendar data.

## Production URL

https://timely-choux-b3d5f8.netlify.app
