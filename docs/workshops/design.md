# Workshop virtual theater — technical design

Linear: [COR-12](https://linear.app/coral-studio/issue/COR-12/add-workshop-virtual-theater)
Spec: [workshops-spec.md](./workshops-spec.md)
Mock: [Workshop Rehearsal Room](https://claude.ai/code/artifact/fb8a73b9-3f4e-4b30-adb2-26ce8db5288f)
(the mock is private to this Claude session — share it from its page's share menu before linking
teammates to it)

## Prior art / reuse

This mirrors [docs/users-roles-login/plan.md](../users-roles-login/plan.md)'s stack, which already
ships in this repo (`users`/`accounts`/`sessions` tables, NextAuth v5 + Drizzle + Postgres). Nothing
below reopens that work — it's the foundation this feature is built on.

Specific patterns being copied rather than reinvented:
- **Page shell**: `app/admin/settings/page.tsx`'s back-link + avatar header and split
  nav/content body is the shell for `/workshops` (see the spec's "Page layout").
- **List/detail split**: `components/admin/users-view.tsx`'s client-side selection state is the
  model for the sidebar-selects-a-workshop interaction.
- **Server Action auth guard**: `app/admin/users/actions.ts`'s `requireAdmin()` (re-check the
  caller server-side on every action, never trust the page's render-time gate) is the model for
  this feature's `requireMember()` (below).
- **Confirm-before-destructive dialog**: `components/admin/delete-user-button.tsx`'s
  `<dialog>` + bound Server Action is the model for the workshop card's Delete confirmation.
- **Click-outside dropdown**: `components/user-menu.tsx`'s `useRef` + `mousedown` listener is the
  model for the workshop card's `⋮` overflow menu.

## Visual theme

`/workshops` is dark and set in a standard system sans-serif — both deliberate exceptions scoped
to this page only, not a site-wide change. Dark surfaces reuse `app/globals.css`'s existing
`ink`/`ink-foreground` tokens (already used for the hero/login surfaces) as the page
background/text, plus one new token added alongside them, `--color-ink-card: #241d18` — the
elevated surface for sidebar cards, the details panel, dropdown menus, and the script panel, the
same role `card`/`border` play against `background` in the light theme. Headings on this page
skip the site's usual `font-serif` (Fraunces) and stay on the default sans stack. Every other page
keeps the light theme and Fraunces headings untouched.

## Data model

Two new tables in `lib/database/schema.ts`, following the existing `users` table's conventions
(`text('id').primaryKey().$defaultFn(() => crypto.randomUUID())`, `timestamp(..., { mode: 'date' })`):

```ts
export const workshops = pgTable('workshops', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  title: text('title').default('Untitled workshop').notNull(),
  scriptSlug: text('script_slug'), // filename stem under workshops/scripts/ -- see lib/workshops/scripts.ts. Null until a script is attached.
  rehearsalAt: timestamp('rehearsal_at', { mode: 'date' }),
  createdById: text('created_by_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
})

export const workshopMembers = pgTable(
  'workshop_members',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    workshopId: text('workshop_id')
      .notNull()
      .references(() => workshops.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type', { enum: ['viewer', 'actor'] }).default('actor').notNull(),
    part: text('part'), // optional -- attribute 2c
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
  },
  (table) => [
    { membershipKey: uniqueIndex('workshop_members_workshop_user_idx').on(table.workshopId, table.userId) },
  ]
)
```

No `relations()` calls — this schema file doesn't use Drizzle's relational query API anywhere
today, so joins stay explicit `.leftJoin(users, eq(workshopMembers.userId, users.id))`, matching
the existing style.

This project applies schema changes with `pnpm db:push` (no migration files are checked in —
`lib/database/migrations/` doesn't exist yet), so PR-1 below is just the schema edit + a push, not
a migration file.

## Access control

`requireMember(workshopId)`, added to `app/workshops/actions.ts` alongside the actions (same
placement as `requireAdmin()` in `app/admin/users/actions.ts`):

```ts
async function requireMember(workshopId: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Unauthorized')

  const [membership] = await db
    .select({ id: workshopMembers.id })
    .from(workshopMembers)
    .where(and(eq(workshopMembers.workshopId, workshopId), eq(workshopMembers.userId, session.user.id)))
    .limit(1)

  if (!membership) throw new Error('Unauthorized')
  return session.user as { id: string }
}
```

**Design decision — admin's spec-given visibility (attribute 9) is read-only for workshops they
don't belong to.** The spec says admins can *see* all workshops, not that they inherit every
member power. Every mutating action (add/remove member, rename, delete, set script, set
rehearsal date) goes through `requireMember()`, not a role check — an admin who wants to act on a
workshop has to be a member of it, same as anyone else. This isn't explicit in the spec; flagging
it as a real judgment call rather than burying it, since "admin can see them all" could plausibly
have meant "and manage them all" instead.

## Routes & data flow

- **`app/workshops/page.tsx`** (server component): redirect `/login` if signed out. Fetch the
  caller's workshop list (`listWorkshopsForUser`, below); if empty, render an empty state ("+ New
  workshop" only, no list/detail); otherwise redirect to `/workshops/[id]` for the most recently
  created one.
- **`app/workshops/[id]/page.tsx`** (server component): same sign-in gate. Fetch the sidebar list
  plus the selected workshop's detail (`getWorkshopDetail`); if the id doesn't exist, or the
  caller is neither a member nor an admin, redirect to `/workshops`. Passes both down to
  `<WorkshopShell>`.
- **`app/workshops/actions.ts`** (`'use server'`): `createWorkshop(formData)` — backs the New
  workshop modal; reads an optional `title`, `scriptSlug` (validated against
  `listAvailableScripts()`), and a `members` field (a JSON array of `{userId, type, part}`,
  re-validated against `listActiveUsers()` server-side rather than trusted from the client), and
  inserts the `workshops` row plus every `workshopMembers` row — the caller (`type: 'actor'`,
  attribute 5) and whoever else was picked — in one call. Then `addMember(workshopId, formData)`,
  `removeMember(workshopId, memberId)`, `updateMember(workshopId, memberId, formData)` (type +
  part together), `setRehearsalDate(workshopId, formData)`, `setWorkshopScript(workshopId,
  formData)`, `leaveWorkshop(workshopId)`, `deleteWorkshop(workshopId)`. Each starts with
  `requireMember()` except `createWorkshop()` (nothing to be a member of yet — just requires
  `auth()`). `renameWorkshop()`/`duplicateWorkshop()` existed briefly but were removed once the
  card menu dropped Rename/Duplicate in favor of + Add user/Schedule Rehearsal.

**Design decision — leaving as the last member deletes the workshop.** Attribute 8 ("deleting a
workshop can be done only if the user is the last one in the group") implies a workshop should
never sit around with zero members. Rather than leave that as an unreachable dead end,
`leaveWorkshop()` deletes the workshop when the caller is the last member instead of leaving an
orphaned row; `deleteWorkshop()` becomes a thin alias asserting the same last-member condition.
Worth confirming this reading is right before PR-5.

## `listWorkshopsForUser` / `getWorkshopDetail` (`lib/workshops/queries.ts`)

```ts
async function listWorkshopsForUser(userId: string, isAdmin: boolean) {
  // isAdmin: select every row from `workshops`, newest first.
  // otherwise: join workshopMembers on userId = userId, newest first.
  // Each row: { id, title, rehearsalAt, memberCount }.
}

async function getWorkshopDetail(workshopId: string) {
  // { id, title, scriptSlug, rehearsalAt, createdById,
  //   members: { id, userId, name, email, type, part }[] }
  // members via workshopMembers leftJoin users.
}
```

## Components (`components/workshops/`)

**Height chain, for any of the panels below that scroll internally**: `workshop-shell.tsx`'s
root is `h-screen overflow-hidden` (not `min-h-screen` — a minimum, not a ceiling, so nothing
below it ever becomes a bounded box otherwise) with `min-h-0` threaded through every `flex-1`
level down to wherever a panel needs its own `overflow-y-auto`. Both pieces are required: the
ceiling makes a bounded box possible, but each flex item's default `min-height: auto` still
refuses to shrink below its content's size and silently defeats the overflow without the
explicit `min-h-0` override at that level too.

| File | Responsibility |
|---|---|
| `workshop-shell.tsx` | Server Component; lays out the header (back link, centered Schedule Rehearsal/+ Add user, avatar), sidebar, and content panels. The 'use client' boundary stays as deep as possible — pushed down into `workshop-sidebar-list.tsx` (search + resize state), `workshop-card-menu.tsx` (menu open state), and `script-panel.tsx` (resize state) individually, rather than one client wrapper owning all of it. Accepts `selected: WorkshopDetail | null` — with none selected (no workshops, or `/workshops` before it redirects), it renders the same shell with an empty sidebar and a "nothing selected" content area instead of a separate empty-state page. |
| `workshop-sidebar-list.tsx` (`'use client'`) | Search input + `WorkshopFormDialog` (`mode="create"`) row, then the filtered `WorkshopCard` list. Owns its own width (`useState`, drag-resized via a handle on its right edge using Pointer Events + `setPointerCapture` — no window-level listeners to clean up). The handle's grip mark is `opacity-0` until hovered (`group-hover`); it's a drag affordance the pointer reveals, not a permanent fixture. |
| `user-picker.tsx` (`'use client'`) | Reusable typeable-and-pickable user field — a hand-built combobox, not native `input[list]`+`<datalist>` (tried first; renders as unstyled, name-less browser chrome that can't be styled to match the app). Select-styled closed state; click opens a live-filtered (name or email substring), app-styled dropdown; picking closes it. Controlled and dumb: `selected: AddableUser \| null` is what to display, `onSelect(user)` fires on a pick, and the parent alone decides what happens next. `add-member-dialog.tsx` keeps `selected` (a persistent single choice) and passes `name="email"` — a hidden input carries the actual submitted email while the visible input shows the picked name, so the two can differ. `workshop-form-dialog.tsx` always passes `selected={null}` and pushes every pick onto a draft list instead, which is what makes the control reset to its placeholder after each one. |
| `workshop-form-dialog.tsx` (`'use client'`) | One dialog, two modes, both against the same fields: title, an optional script `<select>`, and a `UserPicker`-backed running list of people to add (each with its own type/part, removable). `mode="create"` (the sidebar's "+ New workshop", default trigger button) submits `createWorkshop(formData)`; `mode="edit"` (each card's kebab-menu **Edit** — first item, above + Add user/Schedule Rehearsal) pre-fills title/script from the workshop's current values via `initialTitle`/`initialScriptSlug`, submits `updateWorkshop(workshopId, formData)`, and — like `add-member-dialog.tsx`/`schedule-rehearsal-dialog.tsx` — is `forwardRef` + `hideTrigger` so it can be mounted outside the dropdown that opens it. Edit's "add people" list is additive only: it doesn't show or let you remove the workshop's *existing* members (that's still `workshop-details-panel.tsx`'s job) — only picks made in this dialog get added on Save. |
| `workshop-card.tsx` | One sidebar card (Server Component — no local state of its own). The `⋮` menu button is a positioned sibling of the card's `Link`, not a descendant — nesting a `<button>` inside an `<a>` is invalid HTML. |
| `workshop-card-menu.tsx` (`'use client'`) | Owns the `⋮` dropdown's open/closed state (click-outside via `user-menu.tsx`'s pattern). Menu items: **Edit**, **Add user**, **Schedule Rehearsal** (the latter two open the same dialogs the header uses, scoped to this card's workshop — the header's own standalone button keeps its "+", the menu item doesn't need one), then **Leave workshop** or **Delete** — Delete only when `memberCount === 1`, so the UI can't attempt an action attribute 8 would reject server-side. |
| `workshop-details-panel.tsx` | Group list (member rows + remove) and a read-only rehearsal-date display — editing happens via the Schedule Rehearsal dialog, not inline here. Scrolls internally (`overflow-y-auto` + `min-h-0`, see the height-chain note above) and carries a `min-w-[280px]` floor matching `script-panel.tsx`'s own `MIN_WIDTH`, since flexbox would otherwise let it shrink to nothing as the script panel (max width 1100px) is dragged wider. Its rows (`workshop-member-row.tsx`) disable the Part field whenever Type is set to Viewer — a part is an actor concept (attribute 2c), so it shouldn't be editable, or submitted, for a viewer. `add-member-dialog.tsx` and `workshop-form-dialog.tsx`'s own type/part fields follow the same rule. |
| `add-member-dialog.tsx` / `schedule-rehearsal-dialog.tsx` | `<dialog>`-based forms binding `addMember` / `setRehearsalDate`, modeled on `delete-user-button.tsx`'s dialog. Each is `forwardRef` exposing an imperative `open()` and accepts a `hideTrigger` prop, since both are used two ways: with their own default button (the header) and as an always-mounted instance opened imperatively from `workshop-card-menu.tsx`'s menu item — the `<dialog>` can't be a descendant of the dropdown it's triggered from, since a `<dialog>` opened via `showModal()` force-closes the instant it (or an ancestor) stops being rendered, which the dropdown does the moment the click that opened it also closes the menu. `add-member-dialog.tsx` renders `<UserPicker>` (above) over every existing **active** user (`listActiveUsers()`, `lib/workshops/queries.ts`) rather than requiring the caller to type an exact email — no invite-by-email, matching attribute 2a's "userId or user name (a unique identifier)." The submitted value is still the user's email, so `addMember()`'s server-side lookup is unchanged. The selected workshop's own picker excludes its current members (cheap — already loaded); other cards' picker in the sidebar (opened from their `⋮` menu) shows the unfiltered list, since their membership isn't loaded there — harmless, since `addMember()` already no-ops (`onConflictDoNothing`) on an existing member. |
| `script-panel.tsx` (`'use client'`) | Always expanded (no collapse toggle) — renders `<ScriptFlow>` when a script is attached, else the attach-a-script picker. Owns its own width the same way `workshop-sidebar-list.tsx` owns its own (Pointer Events + `setPointerCapture`, a hover-revealed grip), mirrored onto its left edge — dragging left grows it (`startWidth - deltaX`, the opposite sign from the sidebar's right-edge handle). Its content area scrolls internally (`overflow-y-auto`) with the scrollbar hidden (all three browser-specific rules: `scrollbar-width`, `-ms-overflow-style`, `::-webkit-scrollbar`) and `overscroll-contain` so wheel scrolling never chains up to move the page once the script content hits its own top/bottom. |
| `script-flow.tsx` | Pure render of `script_flow` entries: `dialogue` lines colored per character, `action` lines italic. |

## Script rendering (`lib/workshops/`)

- **`scripts.ts`** (server-only): `listAvailableScripts()` reads the `.json` files directly out of
  `workshops/scripts/` and returns `{ slug, title, scene }[]`; `getScript(slug)` reads and parses
  one. No new dependency — this project doesn't use a schema-validation library anywhere
  (`lib/validation.ts` is hand-rolled checks), so `getScript` validates the parsed shape with a
  small manual type guard in the same style, not a new `zod` dependency.
- **`script-colors.ts`**: `assignCharacterColors(characters: string[])` — deterministic, by order
  of first appearance, cycling a fixed set of oklch hues at the mock's `78% 0.11` lightness/chroma
  so new characters keep getting distinct, harmonious colors.

**Known content gap, not a code problem**: of the six scripts under `workshops/scripts/`, only
`AWAKWNING-LEONARD-AND-SAYER.json` actually exists as a `.json` file today — the rest are PDFs or a
`.docx`. `listAvailableScripts()` will only ever offer what's there, so at launch the script picker
has exactly one real entry. The mock's sidebar cards ("Marriage Story," "Fleabag S2E5") are
illustrative, not implying those scripts are usable yet — more `.json` conversions are a content
task, not part of this plan.

## Nav integration

`components/site-header.tsx`'s `navLinks` array (module-level, line 8) has a static `{ label:
'Workshops', href: '/#workshops' }`. Per the spec's "Accessing the workshop page," this needs to
become conditional on `isLoggedIn` (already computed in the component via `useSession()`), so it
has to move from the module-level constant into the component body:

```ts
const navLinks = [
  { label: 'About', href: '/#about' },
  { label: 'Workshops', href: isLoggedIn ? '/workshops' : '/#workshops' },
  { label: 'Communities', href: '/#community' },
  { label: 'Contact', href: '/#contact' },
]
```

Both the desktop and mobile nav already map over this one array, so the change is confined to
where the array is defined.

## Open questions worth a second look before implementation starts

1. **Admin visibility = read-only for non-member workshops** (above) — plausible but not
   spec-stated; confirm before PR-1 locks in the schema/action split around it.
2. **Leave-as-last-member auto-deletes** (above) — same status: a reasonable reading of attribute
   8, not a stated rule.
3. **Script source is the bundled `workshops/scripts/*.json` library**, not a per-workshop upload —
   the spec never describes an upload flow, and "script editing is out of scope for COR-12"
   (workshops-spec.md) suggests attaching a pre-made script is the intended scope. Worth
   confirming before PR-4, since it's the one area where the spec is genuinely silent on where
   the JSON comes from.
