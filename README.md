# Spider Fight

Southern stick-fighting circuit. Catch porch orb-weavers, drill them, wager cash, and hold the stick. Lose a bout and the wraps walk off with the other yard — then you train them back.

Playable on phone and desktop. Install it to a Home Screen for an offline-ready yard.

![Title](docs/screenshots/01-title.png)

## Look

![The yard](docs/screenshots/03-yard.png)

![Night porch hunt](docs/screenshots/05-hunt.png)

![On the line](docs/screenshots/06-hunt-play.png)

![Call a fight](docs/screenshots/10-fight-select.png)

![The stick](docs/screenshots/11-fight.png)

![Lunge](docs/screenshots/12-fight-round.png)

![Call the Widow](docs/screenshots/14-jev-select.png)

![The Widow on the far silk](docs/screenshots/15-jev-fight.png)

![Circuit](docs/screenshots/16-circuit.png)

![Shop](docs/screenshots/07-shop.png)

![Stable](docs/screenshots/04-stable.png)

More shots in [`docs/screenshots`](docs/screenshots): train, settings, hunt result, post-fight read.

## What’s in the yard

- **Hunt** six lights a night across porch, garden, barn, woods, fair
- **Stable** of fighters that molt, take injury, lose gear on a drop, and carry bloodlines
- **Species webs** — every spider has a signature move and a distinct charged-web payoff
- **Pit Circuit** — recluses, huntsmen, trapdoors, Texas brown tarantulas, and goliath bird-eaters, each with their own mill
- **Weight cards** — Thread, Stick, Floor, Pit. Ranked calls match inside one class and its neighbors so a bird-eater never farms a jumper
- **Steel bay** — bonnet eye, optic sting, chrome tarsi, sticky press, web sacs. They start even; the mill is how she becomes hers
- **Hide rack** — bring a picture of a mill you made (Blender, Unreal, Sketchfab). It hangs on the stick and the fight makes it lunge. Copy a ticket so another yard can hang it too. 3D files stay in the crate.
- **Egg sacs** — a hen carries a sac, it hatches on her back, then the spiderlings go everywhere (one stays if you have a crate, the rest infest the hunt lights)
- **Train / shop / team** — drills change the fighter, and cash buys wraps, fangs, silk, stims, bait
- **Stick fights** — readable, timed counter rounds on a bamboo line (lunge, grapple, feint, brace, yank, drop)
- **Rival trophies** — first wins over key crews lift one-of-a-kind, equipable gear to collect and build around
- **Practice Thread** — learn a real opponent's tells with no cash, gear, rank, record, or daily progress at risk
- **Yard archive** — keep the last twelve complete tapes, revisit every exchange, and copy an older match card to share
- **Daily loop** — a rotating contract, a species-web challenge, nightly headliner, and three-call Yard Series
- **Circuit** — personal spider scores, web marks, a collection Almanac, and an authenticated shared score board
- **Black Widow** — Shadow Spar her from the first night to learn her tells with no stakes; the ranked call opens at District. Stick mind (Jev) throws for her when `TYPESAFE_API_KEY` is set; local instinct covers if the line is dark

## Run it

```bash
npm install
npm run dev
```

Then open the app. `npm run build` / `npm run typecheck` are the production gates.

## Jev (optional)

Rivals, post-fight reads, and hunt appraisals call [TypeSafe Jev](https://docs.typesafe.ai/introduction). Server-only.

Set `TYPESAFE_API_KEY` in `.env` (no `VITE_` prefix — that would ship the key to the browser):

```
TYPESAFE_API_KEY=apikey_…
```

The repo is public for now, so treat this key as exposed. Rotate it at [console.typesafe.ai/keys](https://console.typesafe.ai/keys) whenever you lock the repo down. For a local override that stays off git, use `.env.local`.

## Growing the circuit

The game is built to get bigger without breaking old yards.

- **Seasons** live in `src/game/catalog.ts` (`SHIPPED_SEASON`). Porch Year through Pit Circuit are live: culverts, brown widows, ditch wolves, jumpers, feed stores, fair pavilions, motel eaves, stadium gates, freight depots, rooftop towers, signal underpasses, last-light switchbacks, crawlspaces, clay banks, steel bay work, and new crews open by rank.
- **Saves migrate.** `src/game/migrate.ts` upgrades old crates, drops unknown items, and maps missing species back to Hentz.
- **Circuit** in the yard shows open packs, coming packs, ranks, and the almanac. Hold World Stick to roll a new year.
- To ship a pack: fill the pack file, then set `SHIPPED_SEASON` to that pack’s id. No save wipe.

## Stack

React 19 · TanStack Start · Vite · Tailwind v4 · Zustand (local save) · Canvas 2D spiders

## License

Personal project. All rights reserved unless noted otherwise.
