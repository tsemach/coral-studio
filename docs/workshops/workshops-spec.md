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
- **Back** button, top-left: arrow + label, returns to the previous page (mirrors the `←` link
  on `/admin/settings`).
- Account avatar, top-right: the existing `UserMenu` circle-initial component.

### Left sidebar — workshop list
- A **search field** and the **+ New workshop** action share a row pinned above the list. The
  search field filters the list below by workshop title as the user types (client-side over the
  workshops already visible to them — attribute 9's admin/member scoping applies before search,
  not after). + New workshop creates an empty workshop (attribute 4) and selects it, opening it
  in the details panel to the right in an editable state.
- Below it, one card per workshop the current user belongs to, most recently active first. Each
  card shows the workshop's title (from its script) and a **⋮ overflow menu** on the right edge.
- The overflow menu opens a small dropdown anchored to the card with per-workshop actions:
  Rename, Duplicate, Leave workshop, and Delete (Delete only shown to the workshop's creator).
- The selected workshop's card is highlighted (`border-primary`), matching the active-tab style
  used on `/admin/settings`'s Users nav.

### Main content area
Two panels, side by side on desktop and stacked on mobile (same responsive collapse as
`UsersView`). A single **+ Add user** button sits above both panels, right-aligned, and adds a
person (attribute 2) to the selected workshop's group.

**Workshop details panel** (left/center, wider) shows, for the selected workshop:
- The group: each member's name, their type (`viewer` / `actor`), and their part if set. Members
  can be removed here; any group member can trigger + Add user (attribute 6).
- The scheduled rehearsal date (attribute 3), editable inline.
- When the workshop is new/empty, this panel opens directly in an editable state so the creator
  can set the group and schedule before the workshop has a script attached.

**Script panel** (right, narrower) is collapsible:
- Closed by default; its header is the toggle (implementation simplification from the original
  sketch, which also showed a redundant left-edge arrow — one clear affordance is enough).
- Also lets a member attach one of the available pre-made scripts when none is set yet (a
  `<select>` populated from `lib/workshops/scripts.ts`'s `listAvailableScripts()`) — the sketch
  didn't show this step, but without it a workshop could never get a script in the first place.
- When open, it loads the workshop's script JSON (attribute 1, see
  [AWAKWNING-LEONARD-AND-SAYER.json](../../workshops/scripts/AWAKWNING-LEONARD-AND-SAYER.json) for
  the shape) and renders its `script_flow` entries top to bottom:
  - `dialogue` entries are shown as `character: line`, with each distinct `character` assigned a
    consistent color so a reader can follow who's speaking at a glance.
  - `action` entries are shown in a neutral, non-colored style (e.g. italic) between dialogue
    lines, matching how they read in a script.
- This panel is read-only in the initial version — script *editing* is out of scope for COR-12.

  