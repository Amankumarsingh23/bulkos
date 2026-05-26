# BulkOS — Your Wellness Journal

A luxury bulk-tracking web app. Log daily weight, calories, and macros; watch AI-powered insights and rich analytics charts unlock as your data grows.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS v4 (CSS-first config) |
| Database / Auth | Supabase (PostgreSQL + Row-Level Security) |
| AI | Groq API — `llama-3.3-70b-versatile` |
| Charts | Recharts v3 |
| Animations | Framer Motion v12 |
| Deployment | Vercel |

## Features

- **Daily Log** — weight, calories, macros (protein / carbs / fats), water, sleep, notes; auto-fills missing weight from last entry
- **Dashboard** — streak, macro donut, weekly calendar view, weight trend mini-chart
- **Analytics** — 8 chart types with 7D / 30D / 90D / All-time ranges (unlocks after 7 logged days):
  - Weight trend with 7-day moving average
  - Calorie surplus bars + cumulative line
  - Macro stacked area (grams or %)
  - Protein g/kg with optimal band
  - Weight velocity with target range
  - BMI trajectory with WHO bands
  - 12-week consistency heatmap
  - Surplus vs. weight-change scatter
- **AI Insights** — weekly and monthly reports generated via Groq; Ask AI chat for nutrition questions
- **Goals** — progress bar toward target weight, projection chart, customisable milestones
- **Settings** — edit profile, TDEE recalc modal, CSV / JSON data export, delete account, units toggle
- **PWA** — installable on iOS and Android, offline shell caching via service worker
- **Polish** — page transitions, toast notifications, empty states, mobile bottom tab bar

## Setup

### 1. Clone

```bash
git clone https://github.com/yourusername/bulkos.git
cd bulkos
npm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run your schema migrations in the SQL editor to create:
   - `profiles` — user stats (height, age, gender, activity level, goal)
   - `daily_logs` — per-day entries (weight, calories, macros, water, sleep, notes)
   - `milestones` — goal checkpoints
   - `ai_reports` — saved AI-generated reports
3. Enable **Email + Password** auth (and optionally Google OAuth) in Auth settings
4. Copy your **Project URL** and **anon public key** from Settings → API

### 3. Environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>

# Groq (optional — AI Insights tab requires this)
GROQ_API_KEY=<your-groq-api-key>

# Supabase service role key (optional — required for delete-account feature)
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

Get a free Groq API key at [console.groq.com](https://console.groq.com).

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

1. Push to GitHub
2. Import the repo in the [Vercel dashboard](https://vercel.com/new)
3. Add environment variables in **Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `GROQ_API_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` *(optional)*
4. Deploy — Vercel auto-detects Next.js

### Supabase Auth redirect URL

In Supabase → Authentication → URL Configuration, add your Vercel URL to **Redirect URLs**:

```
https://your-app.vercel.app/auth/callback
```

### Regenerate icons

If you change the brand colour, regenerate PWA icons:

```bash
node scripts/generate-icons.mjs
```

Requires `sharp` (already a dependency).

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon (public) key |
| `GROQ_API_KEY` | For AI tab | Groq LLM API key |
| `SUPABASE_SERVICE_ROLE_KEY` | For account deletion | Supabase service role key (never expose client-side) |

## Contributing

1. Fork and create a branch: `git checkout -b feat/your-feature`
2. Make changes, run `npx tsc --noEmit` and `npm run lint`
3. Commit and open a pull request

Please keep commits focused; one logical change per PR.

## License

MIT
