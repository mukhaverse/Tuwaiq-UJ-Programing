# Programming Track

The public site for the Software Engineering Club's Programming Track: a roster of members, each with their own character and badges, a drag-around sticker playground, and a semester journey.

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
    members.js          the roster (+ each member's character, quote and badges)
    badges.js           every badge that can be earned
    milestones.js       the semester journey
  components/
    layout/             Header, Footer
    intro/              Hero (title, intro, and the typed-out shell session)
    members/            filters, card grid, profile modal, #member/<id> link handling
    playground/         draggable sticker board of every member
    journey/            milestone timeline
    character/          the cartoon characters (blob, star, ghost, robot, cat, cloud)
    badges/             Badge + BadgeMark (the medal graphic)
    ui/                 small shared pieces (Pill, SplitHeading)
  lib/
    gsap.js             GSAP + plugin registration (import GSAP from here)
    palette.js          character colours (the UI itself sticks to ink, paper and --accent)
    pointer.js          shared cursor position the characters' eyes follow
  styles/
    tokens.css          colours, fonts (Geist / Geist Mono), spacing, borders
    global.css          base styles and shared helpers
```

## Common changes

**Add a member** — copy an entry in `src/data/members.js`, give it a unique `id` (used in the URL), and pick a character and its body colour. They show up in the grid, the year filters and on the playground automatically.

**Award a badge** — add the badge id to the member's `badges` array, e.g. `badges: ["first-meeting"]`.

**Create a new badge** — add an entry to `src/data/badges.js` (`id`, `name`, `description`, a short `glyph`, a palette `color`). Set `milestone` if it's tied to a journey milestone, and it'll show up on that milestone too.

**Move the journey forward** — set `done: true` on the milestone in `src/data/milestones.js`. The next unfinished one is marked "Up next" automatically. Add/remove milestones freely.

**New character** — add a key to `shapes` in `src/components/character/Character.jsx` (drawn on a 200×200 canvas; use `<Eye>` for eyes that follow the cursor), then use that key as a member's `avatar.char`.

**New page section** — create a folder under `src/components/`, then add it to the section list in `src/App.jsx` (and a link in `Header.jsx` if it needs one).

**Share a member's card** — every profile has a link: `/#member/<id>`.
