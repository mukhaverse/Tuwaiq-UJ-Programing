# Programming Track

The public site for the Programming Track of Tuwaiq Club at the University of Jeddah (Tuwaiq × UJ): a boot splash that draws the Commit Mountain, a roster of members, each with their own character and badges, a drag-around sticker playground, a semester journey, and the track's builds (its own projects and collaborations with other tracks), where other tracks can request a build.

Built with React + Vite, Motion (`motion/react`) for interaction, and GSAP (ScrollTrigger, SplitText) for reveal animations. It runs on Cloudflare: one Worker serves the site and a small API (Hono), content lives in a D1 database (Drizzle), and uploads go to R2.

```bash
npm install
cp .dev.vars.example .dev.vars                      # first time only: local settings
npm run db:migrate:local && npm run db:seed:local   # first time only: a local copy of the database
npm run dev        # site + API + local database at http://localhost:5173
npm run build      # production build into dist/
npm run lint
npm run typecheck  # the Worker (TypeScript)
```

## How it fits together

- **Content is data, not code.** Members, the journey, badges, the "Up next" tile and the site text live in D1. The site fetches them all from `GET /api/content` once at startup (`src/data/content.js`), then components read them as plain imports (`members`, `track`, …).
- **One Worker, one deploy.** Requests to `/api/*` go to `worker/index.ts`; everything else is the built site, served as static files (`wrangler.jsonc` → `assets`).
- **Admin panel** at `/#admin` (`src/admin/`): sign in with GitHub, then edit everything above from forms. It's a separate bundle that only loads when opened. Every `/api/admin/*` route checks, on the server, that the signed-in user has the `admin` role.
- **Growing it:** a new feature is usually a table in `worker/db/schema.ts` (+ `npm run db:generate`), a route file in `worker/routes/`, and a component.

## Where things live

```
wrangler.jsonc          Cloudflare config: Worker name, D1 + R2 bindings, static assets
worker/                 the API (TypeScript)
  index.ts              mounts every route under /api
  auth.ts               login (Better Auth + GitHub) and the requireRole() check
  routes/content.ts     GET /api/content: everything the public site shows
  routes/requests.ts    POST /api/requests: the public "request a build" form (only while requests are open)
  routes/media.ts       GET /api/media/<key>: uploaded files
  routes/admin/         one file per thing the admin panel edits (members, milestones, badges,
                        settings, uploads, survey, projects, tracks); index.ts puts all of them behind requireRole("admin")
  db/schema.ts          the site's tables (Drizzle)
  db/auth-schema.ts     login tables (users, sessions, accounts)
  db/client.ts          database helper + binding types
migrations/             SQL migrations generated from schema.ts (applied with wrangler)
db/seed.sql             starting content, for filling a fresh (e.g. local) database
src/
  admin/                the admin panel (#admin): AdminApp.jsx (sign-in + layout), sections/ (one per
                        tab), ui.jsx + hooks.js (shared form pieces), api.js
    survey/             the Survey tab: model.js (questions, scoring, name matching, stats),
                        sheet.js (reads .xlsx/.csv), and its views (Overview, People, Teams, Data)
  data/                 content modules, filled from the API at startup (+ helpers like milestoneStatus)
    content.js          loads /api/content and hands it out
    track.js            track name, club, semester, intro text
    members.js          the roster
    badges.js           every badge that can be earned
    milestones.js       the semester journey
    announcement.js     the purple "Up next" tile in the members grid
    projects.js         builds (in progress and done), the other tracks and their colours,
                        whether requests are open, plus the request kinds and statuses
  components/
    splash/             boot screen: terminal opens, `git log --graph` draws the mountain,
                        which then flies into the header (shared motion layoutId "brand-mountain")
    brand/              Mountain (the pixel Commit Mountain) and the TUWAIQ × UJ lockup
    layout/             Header, Footer
    intro/              Hero (title, intro, and the typed-out shell session)
    members/            filters, card grid, profile modal, #member/<id> link handling
    playground/         draggable sticker board of every member
    journey/            milestone timeline
    builds/             Builds: the PT-OS desktop (Desktop.jsx) and the request form (#request)
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

**Content** (members, badges, the journey, the "Up next" tile, site text, files) is edited in the admin panel at `/#admin`. Changes are live within about 10 seconds. Things to know:

- **Members**: the link id (`#member/<id>`) is set when a member is added and can't change afterwards. Names are written exactly as they spell them (Arabic names get an Arabic font automatically); "Card name" overrides the first + last name on cards. Leader / Co-leader gives a card its own hue. Order matters: the first three stand on the Commit Mountain in the hero.
- **Badges** are created in Badges and awarded to people from their page in Members. A badge linked to a milestone also shows on that journey step.
- **Journey**: the first milestone that isn't done is "Up next"; the next two show as locked steps with no details, the trail fades out after them, and the rest aren't shown at all.
- **Up next tile**: hide it when there's nothing to announce.

**Builds** (the section after the journey) is PT-OS: a little desktop on a monitor (`src/components/builds/Desktop.jsx`). The top bar counts what's building and what's shipped. One build is open at a time in a window, with the next few peeking out behind it; the taskbar switches between them, grouped into Collabs and Projects (past five builds, its tabs shrink to colour squares). Left alone, the desktop moves to the next build every 6 seconds (a timer fills under the open tab), so no build looks like the main one; it pauses on hover, stops for good once someone clicks, and only runs while the section is on screen. The open build's crew peeks over the monitor (each links to their profile). Finished builds are in the **shipped** folder on the desktop, each with a ✓ and the month it was marked done.

