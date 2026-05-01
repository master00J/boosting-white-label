# BoostPlatform Discord Bot

Aparte Node.js service die draait op een VPS. Verbindt met Supabase voor realtime order updates en biedt slash commands voor boosters en admins.

## Setup

```bash
cd discord-bot
cp .env.example .env
# Vul .env in met je tokens

npm install
npm run build
npm run deploy-commands  # Registreer slash commands
npm start
```

## Development

```bash
npm run dev  # ts-node-dev met hot reload
```

## Docker

```bash
npm run build
docker build -t boost-discord-bot .
docker run --env-file .env boost-discord-bot
```

## Slash Commands

| Command | Beschrijving | Toegang |
|---------|-------------|---------|
| `/claim <ordernummer>` | Claim een order | Worker |
| `/unclaim <ordernummer>` | Geef order terug | Worker |
| `/progress <ordernummer> <percentage> [notitie]` | Update voortgang | Worker |
| `/complete <ordernummer>` | Voltooi een order | Worker |
| `/status <ordernummer>` | Bekijk order status | Iedereen |
| `/stats` | Jouw statistieken | Worker |
| `/leaderboard` | Top boosters | Iedereen |
| `/payout` | Uitbetaling aanvragen | Worker |
| `/lookup <ordernummer>` | Order opzoeken | Admin |
| `/assign <ordernummer> <booster>` | Order toewijzen | Admin |

## Configuratie

Kanalen en rollen kunnen worden ingesteld via:
- Omgevingsvariabelen in `.env`
- Of via het admin panel: `/admin/discord`
