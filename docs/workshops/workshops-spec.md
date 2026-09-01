## General
This document define the functionality of the workshop new page. Workshop is where a group of actors to work a scene and run rehearsals. It is the arena replace a real theatre, you can think of it as virtual theatre.

### Attributes of workshop
Workshop has several attributes which defines its behavior. 
1. A script which is a json file. see example [AWAKWNING-LEONARD-AND-SAYER.json](workshops/scripts/AWAKWNING-LEONARD-AND-SAYER.json)
2. Group is a collection of people. each people has the following:  
   <ol type="a">
     <li>userId or user name (a unique identifier)</li>
     <li>type: viewer / actor</li>
     <li>part: what part the actor play, it is optional</li>
   </ol>
3. Schedual rehearsal - a date when rehearsal is plan
4. Workshop able to create empty then later on update its parameters.
5. A person who create the workshop is autmatically added to the group.
6. All members of the gorup can add any user to a group.
7. There is not restriction of user role, all users able to be part of a group.
8. Deleting a workshop can be done anly if the user is the last one in the group.
9. User may see only workshops where he is member of but admin can see them all.

### Accessing the workshop page
If a user is login then pressing the Workshops button on the top bar navigate to a dedicate page. 
If a user is not login then pressing the Workshops will navigate with /#workshops as today.

## Page layout

The workshop page follows the same shell as the existing `/admin/settings` page: a back link
to the previous page top-left, the account avatar menu top-right, and a two-pane body below a
divider (list nav on the left, content on the right). It reuses that page's visual language
(`rounded-xl` cards, `border-border`, `bg-card` panels, `primary` for the active/selected state)
rather than introducing a new one.

### Header
Just two things: **Back** button on the left (arrow + label, returns to the previous page,
mirrors the `←` link on `/admin/settings`), and the account avatar (`UserMenu`) on the right. The
selected workshop's two primary actions — **Schedule Rehearsal** then **+ Add user** — used to be
centered here; they now live on the same line as the workshop title instead (see Main content
area below), right-aligned, visible only when a workshop is selected. These are the same actions
available per-card from the sidebar's overflow menu; wherever they appear, they always act on
whichever workshop they're attached to.

### Left sidebar — workshop list
- A **search field** and the **+ New workshop** action share a row pinned above the list. The
  search field filters the list below by workshop title as the user types (client-side over the
  workshops already visible to them — attribute 9's admin/member scoping applies before search,
  not after). The sidebar's whole width is user-resizable: a drag handle sits on its right edge,
  hidden until hovered (a thin line plus a small pill grip once hovered), draggable left/right.
- **+ New workshop** opens a modal rather than creating a workshop immediately: title (optional —
  attribute 4's "create empty" still holds, this just gives it a name up front instead of only
  via later action), script (optional, picked from the same available-scripts list the script
  panel uses), and people to add (optional — pick as many as needed before creating; each gets a
  type/part like the details panel's members do). Only on submit does the workshop, its script,
  and its group get created together; the creator is still always added automatically
  (attribute 5), on top of anyone picked in the modal.
- Below it, one card per workshop the current user belongs to, most recently active first. Each
  card shows the workshop's title (from its script) and a **⋮ overflow menu** on the right edge.
- The overflow menu opens a small dropdown anchored to the card with per-workshop actions:
  **Edit** (first — the same modal as + New workshop, pre-filled with this workshop's title and
  script; any people picked here get added on top of the existing group, not shown/removed here),
  **Add user**, **Schedule Rehearsal**, then either **Leave workshop** (when other members
  remain) or **Delete** (attribute 8 — only once the caller is the last member left). (The
  header's own standalone button for this is still labeled "+ Add user" — the "+" only comes off
  the menu item, which doesn't need one.)
- The selected workshop's card is highlighted (`border-primary`), matching the active-tab style
  used on `/admin/settings`'s Users nav.
- With no workshops at all, the page still renders this same shell — header, empty sidebar list,
  the + New workshop action — rather than a separate empty-state page; the content area to the
  right just shows nothing is selected.

### Main content area
The workshop title heads this area, with **Schedule Rehearsal** then **+ Add user**
right-aligned on the same line (moved here from the header — see above). Below that, two panels
side by side on desktop and stacked on mobile (same responsive collapse as `UsersView`). A ↔
button on the script panel's header row, right side, toggles between this split view and the
script panel alone filling the row — the details panel isn't just narrowed, it stops rendering
entirely while expanded.

**Script panel** (left, wider — about 2/3 of the row by default) is always expanded — no collapse
toggle (an earlier version had one; removed once it turned out the script is exactly the thing
you want visible while rehearsing, not something worth an extra click to reveal). Its width is
user-resizable via a drag handle on its right edge (the shared edge with the details panel),
hidden until hovered, same mechanism as the sidebar's own resize handle on its right edge —
both grow their panel by dragging toward the neighbor they're pushing into.
- Also lets a member attach one of the available pre-made scripts when none is set yet (a
  `<select>` populated from `lib/workshops/scripts.ts`'s `listAvailableScripts()`) — the sketch
  didn't show this step, but without it a workshop could never get a script in the first place.
- It loads the workshop's script JSON (attribute 1, see
  [AWAKWNING-LEONARD-AND-SAYER.json](../../workshops/scripts/AWAKWNING-LEONARD-AND-SAYER.json) for
  the shape) and renders its `script_flow` entries top to bottom:
  - `dialogue` entries are shown as `character: line`, with each distinct `character` assigned a
    consistent color so a reader can follow who's speaking at a glance.
  - `action` entries are shown in a neutral, non-colored style (italic, centered) between dialogue
    lines, matching how they read in a script.
- This panel is read-only in the initial version — script *editing* is out of scope for COR-12.
- **Split by character** (COR-14): a header button toggles between the single-column view above
  and a side-by-side layout, one column per speaking character. Disabled for a monologue (one
  character — nothing to split) and for more than 3 speaking characters (no defined layout past
  that); enabled only for exactly 2 or 3. Every `script_flow` entry keeps its own row regardless
  of type, in original order, which is what keeps the conversation's back-and-forth aligned across
  columns: a `dialogue` row fills only its speaker's column and leaves the others blank for that
  row, while an `action` row spans the full width rather than sitting in any one column. Column
  headers (the character names, colored to match) stay pinned to the top of the panel while the
  rows beneath them scroll.

**Workshop details panel** (right, narrower) shows, for the selected workshop:
- The group: each member's name, their type (`viewer` / `actor`), and their part if set. Members
  can be removed here; any group member can trigger + Add user (attribute 6) from the title row or
  the sidebar menu.
- The scheduled rehearsal date (attribute 3), shown read-only here — set via the Schedule
  Rehearsal action (title row or sidebar menu), not edited inline in this panel.
- When the workshop is new/empty, this panel opens directly in an editable state so the creator
  can set the group and schedule before the workshop has a script attached.

  