# HTML Shooter Platformer (Phaser + Supabase + Vite)

Simple browser shooter platformer with NO external art assets (all shapes generated at runtime). Multiplayer uses Supabase Realtime. Deploy as a static site on Vercel.

## Tech Stack
- Phaser 3 (Arcade Physics)
- Supabase Realtime (presence + broadcast)
- Vite (dev/build)
- Vercel (static hosting)

## Setup (Windows PowerShell or cmd)
1. Install dependencies
```cmd
npm install
```
2. Configure Supabase
- Copy `.env.local.example` to `.env.local` and fill values:
```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```
- In Supabase, Project Settings → API: copy Project URL and anon key. Realtime channels are enabled by default.

3. Run dev server
```cmd
npm run dev
```
Open http://localhost:5173

If `.env.local` is missing, the game runs offline and shows a red banner. You can still test locally (single player).

## Build and Preview
```cmd
npm run build
npm run preview
```

## Deploy to Vercel (Dashboard)
- Create a new Vercel project and import this repo.
- Framework Preset: Vite
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variables (Production + Preview):
  - `VITE_SUPABASE_URL` = https://<project>.supabase.co
  - `VITE_SUPABASE_ANON_KEY` = <anon-key>
- Deploy. Vercel serves `dist/` as static site. `vercel.json` enables SPA fallback.

## Deploy to Vercel (CLI)
```cmd
npm i -g vercel
vercel login
vercel link
vercel --prod
```
Ensure the two `VITE_` env vars are set in the Vercel Project → Settings → Environment Variables.

## Optional: Share local dev for quick playtests
```cmd
winget install Cloudflare.cloudflared
cloudflared tunnel --url http://localhost:5173
```
Share the HTTPS URL with your friends.

## Gameplay
- Move: A/D or Left/Right
- Jump: W or Up or Space
- Shoot: Left mouse button
- Respawn: R
- Pause: P (visual pause not implemented; you can extend UIScene)

## Notes & Tips
- Network send rate: 10–15 Hz (throttled). Rendering at 60 FPS.
- Basic client-side interpolation for remote players.
- Keep bullet count modest; destroy off-screen quickly. You can add simple pooling if needed.

## License
MIT
