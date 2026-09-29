# Programming Track

The public site for the Programming Track of Tuwaiq Club at the University of Jeddah (Tuwaiq × UJ): a boot splash that draws the Commit Mountain, a roster of members, each with their own character and badges, a drag-around sticker playground, and a semester journey.

Built with React + Vite, Motion (`motion/react`) for interaction, and GSAP (ScrollTrigger, SplitText) for reveal animations. It runs on Cloudflare: one Worker serves the site and a small API (Hono), content lives in a D1 database (Drizzle), and uploads go to R2.

```bash
npm install
npm run db:migrate:local && npm run db:seed:local   # first time only: a local copy of the database
npm run dev        # site + API + local database at http://localhost:5173
npm run build      # production build into dist/
npm run lint
npm run typecheck  # the Worker (TypeScript)
```

## How it fits together

- **Content is data, not code.** Members, the journey, badges, the "Up next" tile and the site text live in D1. The site fetches them all from `GET /api/content` once at startup (`src/data/content.js`), then components read them as plain imports (`members`, `track`, …).
- **One Worker, one deploy.** Requests to `/api/*` go to `worker/index.ts`; everything else is the built site, served as static files (`wrangler.jsonc` → `assets`).
- **Growing it:** a new feature is usually a table in `worker/db/schema.ts` (+ `npm run db:generate`), a route file in `worker/routes/`, and a component.

## Where things live

```
wrangler.jsonc          Cloudflare config: Worker name, D1 + R2 bindings, static assets
worker/                 the API (TypeScript)
  index.ts              mounts every route under /api
  routes/content.ts     GET /api/content: everything the public site shows
  db/schema.ts          the database tables (Drizzle)
  db/client.ts          database helper + binding types
migrations/             SQL migrations generated from schema.ts (applied with wrangler)
db/seed.sql             starting content, for filling a fresh (e.g. local) database
src/
  data/                 content modules, filled from the API at startup (+ helpers like milestoneStatus)
    content.js          loads /api/content and hands it out
    track.js            track name, club, semester, intro text
    members.js          the roster
    badges.js           every badge that can be earned
    milestones.js       the semester journey
    announcement.js     the purple "Up next" tile in the members grid
  components/
    splash/             boot screen: terminal opens, `git log --graph` draws the mountain,
                        which then flies into the header (shared motion layoutId "brand-mountain")
    brand/              Mountain (the pixel Commit Mountain) and the TUWAIQ × UJ lockup
    layout/             Header, Footer
    intro/              Hero (title, intro, and the typed-out shell session)
    members/            filters, card grid, profile modal, #member/<id> link handling
    playground/         draggable sticker board of every member
    journey/            milestone timeline
    character/          the cartoon characters (blob, star, ghost, robot, cat, cloud, mushroom,
                        flower, monitor; sun and planet for the leader and co-leader)
    badges/             Badge + BadgeMark (the medal graphic)
    ui/                 small shared pieces (Pill, SplitHeading)
  lib/
    gsap.js             GSAP + plugin registration (import GSAP from here)
    mountain.js         the mountain's pixel grid and colours
    palette.js          character colours (the UI itself uses the Tuwaiq purple / violet / cyan tokens)
    pointer.js          shared cursor position the characters' eyes follow
  styles/
    tokens.css          colours, fonts (IBM Plex Sans / JetBrains Mono), spacing, borders
    global.css          base styles and shared helpers
```

## Common changes

**Content** (members, badges, the journey, the "Up next" tile, site text) is edited in the database. The admin panel for this is the next step; until it lands, run SQL against the live database, e.g.:

```bash
npx wrangler d1 execute pt-db --remote --command "UPDATE milestones SET done = 1 WHERE id = 'setup-workshop'"
```

Add `--local` instead of `--remote` to try it on your local copy first. Things to know about the data:

- **Members** — `id` is the URL slug (`#member/<id>`); `name` is written exactly as they spell it (Arabic names get an Arabic font automatically); `short` overrides the card name when first + last word comes out wrong. `role` `leader` / `co-leader` gives a card its own hue and a big coloured title. `position` sets roster order; the first three stand on the Commit Mountain in the hero. Character = `avatar_char` + `avatar_body` (a palette key).
- **Badges** — awarded through `member_badges` (member id + badge id). A badge with a `milestone_id` also shows on that journey step. Every badge is drawn in the Tuwaiq orange.
- **Journey** — ordered by `position`. The first milestone that isn't `done` is marked "Up next"; the next two show as locked steps with no details, the trail fades out after them, and the rest aren't shown at all.
- **"Up next" tile** — the `announcement` row in `settings` (JSON: `eyebrow`, `big`, `title`, `body`, `ctaLabel`, `ctaUrl`). Delete the row to hide the tile.

**New character** — add a key to `shapes` in `src/components/character/Character.jsx` (drawn on a 200×200 canvas; use `<Eye>` for eyes that follow the cursor), then use that key as a member's `avatar.char`.

**New page section** — create a folder under `src/components/`, then add it to the section list in `src/App.jsx` (and a link in `Header.jsx` if it needs one).

**The boot splash** plays once per browser session, and is skipped for deep links (`#members`, `#member/<id>`) and reduced-motion users. To see it again, open a new tab or clear the `pt:booted` key in sessionStorage. The club logo in the hero is `public/brand/tuwaiq-club-mark.png` (the official logo with its purple background keyed out to transparent).

**The hero climb** puts the first few members' characters on the Commit Mountain: the leader up the left slope, the co-leader one step below her, and the next member on the right slope. Who stands where is `SPOTS` in `src/components/intro/Hero.jsx`: one mountain column (0–14; the summit is 8) per character, in roster order.

**Share a member's card** — every profile has a link: `/#member/<id>`.

## Deploying

Cloudflare (Workers Builds) is connected to this repo: every push to `main` runs `npm run build` then `npx wrangler deploy`. Progress shows in the Cloudflare dashboard under the Worker **tuwaiq-uj-programing**.

## Database

- **Change the schema:** edit `worker/db/schema.ts`, run `npm run db:generate` (writes a new file in `migrations/`), then `npm run db:migrate:local` to try it.
- **Before pushing a change that needs a new migration,** apply it to the live database with `npm run db:migrate:remote`; the deploy doesn't run migrations on its own. Keep migrations additive (new tables/columns), so the running site keeps working while the new code deploys.
- **Changed `wrangler.jsonc`?** Run `npm run cf-typegen` to refresh the Worker's binding types.
