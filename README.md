# Spider Fight

Southern stick-fighting circuit. Catch porch orb-weavers, drill them, wager cash, and hold the stick. Lose a bout and the wraps walk off with the other yard — then you train them back.

Playable on phone and desktop.

## What’s in the yard

- **Hunt** six lights a night across porch, garden, barn, woods, fair
- **Stable** of fighters that molt, take injury, and lose gear on a drop
- **Train / shop / team** — cash buys wraps, fangs, silk, stims, bait
- **Stick fights** — real-time hanging combat on a bamboo line (lunge, grapple, feint, brace, yank, drop)
- **Stick mind (Jev)** — rivals pick moves with TypeSafe’s System One model when `TYPESAFE_API_KEY` is set; local instinct covers if the line is dark

## Run it

```bash
npm install
npm run dev
```

Then open the app. `npm run build` / `npm run typecheck` are the production gates.

## Jev (optional)

Rivals, post-fight reads, and hunt appraisals call [TypeSafe Jev](https://docs.typesafe.ai/introduction). Server-only.

1. Copy `.env.example` and set `TYPESAFE_API_KEY`
2. Or drop the key in `.secrets/typesafe.key` (gitignored)

Do not commit the key. Do not put it in any `VITE_` variable — that would ship it to the browser.

## Stack

React 19 · TanStack Start · Vite · Tailwind v4 · Zustand (local save) · Canvas 2D spiders

## License

Personal project. All rights reserved unless noted otherwise.
