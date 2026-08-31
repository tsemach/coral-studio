# Workshop virtual theater — implementation plan

Linear: [COR-12](https://linear.app/coral-studio/issue/COR-12/add-workshop-virtual-theater)
Spec: [workshops-spec.md](./workshops-spec.md)
Design: [design.md](./design.md)

## Branch / PR strategy

Same reasoning as [docs/users-roles-login/plan.md](../users-roles-login/plan.md): this is a stack,
not independent branches, because each PR's UI builds on the previous one's.

```
master
  └─ PR-0  design docs (this doc + design.md + workshops-spec.md) — merges to master
       └─ PR-1  workshop data model
            └─ PR-2  workshop page shell (list, create, select, empty state)
                 └─ PR-3  group + rehearsal management
                      └─ PR-4  script panel
                           └─ PR-5  card actions (rename/duplicate/leave/delete) + nav integration
```

Only PR-0 ever merges to `master`; every other PR merges into the branch directly below it in the
stack, so each PR's diff stays reviewable on its own even though the work is sequential.

### Merge sequence

Merges run leaf-to-root, i.e. in the opposite order from how the branches were created:

1. PR-5 → PR-4
2. PR-4 (now carrying PR-4+PR-5) → PR-3
3. PR-3 (now carrying PR-3+PR-4+PR-5) → PR-2
4. PR-2 (now carrying PR-2 through PR-5) → PR-1
5. PR-1 (now carrying PR-1 through PR-5) → PR-0
6. **PR-0 → `master`** — the user does this step, not Claude.

By step 5, PR-0's branch holds every commit in the stack; step 6 is what actually brings the
feature into `master`.

**These aren't filed as separate Linear issues yet** (unlike COR-5's stack, which got COR-7
through COR-11) — say the word and I'll split them out under COR-12.

## PR breakdown

### PR-0: Design docs
`docs/workshops/workshops-spec.md`, `docs/workshops/design.md`, `docs/workshops/plan.md` (this
file). No app code — establishes the design this whole stack implements, mirroring COR-5's PR-0.

### PR-1: Data model
1. `lib/database/schema.ts`: add the `workshops` and `workshopMembers` tables (see
   [design.md](./design.md#data-model) for the exact columns).
2. `lib/workshops/queries.ts`: `listWorkshopsForUser(userId, isAdmin)`, `getWorkshopDetail(workshopId)`.
3. `pnpm db:push` to apply the schema (no migration file — this repo doesn't check those in).

No UI in this PR — it's the foundation PR-2 onward builds on.

### PR-2: Workshop page shell
4. `app/workshops/page.tsx`: sign-in gate, empty-state render, redirect to the most recent
   workshop.
5. `app/workshops/[id]/page.tsx`: sign-in gate, not-found/not-authorized redirect, fetches list +
   detail, renders `<WorkshopShell>`.
6. `app/workshops/actions.ts`: `requireMember()` guard (design.md) + `createWorkshop()` — inserts
   the workshop row and a `workshopMembers` row for the caller in the same call (attribute 5).
7. `components/workshops/workshop-shell.tsx`: header (Back link + `UserMenu`, reused as-is),
   sidebar/content split, search-query state.
8. `components/workshops/workshop-sidebar-list.tsx`: search input + New-workshop button row +
   card list (client-side filter by title on the `search-input` from the mock).
9. `components/workshops/workshop-card.tsx`: static card, selected-state styling
   (`border-primary`), no menu yet (that's PR-5).

Deliverable: a signed-in user can open `/workshops`, see their workshops (or none), create one,
and select cards in the sidebar — no group/script functionality yet.

### PR-3: Group + rehearsal management
10. `components/workshops/workshop-details-panel.tsx`: group member list + rehearsal-date row.
11. `components/workshops/add-member-dialog.tsx`: `<dialog>` form, looks up an active user by
    email, binds `addMember`.
12. `app/workshops/actions.ts`: add `addMember()`, `removeMember()`, `updateMemberPart()`,
    `updateMemberType()`, `setRehearsalDate()`.

Deliverable: the details panel from the spec/mock is fully functional — add/remove people, set
their type/part, set the rehearsal date.

### PR-4: Script panel
13. `lib/workshops/scripts.ts`: `listAvailableScripts()`, `getScript(slug)` (design.md's manual
    type guard, no new dependency).
14. `lib/workshops/script-colors.ts`: `assignCharacterColors()`.
15. `components/workshops/script-panel.tsx`: collapse/expand state, empty/attach-a-script state.
16. `components/workshops/script-flow.tsx`: renders `script_flow` entries per design.md.
17. `app/workshops/actions.ts`: add `setWorkshopScript()`.

Deliverable: the script panel from the spec/mock — open it, see the attached script rendered with
per-character colors and italic action lines. Only `AWAKWNING-LEONARD-AND-SAYER` is a real,
selectable script at this point (design.md's content-gap note).

### PR-5: Card actions + nav integration
18. `components/workshops/workshop-card-menu.tsx`: Rename / Duplicate / Leave / Delete dropdown,
    Delete disabled to Leave-only when `memberCount > 1`.
19. `app/workshops/actions.ts`: add `renameWorkshop()`, `duplicateWorkshop()`, `leaveWorkshop()`
    (auto-deletes at the last member, design.md), `deleteWorkshop()`.
20. `components/site-header.tsx`: move `navLinks` into the component body, make the Workshops
    link's `href` conditional on `isLoggedIn` (design.md's exact diff).

Deliverable: the full spec is implemented — every interaction in the mock is live, and the header
routes signed-in users to the real page.

## Before starting PR-1

Read the relevant guide under `node_modules/next/dist/docs/` for App Router routing/Server
Actions before writing `app/workshops/*` — this repo pins a Next.js version with breaking changes
against training data (`AGENTS.md`). And resolve design.md's three open questions (admin
visibility scope, leave-as-last-member auto-delete, script-source assumption) — they shape the
schema and action signatures PR-1 and PR-4 commit to.
