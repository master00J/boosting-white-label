# Deploy (o.a. Pterodactyl)

- **Startup file:** `dist/index.js` (niet `index.js`).
- Na `git pull`: als je lokaal bouwt, run `npm run build`. De repo bevat al een gebouwde `dist/`; als je die gebruikt, hoef je niet te bouwen.
- **Env (of Admin → Discord):** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `DISCORD_CHANNEL_NEW_ORDERS` (kanaal voor nieuwe orders). Optioneel: andere `DISCORD_CHANNEL_*` en bot token/client id/guild id.

Logs die je moet zien als alles goed staat:
- `Order sync started — listening to Supabase realtime + polling fallback...`
- `Order polling: every 45s, first poll in 3s...`
- Na ~3s: `[Poll] First poll running...` en `[Poll] Orders in last 5 min: X (Y not yet notified).`

Als je die polling-regels niet ziet, draait er oude code: run `npm run build` na pull, of controleer dat de startup file `dist/index.js` is.
