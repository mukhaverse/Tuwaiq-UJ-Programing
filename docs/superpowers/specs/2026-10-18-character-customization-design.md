# Character customization

Members change their own character's look. Badges unlock how much they can change, so the look is a reward for earning them.

## Decisions so far

- **No member sign-in.** Anyone can suggest a look for a member from that member's profile, within that member's limits. Nothing goes live until an admin approves it, the same way bios are suggested today.
- **Accessories come in two kinds:** a starter set that every member with 2+ badges can wear, and extras that an admin awards to one member or to everyone at once.
- **Accessories are drawn in code**, in the characters' ink-outline style, not uploaded as images. A new accessory is a small code change.

## The rules

| Badges | Can change |
| --- | --- |
| 0 | Nothing. The editor opens, but everything is locked: "Earn 1 badge to change your shape". |
| 1 | Shape. Colours and accessories show as locked: "Earn 2 badges to unlock colours and accessories". |
| 2+ | Shape, colour and accessories. |

- **Shapes:** blob, star, ghost, robot, cat, cloud, mushroom, flower, monitor. Sun is only for the leader and planet only for the co-leader. They can also switch to any other shape.
- **Colours:** every colour in `palette.js` except ink, which would hide the outline and face. That's 15:
  - the 7 originals: cream, plum, blush, tomato, butter, mint, sky
  - the 8 survey shades: grape, bubblegum, cobalt, aqua, leaf, lemon, cherry, snow
- **Accessories:** one per spot, at most three at once.
  - **Head:** cap, beanie, bow, headphones
  - **Face:** round glasses, sunglasses
  - **Neck:** scarf, bow tie

  These eight are the starter set. Awarded extras use the same spots. The first one is `push-cap`, a purple cap with cyan pixel squares in the style of the Push Your Limits poster, for the 19 Oct workshop.
- **What "within limits" means** depends on the member's badge count when the look is sent:
  - **1 badge:** only the shape may differ from their current look. Colour and accessories must stay as they are.
  - **2+ badges:** anything, as long as each accessory is in the starter set or was awarded to them.
- **Checked on the server twice:** when a look is sent, and again when an admin approves it (badges can be taken away in between). Approving a look that's no longer allowed fails and says why.

## What members see

- Every profile gets a **Customize** button next to "Suggest a new bio".
- It opens an editor inside the profile:
  - a large live preview of the character
  - shape tiles, colour swatches, and accessory tiles grouped by spot, each with a "none" option
  - padlocks on whatever is locked, and the hint for the next unlock
- Awarded extras the member doesn't have are not shown. Starter accessories are shown, locked below 2 badges.
- **Send for approval** shows "Thanks! It shows up once it's approved." Cancel puts the preview back.
- Once approved, the new look shows everywhere the character appears: cards, the profile, the hero's mountain, the playground, the builds desktop, the request form, and the admin panel.

## What admins see

- **Members list:** "· 2 new looks" next to a member, like the new-bio count.
- **Member page → Look suggestions:** each suggestion shows the current and suggested characters side by side, with **Approve** and **Discard**. Approve writes the look and marks the suggestion approved. Discard just marks it. A **Clear history** button deletes them all, like bios.
- **Member page form:** admins can set the shape, colour and accessories freely, with no badge limits, the way they set avatars today. They also get a list of awarded extras with checkboxes, the same way badges are awarded.
- **Badges tab → Accessories panel:** lists the awarded extras. Each has **Give to everyone** (awards it to every current member) and **Take back from everyone**. Members added later don't get it automatically.

## How it's built

**Shared rules module: `src/data/looks.ts`.** Plain TypeScript, imported by both the site (Vite handles `.ts`) and the Worker. It holds:
- the shape list, which shapes are reserved and for which role, and the allowed colours
- the accessory catalog: `id`, `name`, `slot` (`head` | `face` | `neck`), and `starter` (true or false)
- `allowedChanges(badgeCount)`, which returns `"none" | "shape" | "all"`
- `checkLook(member, look)`, which returns an error message or `null`

The site uses it to lock the editor, and the Worker uses it to validate, so the two can't disagree.

**Drawing: `src/components/character/`.**
- `Character` takes a new `wear` prop (accessory ids) and draws them inside the same 200×200 SVG, after the body.
- `accessories.jsx` draws each accessory once, at a standard size centred on (0, 0).
- A per-shape anchor table gives each shape its head point, eye line and neck point, plus a scale, so one drawing fits every shape. Examples: the robot's head is the top of its box below the antenna; the cat's sits between its ears; the star's face sits lower down.
- Shapes without a neck (blob, star, ghost…) put neck items just under the mouth.
- Every `<Character>` call site passes `wear={avatar.wear}`.

**Database: one additive migration.**
- `members.avatar_wear`: a JSON list of accessory ids, default `[]`.
- `member_accessories (member_id, accessory_id, awarded_at)`: awarded extras, with `(member_id, accessory_id)` as the primary key. Accessory ids aren't foreign keys because the catalog lives in code. An id that leaves the catalog is ignored when reading.
- `look_edits (id, member_id, char, body, wear, status, created_at)`: `status` is `pending`, `approved` or `discarded`.

**API.**
- `POST /api/looks/:memberId` with `{ char, body, wear }`, public:
  - checked with `checkLook`
  - rate limited with `RL_WRITES`, the same as bios
  - capped at 5 per member per day and 100 in total per day
  - a look identical to the current one is refused ("That's already their look")
- `GET /api/content`: each member gains `avatar.wear` and `accessories`, the ids of their awarded extras. Both are public anyway, since they show on the character.
- Admin, under `/api/admin/members`:
  - `GET look-suggestions`: counts of pending looks per member
  - `GET :id/look-edits`
  - `POST :id/look-edits/:editId/approve`: re-runs `checkLook` against current badges
  - `POST :id/look-edits/:editId/discard`
  - `DELETE :id/look-edits`
  - `PUT :id/accessories`: the awarded extras
- Admin, under `/api/admin/accessories/:id`:
  - `POST everyone`
  - `DELETE everyone`
- The admin member update (`PUT /api/admin/members/:id`) also accepts `wear`. Each id must be in the catalog, with at most one per spot. No badge limits apply to admins.

## Out of scope

- Member accounts or sign-in.
- Uploading accessories from the admin panel.
- Animated accessories.
- Accessories automatically granted to members added later.
- Changing the playground quote from the editor.

## Checking it works

- `npm run lint`, `npm run typecheck`, `npm run build`.
- **Rules:** a small script runs `checkLook` over every badge tier: 0, 1 and 2+ badges; reserved shapes by role; a starter accessory below and above 2 badges; an awarded extra with and without the award; two accessories in one spot; an unknown id.
- **Fit:** a dev-only contact sheet (`npm run dev`, `/#dev/looks`) draws every shape wearing every accessory. Screenshots of it are reviewed for fit before shipping.
- **End to end, locally:**
  - for a member with 0, 1 and 2 badges: open the editor, check the locks, send a look
  - approve it in the admin panel, and see it on the card, hero and playground
  - remove a badge, then check that approving an older suggestion fails with a clear message
- **Rollout:** run `npm run db:migrate:remote` before pushing, because the deploy doesn't run migrations.
