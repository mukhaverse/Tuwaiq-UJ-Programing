# Character Customization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anyone can suggest a new look (shape, colour, accessories) for a member from their profile, within limits set by that member's badge count. It goes live when an admin approves it.

**Architecture:** One shared rules module (`src/data/looks.ts`) decides what each member may change. The site uses it to lock the editor; the Worker uses it to validate suggestions and approvals. Accessories are SVG drawn in code, placed on each shape through a per-shape anchor table. Suggestions are stored in `look_edits` and approved from the admin panel, mirroring the bio-suggestion flow.

**Tech Stack:** React 19 + Vite, Motion, Hono on Cloudflare Workers, D1 + Drizzle, zod 4, Node 24's built-in test runner (`node --test`, runs `.ts` directly).

**Spec:** `docs/superpowers/specs/2026-10-18-character-customization-design.md`

## Global Constraints

- **Tiers:** 0 badges → nothing; 1 badge → shape only; 2+ badges → shape, colour, accessories.
- **Shapes:** blob, star, ghost, robot, cat, cloud, mushroom, flower, monitor for everyone. `sun` only for role `leader`; `planet` only for role `co-leader`.
- **Colours:** the 15 palette keys except `ink`. Originals: cream, plum, blush, tomato, butter, mint, sky. Survey shades: grape, bubblegum, cobalt, aqua, leaf, lemon, cherry, snow.
- **Starter accessories:** at most one per slot.
  - head: `cap`, `beanie`, `bow`, `headphones`
  - face: `glasses`, `shades`
  - neck: `scarf`, `bowtie`
- **Awarded extras:** `push-cap` (head), "Push your limits cap": purple with cyan pixel squares. No GitHub logo.
- **Server checks:** run when a look is sent and again when it's approved. Admins editing a member directly are not limited by badges, only by the catalog and one-per-slot.
- **Suggestion caps:** 5 per member per day and 100 in total per day, plus the `RL_WRITES` per-visitor limiter.
- **Migrations are additive.** Apply remotely with `npm run db:migrate:remote` before pushing.
- **Copy:**
  - "Earn 1 badge to change your shape"
  - "Earn 2 badges to unlock colours and accessories"
  - "Thanks! It shows up once it's approved."
  - "That's already their look."
- **Style:** match the surrounding code: sentence-style comments explaining why, no semicolon-free style changes, 2-space indent.
- **`git add`:** use explicit paths in every commit, never `-A`.

## Review Focus

