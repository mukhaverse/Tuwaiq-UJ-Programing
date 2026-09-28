# Programming Track

The public site for the Programming Track of Tuwaiq Club at the University of Jeddah (Tuwaiq × UJ): a boot splash that draws the Commit Mountain, a roster of members, each with their own character and badges, a drag-around sticker playground, and a semester journey.

Built with React + Vite, Motion (`motion/react`) for interaction, and GSAP (ScrollTrigger, SplitText) for reveal animations.

```bash
npm install
npm run dev      # local dev server
npm run build    # production build into dist/
npm run lint
```

## Where things live

```
src/
  data/                 ← content. Most day-to-day edits happen here.
    track.js            track name, club, semester, intro text
    members.js          the roster (+ each member's character, role, major, year and badges)
    badges.js           every badge that can be earned
    milestones.js       the semester journey
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

**Add a member** — copy an entry in `src/data/members.js`, give it a unique `id` (used in the URL), write their `name` exactly as they spell it (Arabic or English — Arabic names get an Arabic font automatically), and pick a character and its body colour. Cards show the first and last name; the profile shows the full name (set `short` if first + last comes out wrong). `role: "leader"` / `"co-leader"` gives a card its own hue and a big coloured title. They show up in the grid, the year filters and on the playground automatically.

**Award a badge** — add the badge id to the member's `badges` array, e.g. `badges: ["first-meeting"]`.

**Create a new badge** — add an entry to `src/data/badges.js` (`id`, `name`, `description`, a short `glyph`). Every badge is drawn in the Tuwaiq orange. Set `milestone` if it's tied to a journey milestone, and it'll show up on that milestone too. On a member's profile the badges stamp in one by one, followed by a dashed "next badge" outline.

**Move the journey forward** — set `done: true` on the milestone in `src/data/milestones.js`. The next unfinished one is marked "Up next" automatically. Everything after it stays secret: the next two show as locked steps with no details, the trail fades out after them, and the rest aren't shown at all (so visitors can't tell how many are left). Add/remove milestones freely.

**New character** — add a key to `shapes` in `src/components/character/Character.jsx` (drawn on a 200×200 canvas; use `<Eye>` for eyes that follow the cursor), then use that key as a member's `avatar.char`.

**New page section** — create a folder under `src/components/`, then add it to the section list in `src/App.jsx` (and a link in `Header.jsx` if it needs one).

**The boot splash** plays once per browser session, and is skipped for deep links (`#members`, `#member/<id>`) and reduced-motion users. To see it again, open a new tab or clear the `pt:booted` key in sessionStorage. The club logo in the hero is `public/brand/tuwaiq-club-mark.png` (the official logo with its purple background keyed out to transparent).

**The hero climb** puts the first few members' characters on the Commit Mountain: the leader up the left slope, the co-leader one step below her, and the next member on the right slope. Who stands where is `SPOTS` in `src/components/intro/Hero.jsx`: one mountain column (0–14; the summit is 8) per character, in roster order.

**The crew in numbers** (the purple tile in the members grid) is worked out from `members.js`: member count, number of majors, badges collected, and members per major. It updates itself as the roster changes.

**Share a member's card** — every profile has a link: `/#member/<id>`.

## Deploying

The site is published to GitHub Pages by `.github/workflows/deploy.yml`: every push to `main` builds it (`npm ci && npm run build`) and deploys `dist/`. Progress shows under the repo's **Actions** tab; a deploy takes about a minute.

One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**.

`vite.config.js` uses `base: './'` so the build works from the `/ptmain/` sub-path. Keep navigation hash-based (`#members`, `#member/<id>`) — real paths like `/members` would 404 on Pages.