Each build is either a **collaboration** (linked to another track: its window, taskbar tab and the monitor's glow take that track's colour, "Programming × Media" sits in the window's corner, and the other track's cursor wanders around it; tracks and colours are set in **Tracks** in the admin panel) or a **project** (the track's own work, in violet, with an optional "for …" label). The kind (survey, website…) is optional; leave it empty and nothing is shown.

Manage them in **Projects** in the admin panel: **In progress** puts a build on the monitor, **Done** files it in the shipped folder (stamped with the date it was marked done; reopening it clears the stamp), **Declined** keeps it off the site. **+ Add** creates one directly.

**Requests** are off until you switch them on with the bar at the top of **Projects**. While they're open, a "Request a build" button under the monitor opens the request form, also reachable at `/#request` (a link to send other tracks; while requests are closed it says so instead, and the API refuses submissions). No sign-in: people say what they need, pick their track (or type one under "Other"), leave a contact, and get a ticket number like `#PT-007`. Requests land under **New request**; set one to In progress to start it. The requester's name, contact, typed-in track and details stay private (admin API only, never in `/api/content`).

Where to change things: request kinds are `KINDS` in `src/data/projects.js`; statuses are `PROJECT_STATUSES` in `worker/db/schema.ts` (+ labels in `STATUS`), and which of them the site shows is `PUBLIC_PROJECT_STATUSES`. Spam protection is light: a hidden honeypot field, length limits, and the form stops taking requests once 100 are waiting in New.

**Survey** (`#admin/survey`, admin only): stats and a profile for each member, built from the members survey. Tabs: **Overall** (summary, skills, who to involve, an index of every question), **Questions** (each question on its own page with every answer, who gave it, and a breakdown by level, year, role, format or major; ← → step through them), **People**, **Teams**, **Import & data**. Import the survey's spreadsheet export (.xlsx or .csv) under **Import & data**. It's read in the browser and saved to the `survey_responses` table. Re-uploading a newer export only adds new responses. Each response is linked to a roster member by name (Arabic or English spelling), and wrong or missing links can be fixed on the same page. Only each person's latest submission counts. The answers never appear in `/api/content` or anywhere on the public site, and the Members tab links to each member's survey profile. The question wording lives in `src/admin/survey/model.js`: if a future survey changes its columns or answers, update it there. **Never commit the spreadsheet**: the repo is public, and `*.xlsx` / `*.csv` are git-ignored for that reason.

**Admin access**: anyone can sign in with GitHub, but new accounts are plain members and can't reach the admin panel. To give someone admin (or take it away), change their role:

```bash
npx wrangler d1 execute pt-db --remote --command "UPDATE user SET role = 'admin' WHERE email = 'them@example.com'"
npx wrangler d1 execute pt-db --remote --command "SELECT name, email, role FROM user"
```

The change applies on their next click. **Locally**, the sign-in page also has an email + password form (on only when `DEV_LOGIN=true` in `.dev.vars`), because GitHub only sends people back to the live site; promote that account with the same command using `--local`.

**New character** — add a key to `shapes` in `src/components/character/Character.jsx` (drawn on a 200×200 canvas; use `<Eye>` for eyes that follow the cursor), then use that key as a member's `avatar.char`.

**New page section** — create a folder under `src/components/`, then add it to the section list in `src/App.jsx` (and a link in `Header.jsx` if it needs one).

**The boot splash** plays once per browser session, and is skipped for deep links (`#members`, `#member/<id>`) and reduced-motion users. To see it again, open a new tab or clear the `pt:booted` key in sessionStorage. The club logo in the hero is `public/brand/tuwaiq-club-mark.png` (the official logo with its purple background keyed out to transparent).

**The hero climb** puts the first few members' characters on the Commit Mountain: the leader up the left slope, the co-leader one step below her, and the next member on the right slope. Who stands where is `SPOTS` in `src/components/intro/Hero.jsx`: one mountain column (0–14; the summit is 8) per character, in roster order.

**Share a member's card** — every profile has a link: `/#member/<id>`.

## Deploying

Cloudflare (Workers Builds) is connected to this repo: every push to `main` runs `npm run build` then `npx wrangler deploy`. Progress shows in the Cloudflare dashboard under the Worker **tuwaiq-uj-programing**.

## Secrets

Set once on Cloudflare with `npx wrangler secret put <NAME>`: `BETTER_AUTH_SECRET` (signs login sessions; any long random string) and `GITHUB_CLIENT_SECRET` (from the GitHub OAuth App, whose callback URL is `https://tuwaiq-uj-programing.shumokhalsharif.workers.dev/api/auth/callback/github`). Public settings (`BETTER_AUTH_URL`, `GITHUB_CLIENT_ID`) are in `wrangler.jsonc`.

## Database

- **Change the schema:** edit `worker/db/schema.ts`, run `npm run db:generate` (writes a new file in `migrations/`), then `npm run db:migrate:local` to try it.
- **Before pushing a change that needs a new migration,** apply it to the live database with `npm run db:migrate:remote`; the deploy doesn't run migrations on its own. Keep migrations additive (new tables/columns), so the running site keeps working while the new code deploys.
- **Changed `wrangler.jsonc`?** Run `npm run cf-typegen` to refresh the Worker's binding types.