1. **An awarded extra is taken back while the member is wearing it:** it should disappear from their character, not linger. This is pinned in Task 3 (content filter) and Task 5 (take-back strips it).
2. **A 1-badge suggestion was made against an older look** (an admin changed the member's colour since): approval compares against the current look, so it fails with "With one badge, only the shape can change." The look is not silently applied. Pinned in Task 1 (`checkLook` test) and Task 5 (manual approve check).
3. **An accessory id leaves the catalog, or a cached old bundle loads new data:** unknown ids are ignored everywhere, with no crash and no blank character. Pinned in Task 1 (`cleanWear` test) and Task 2 (Character renders with an unknown id).
4. **The editor on a phone** (390px wide, opened from a `#member/<id>` deep link): every control is reachable by scrolling inside the profile, and nothing overflows sideways. Pinned in Task 6's screenshot step.
5. **The leader moves away from the sun and wants it back:** `sun` stays in their shape list, and only theirs. Pinned in Task 1 (`shapesFor` test).

---

### Task 1: Rules module

**Files:**
- Create: `src/data/looks.ts`
- Create: `src/data/looks.test.ts`
- Modify: `package.json` (add `"test": "node --test \"src/**/*.test.ts\""` to scripts)

**Interfaces:**
- Produces, all exported from `src/data/looks.ts` (self-contained, imports nothing, only erasable TS syntax so Node runs it directly):
  - `type Role = "leader" | "co-leader" | "member"`
  - `type Slot = "head" | "face" | "neck"`
  - `type Look = { char: string; body: string; wear: string[] }`
  - `type LookMember = { role: Role; badges: number; accessories: string[]; current: Look }`
  - `const SHAPES: string[]` (all 11, in `Character.jsx` order)
  - `const COLOURS: string[]` (the 15, originals first)
  - `const ACCESSORIES: { id: string; name: string; slot: Slot; starter: boolean }[]`
  - `allowedChanges(badges: number): "none" | "shape" | "all"`
  - `shapesFor(role: Role): string[]`: the shared shapes, plus `sun` for the leader and `planet` for the co-leader
  - `canWear(m: { badges: number; accessories: string[] }, id: string): boolean`: starter needs 2+ badges; an extra needs to be in `accessories`
  - `checkWear(wear: string[]): string | null`: catalog and one-per-slot only (the admin check)
  - `cleanWear(wear: unknown, awarded: string[]): string[]`: keeps known ids, drops extras not in `awarded`, keeps the first per slot; non-arrays become `[]`
  - `sameLook(a: Look, b: Look): boolean`: wear is compared as a set
  - `checkLook(m: LookMember, look: Look): string | null`

- [ ] **Step 1: Write the failing tests in `src/data/looks.test.ts`**

  Use `import { test } from "node:test"`, `import assert from "node:assert/strict"`, and import from `./looks.ts`. Also import `{ palette }` from `../lib/palette.js`. Base member: `{ role: "member", badges: 2, accessories: [], current: { char: "blob", body: "butter", wear: [] } }`.

  ```ts
  test("colours are every palette key but ink", () => assert.deepEqual([...COLOURS].sort(), Object.keys(palette).filter((k) => k !== "ink").sort()));
  test("tiers", () => { assert.equal(allowedChanges(0), "none"); assert.equal(allowedChanges(1), "shape"); assert.equal(allowedChanges(5), "all"); });
  test("reserved shapes", () => { assert.ok(shapesFor("leader").includes("sun")); assert.ok(!shapesFor("leader").includes("planet")); assert.ok(!shapesFor("member").includes("sun")); assert.ok(shapesFor("co-leader").includes("planet")); });
  test("0 badges can't change anything", () => assert.equal(checkLook({ ...base, badges: 0 }, { char: "cat", body: "butter", wear: [] }), "Earn a badge first to change this character."));
  test("1 badge: shape ok", () => assert.equal(checkLook({ ...base, badges: 1 }, { char: "cat", body: "butter", wear: [] }), null));
  test("1 badge: colour refused", () => assert.equal(checkLook({ ...base, badges: 1 }, { char: "cat", body: "mint", wear: [] }), "With one badge, only the shape can change."));
  test("1 badge: accessory refused", () => assert.equal(checkLook({ ...base, badges: 1 }, { char: "blob", body: "butter", wear: ["cap"] }), "With one badge, only the shape can change."));
  test("2 badges: starter ok", () => assert.equal(checkLook(base, { char: "cat", body: "mint", wear: ["cap", "shades"] }), null));
  test("extra needs the award", () => { assert.equal(checkLook(base, { ...base.current, wear: ["push-cap"] }), "They don't have that accessory yet."); assert.equal(checkLook({ ...base, accessories: ["push-cap"] }, { ...base.current, wear: ["push-cap"] }), null); });
  test("one per slot", () => assert.equal(checkLook(base, { ...base.current, wear: ["cap", "beanie"] }), "Only one accessory per spot."));
  test("unknowns", () => { assert.equal(checkLook(base, { ...base.current, char: "dragon" }), "Unknown shape."); assert.equal(checkLook(base, { ...base.current, body: "ink" }), "Unknown colour."); assert.equal(checkLook(base, { ...base.current, wear: ["jetpack"] }), "Unknown accessory."); });
  test("reserved shape for a member", () => assert.equal(checkLook(base, { ...base.current, char: "sun" }), "That shape is only for the leader."));
  test("cleanWear drops unknown, unawarded and duplicates", () => assert.deepEqual(cleanWear(["jetpack", "push-cap", "cap", "beanie"], []), ["cap"]));
  test("cleanWear tolerates junk", () => assert.deepEqual(cleanWear("nope", []), []));
  test("sameLook ignores wear order", () => assert.ok(sameLook({ char: "a", body: "b", wear: ["cap", "shades"] }, { char: "a", body: "b", wear: ["shades", "cap"] })));
  ```

- [ ] **Step 2: Run the tests and check that they fail**

  Run: `npm test`

  Expected: FAIL, cannot find module `./looks.ts`.

- [ ] **Step 3: Implement `src/data/looks.ts`**

  - **Order of checks in `checkLook`:**
    1. unknown shape
    2. reserved shape: "That shape is only for the leader." / "…co-leader."
    3. unknown colour
    4. `checkWear` (unknown accessory, then one per spot)
    5. tier `none`
    6. tier `shape` with a colour or wear change
    7. an accessory that `canWear` refuses
  - **Accessory names:** Cap, Beanie, Bow, Headphones, Glasses, Sunglasses, Scarf, Bow tie, Push your limits cap.
  - **Comments:** a header comment saying the site and the Worker share this file, so the editor's locks and the server's checks can't disagree.

- [ ] **Step 4: Run the tests and check that they pass**

  Run: `npm test`

  Expected: all pass, 0 fail.

- [ ] **Step 5: Commit**

  ```bash
  git add src/data/looks.ts src/data/looks.test.ts package.json
  git commit -m "Look rules shared by the site and the Worker"
  ```

### Task 2: Accessory drawings on every shape

**Files:**
- Create: `src/components/character/accessories.jsx`
- Modify: `src/components/character/Character.jsx` (`wear` prop, anchor table)
- Create: `src/components/character/LookSheet.jsx` (dev-only contact sheet)
- Modify: `src/main.jsx` (render `LookSheet` instead of the app when `import.meta.env.DEV && location.hash === "#dev/looks"`)

**Interfaces:**
- Consumes: `ACCESSORIES`, `SHAPES` from `src/data/looks.ts`.
- Produces:
  - `<Character type body blink className style wear={string[]} />`: `wear` defaults to `[]`; unknown ids are skipped
  - `export const ANCHORS: Record<shape, { head: [x, y, s], face: [x, y, s], neck: [x, y, s] }>` in `Character.jsx`

- [ ] **Step 1: Write `accessories.jsx`**

  - Export `drawAccessory(id: string): JSX | null`.
  - Each accessory is drawn once at a standard size, centred on (0, 0) in the 200×200 space, about 90 units wide for head and neck items.
  - Use the characters' style: `INK` outline with `strokeWidth 4.5`, palette fills.
  - Anchor points:
    - head items: (0, 0) is where they sit on the crown of the head
    - face items: (0, 0) is the midpoint between the eyes, with the eyes about 48 apart
    - neck items: (0, 0) is the middle of the neckline
  - `push-cap`: purple (`#4f29b7`) cap with three cyan (`#57e3d8`) pixel squares on the front panel.

- [ ] **Step 2: Add `ANCHORS` and the `wear` prop to `Character.jsx`**

  - Read each shape's geometry from its drawing and set its anchors:
    - head: top-centre of the head outline
    - face: midpoint of the two `Eye` centres, with the scale from their distance ÷ 48 (for single-eyed `star`, centre on the eye)
    - neck: just below the mouth, or the bottom of the head
  - Render the worn items after the shape as `<g transform="translate(x y) scale(s)">`, in the order neck, face, head.

- [ ] **Step 3: Build the contact sheet**

  - `LookSheet.jsx` shows a grid: rows are `SHAPES`, columns are "none" plus each accessory.
  - Add one extra row: a blob wearing `["cap", "shades", "scarf"]`, then a blob with `["jetpack"]`, which must render as a plain blob.

- [ ] **Step 4: Check the fit by screenshot**

  - Run `npm run dev`.
  - Screenshot `http://localhost:5173/#dev/looks` at 1400px wide (headless Chrome, as in this session's screenshot script).
  - Expected: every accessory sits on every shape without floating off or covering the eyes, except glasses, which go over them. Adjust `ANCHORS` until the sheet passes. The `jetpack` blob is a plain blob.

- [ ] **Step 5: Lint, build, commit**

  - Run `npm run lint && npm run build`. Expected: no lint output, "built in".
  - Commit:

    ```bash
    git add src/components/character/accessories.jsx src/components/character/Character.jsx src/components/character/LookSheet.jsx src/main.jsx
    git commit -m "Accessories drawn on every character shape"
    ```

### Task 3: Database and content API

**Files:**
- Modify: `worker/db/schema.ts`
  - `members.avatarWear`: `text("avatar_wear", { mode: "json" }).$type<string[]>().notNull().default(sql\`'[]'\`)`
  - tables `memberAccessories` and `lookEdits`
- Create: `migrations/0009_*.sql` (generated)
- Modify: `worker/routes/content.ts`
- Modify: every public `<Character>` call site, to pass `wear={….avatar.wear}`:
  - `src/components/members/Members.jsx` (card and modal)
  - `src/components/intro/Hero.jsx`
  - `src/components/playground/Playground.jsx`
  - `src/components/builds/Desktop.jsx` (both)
  - `src/components/builds/RequestModal.jsx`
  - `src/admin/sections/Members.jsx` (list avatar)
  - `src/admin/sections/Projects.jsx`
  - `src/admin/survey/charts.jsx`

**Interfaces:**
- Consumes: `cleanWear` (Task 1), the `wear` prop (Task 2).
- Produces:
  - `memberAccessories`: `member_id` (FK members, cascade), `accessory_id` text, `awarded_at`, with PK (member_id, accessory_id)
  - `lookEdits`: `id` autoincrement, `member_id` (FK, cascade), `char`, `body`, `wear` json `string[]`, `status` enum `pending|approved|discarded` default `pending`, `created_at`, plus an index on `member_id`
  - `/api/content` members gain `avatar.wear: string[]` (`cleanWear(row.avatarWear, awarded)`) and `accessories: string[]` (awarded ids that are still in the catalog)

- [ ] **Step 1: Edit `schema.ts` and generate the migration**

  - Run `npm run db:generate`.
  - Expected: a new `migrations/0009_….sql` with one `ALTER TABLE members ADD avatar_wear` and two `CREATE TABLE` statements, and nothing else.

- [ ] **Step 2: Apply the migration locally**

  - Run `npm run db:migrate:local`.
  - Expected: "0009 … ✅".

- [ ] **Step 3: Update `content.ts`**

  - Add `memberAccessories` to the batch.
  - Build an `awarded` map the same way `awarded` badges are built today (rename that one `badgesOf` to avoid a clash).

- [ ] **Step 4: Pass `wear` at every call site listed above**

- [ ] **Step 5: Verify the API and the build**

  - Set test data in the local database:

    ```bash
    npx wrangler d1 execute pt-db --local --command "UPDATE members SET avatar_wear='[\"cap\",\"push-cap\"]' WHERE id='remas'"
    ```

  - Start the dev server, then run `curl -s localhost:5173/api/content | grep -o '"id":"remas"[^}]*}[^]]*]'`.
  - Expected: `"wear":["cap"]`. `push-cap` is dropped because it isn't awarded (Review Focus 1).
  - Then: `npm run typecheck && npm run lint && npm run build`, all clean.

- [ ] **Step 6: Commit**

  ```bash
  git add worker/db/schema.ts migrations/ worker/routes/content.ts src/components src/admin/sections/Members.jsx src/admin/sections/Projects.jsx src/admin/survey/charts.jsx
  git commit -m "Store worn and awarded accessories, and show them on every character"
  ```

### Task 4: Public "suggest a look" endpoint

**Files:**
- Create: `worker/routes/looks.ts`
- Modify: `worker/index.ts` (mount at `/looks` with `sameOrigin, rateLimit("RL_WRITES", "looks")`, next to bios)

**Interfaces:**
- Consumes: `checkLook`, `sameLook`, `cleanWear` from `../../src/data/looks` (Task 1); the `lookEdits` and `memberAccessories` tables (Task 3).
- Produces: `POST /api/looks/:memberId` with body `{ char, body, wear }`.
  - 201 `{ ok: true }` when stored
  - 400 `{ error }` when `checkLook` fails, or for "That's already their look."
  - 404 "Member not found"
  - 429 when over the caps

- [ ] **Step 1: Write `looks.ts`, modelled on `bios.ts`**

  - Validate the body with zod: `char` and `body` as strings of at most 30; `wear` as an array of strings of at most 30, max 3.
  - Load the member, their badge count and their awarded accessories in one `db.batch`.
  - Build `current` from the member's columns, with wear cleaned by `cleanWear`.
  - Apply the same per-member and total daily caps as bios, counting `look_edits`.
  - Insert the suggestion with `status` `pending`.

- [ ] **Step 2: Verify locally with curl**

  Use `-H "Origin: http://localhost:5173" -H "content-type: application/json"` on every request.

  - A member with 0 badges, `{"char":"cat","body":"butter","wear":[]}` → 400 "Earn a badge first to change this character."
  - `remas` (1 badge), shape change only → 201.
  - `remas` with `body` changed → 400 "With one badge, only the shape can change."
  - `remas` with her exact current look → 400 "That's already their look."
  - Six valid posts for `remas` → the sixth returns 429.

  Afterwards, clean up with:

  ```bash
  npx wrangler d1 execute pt-db --local --command "DELETE FROM look_edits"
  ```

- [ ] **Step 3: Typecheck and commit**

  - Run `npm run typecheck`. Expected: no output.
  - Commit:

    ```bash
    git add worker/routes/looks.ts worker/index.ts
    git commit -m "Public endpoint to suggest a look, checked against badge limits"
    ```

### Task 5: Admin API

**Files:**
- Modify: `worker/routes/admin/members.ts`
- Create: `worker/routes/admin/accessories.ts`
- Modify: `worker/routes/admin/index.ts` (mount `/accessories`)

**Interfaces:**
- Consumes: `checkLook`, `checkWear`, `cleanWear`, `ACCESSORIES` (Task 1); the tables (Task 3).
- Produces:
  - `PUT /api/admin/members/:id` and `POST /api/admin/members`: the body's `avatar` gains `wear: string[]` (default `[]`, refined with `checkWear`). There's also a new top-level `accessories: string[]` (default `[]`, only non-starter catalog ids). It's replaced like badges, keeping award dates. Ids it removes are also stripped from `avatarWear`.
  - `GET /api/admin/members/look-suggestions` → `{ counts: { [memberId]: number } }` (pending only)
  - `GET /api/admin/members/:id/look-edits` → `{ edits: { id, char, body, wear, status, createdAt }[] }`, newest first, at most 200
  - `POST /api/admin/members/:id/look-edits/:editId/approve`:
    - re-runs `checkLook` against current badges, accessories and look
    - 400 `{ error }` if it fails
    - otherwise, in one batch, writes the avatar columns and `updatedAt`, and sets status `approved`
  - `POST /api/admin/members/:id/look-edits/:editId/discard` → status `discarded`
  - `DELETE /api/admin/members/:id/look-edits`
  - `POST /api/admin/accessories/:id/everyone`: inserts for every member, ignoring ones who already have it. 404 for an unknown or starter id.
  - `DELETE /api/admin/accessories/:id/everyone`: deletes the awards and strips the id from every member's `avatar_wear`, using SQLite `json_each`/`json_group_array` or a read-modify-write batch.

- [ ] **Step 1: Implement the routes in the files above**

  - Register `look-suggestions` before `/:id` routes, as `bio-suggestions` is.

- [ ] **Step 2: Verify locally with the admin panel**

  - Run `npm run dev` with `DEV_LOGIN=true` in `.dev.vars` and sign in at `/admin`.
  - Check in the browser console with `fetch("/api/admin/…")`:
    1. Post a shape-only suggestion for `remas` (Task 4 curl), then approve it → `/api/content` shows her new shape.
    2. Post another shape-only suggestion for `remas`. Change her colour through the admin `PUT`, then approve that suggestion → 400 "With one badge, only the shape can change." (Review Focus 2.)
    3. `POST /api/admin/accessories/push-cap/everyone`, then `PUT` remas wearing `push-cap`, then `DELETE …/everyone` → her `avatar.wear` no longer has `push-cap`.
    4. `POST /api/admin/accessories/cap/everyone` → 404.

- [ ] **Step 3: Typecheck and commit**

  - Run `npm run typecheck`. Expected: no output.
  - Commit:

    ```bash
    git add worker/routes/admin/members.ts worker/routes/admin/accessories.ts worker/routes/admin/index.ts
    git commit -m "Admin API: approve looks, award accessories, give to everyone"
    ```

### Task 6: The Customize editor on profiles

**Files:**
- Create: `src/components/members/LookEditor.jsx`
- Modify: `src/components/members/Members.jsx` (`MemberModal`: Customize button, and an `editing` state that swaps the body for the editor and drives the big character preview)
- Modify: `src/components/members/Members.css` (`.look__*` styles)

**Interfaces:**
- Consumes:
  - `allowedChanges`, `shapesFor`, `COLOURS`, `ACCESSORIES`, `canWear` (Task 1)
  - `<Character wear>` (Task 2)
  - `member.accessories` and `member.avatar.wear` (Task 3)
  - `POST /api/looks/:id` (Task 4)
- Produces: `<LookEditor member draft onDraft onDone />`
  - `draft` is a `Look`
  - `onDraft(look)` updates the preview in `MemberModal`
  - `onDone(sent: boolean)` closes the editor

- [ ] **Step 1: Build `LookEditor`**

  - **Sections:** Shape (tiles drawn with the draft colour), Colour (swatches), and Accessories (one row per slot, each with a "None" tile).
  - **Which accessories show:** starter items always; extras only if `member.accessories` has them.
  - **Locked controls** are disabled buttons with a padlock and `aria-disabled`. Above them is a hint line: tier `none` → "Earn 1 badge to change your shape". Tier `shape` → "Earn 2 badges to unlock colours and accessories" over the colour and accessory sections.
  - **Buttons:**
    - "Send for approval": a `Pill`, disabled while the draft equals the current look
    - "Cancel": resets the draft and calls `onDone(false)`
  - **Responses:**
    - success: show "Thanks! It shows up once it's approved." in a `role="status"` line, the same way `Bio` does
    - error: show the server's `error` text
  - **Selection markup:** radio-like `aria-pressed` buttons, as in the admin picker.

- [ ] **Step 2: Wire it into `MemberModal`**

  - Place a "Customize" button (class `modal__edit mono`) under the badges.
  - While editing, `.modal__char` renders the draft.
  - The editor shows even at tier `none`, so people can see what they'd unlock.

- [ ] **Step 3: Check it by screenshot at 1280×900 and 390×844**

  - Open `/#member/remas` (1 badge) and a 0-badge member, click Customize, and screenshot each.
  - Expected: the locks and hints match the tier; nothing overflows at 390px (Review Focus 4); the shape tiles update the big preview.
  - Send one look and expect the thanks line.
  - Clean up: `DELETE FROM look_edits` (local).

- [ ] **Step 4: Lint, build, commit**

  - Run `npm run lint && npm run build`. Expected: clean.
  - Commit:

    ```bash
    git add src/components/members/LookEditor.jsx src/components/members/Members.jsx src/components/members/Members.css
    git commit -m "Customize editor on member profiles"
    ```

### Task 7: Admin panel UI

**Files:**
- Modify: `src/admin/sections/Members.jsx`
  - "· N new looks" in the list, from `look-suggestions`, next to the bio count
  - `MemberForm` gains `wear` (accessory picker, one per slot, all catalog items, no badge limits) and `accessories` (checkbox chips of extras, like badges), and sends both
  - A new `LookHistory` component, modelled on `BioHistory`: current character and suggested character side by side, with Approve and Discard on pending ones, plus a Clear history `ConfirmButton`. Approving calls `onSaved` so the form reloads.
- Modify: `src/admin/sections/Badges.jsx`: an "Accessories" panel listing the awarded extras, each with "Give to everyone" and "Take back from everyone" `ConfirmButton`s and an "N have it" count from `data.members`
- Modify: `src/admin/admin.css` (only what the new pieces need, reusing `adm-chips`, `adm-chars`, `adm-preview`)

**Interfaces:**
- Consumes: Task 5 endpoints, `ACCESSORIES` (Task 1), `<Character wear>` (Task 2).

- [ ] **Step 1: Implement the pieces above**

- [ ] **Step 2: Verify locally**

  - Sign in with the dev login.
  - Suggest a look for `remas` from her profile, then check that the admin list shows "· 1 new look". Approve it, then check that her card on the site shows it.
  - Give `push-cap` to everyone, then check that "30 have it" shows. Put it on a member and save, then check that the card shows the cap.
  - Take it back from everyone, then check that the cap is gone from the card.

- [ ] **Step 3: Lint, build, commit**

  - Run `npm run lint && npm run build`. Expected: clean.
  - Commit:

    ```bash
    git add src/admin/sections/Members.jsx src/admin/sections/Badges.jsx src/admin/admin.css
    git commit -m "Admin: approve looks and award accessories"
    ```

### Task 8: Docs and rollout

**Files:**
- Modify: `README.md`
  - Under "Common changes", a **Character looks** bullet: tiers, where suggestions are approved, accessories and "Give to everyone"
  - Under "New character", how to add an accessory: catalog entry in `looks.ts`, drawing in `accessories.jsx`, then check `#dev/looks`
  - Add `src/data/looks.ts` and `worker/routes/looks.ts` to the file map

- [ ] **Step 1: Update the README and commit**

  ```bash
  git add README.md
  git commit -m "README: character looks and accessories"
  ```

- [ ] **Step 2: Final checks**

  Run `npm test && npm run lint && npm run typecheck && npm run build`. Expected: all pass.

- [ ] **Step 3: Rollout (confirm with the user first; this touches the live site)**

  1. Run `npm run db:migrate:remote`. Expected: 0009 applied.
  2. Run `git push origin main`.
  3. After Cloudflare's build finishes, check that `curl -s https://tuwaiq-uj-programing.shumokhalsharif.workers.dev/api/content` shows `"wear":[]` on members.
