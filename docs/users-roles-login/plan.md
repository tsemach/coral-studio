# Users, roles & login — design plan

Linear: [COR-5](https://linear.app/coral-studio/issue/COR-5/add-registration-login-process)

## Requirements (from COR-5)

1. Two roles: `user` and `admin`.
   - `admin` can access all pages.
   - `admin` can approve user registrations.
2. A user registers with username/password, where the username is their email address.
3. The only way to create an admin is a `pnpm` local command — there is no UI for it.
4. The system sends a confirmation email to the user on registration.
5. Confirming the email does not register the user yet — the request goes to the site admins
   for final approval. Only once an admin approves can the user log in.
6. Registration may also happen via Google or Facebook, similar to `doron-desktop`.
7. There must be at least one admin registered and active in the system at all times.
8. Today, login blocks access to no page — that stays true here; this work only gates the new
   `/admin/*` section (see PR-3), nothing else.

## Prior art

`~/projects/doron-desktop/apps/backend` already runs a very similar stack: NextAuth v5 (beta) +
`@auth/drizzle-adapter` + `Credentials`/`Google`/`Facebook` providers, `bcryptjs` for password
hashing, and a `getEmailProvider()` abstraction (Resend, falling back to a mock provider when
`RESEND_API_KEY` is unset) for verification emails. Its `scripts/seed-admin.mjs` is the model for
this project's "no UI" admin-creation command.

Two things are **not** reused from doron-desktop:

- **Credentials.** coral-studio gets its own Google/Facebook OAuth client IDs — doron-desktop's
  are not shared across projects.
- **The role/org model.** doron-desktop has four roles (`admin`/`manager`/`user`/`flat`) plus
  firm-scoped invitations — none of that applies here. COR-5 asks for exactly two roles and a
  single admin-approval gate, so the schema below is deliberately simpler.
- **Admin-approval-of-registration itself.** doron-desktop has no such step (self-registered
  users there activate on email-verify alone) — this is new for coral-studio.

## Data model

Added to `lib/database/schema.ts`:

- `users` — `id`, `name`, `email` (unique), `passwordHash` (nullable — null for OAuth-only
  accounts), `image`, `role` (`user | admin`, default `user`), `status`
  (`pending_email | pending_approval | active | rejected`, default `pending_email`),
  `emailVerified`, `approvedAt`, `approvedById` (self-reference), `createdAt`.
- `accounts`, `sessions`, `verificationTokens` — the shape `@auth/drizzle-adapter` requires for
  OAuth account linking and email-verification tokens.

Login is only permitted once `status === 'active'`. Getting there:

```
pending_email  --(user clicks verification link)-->  pending_approval
pending_approval  --(admin approves, PR-3)-->  active
pending_approval  --(admin rejects, PR-3)-->  rejected
```

A CLI-created admin (PR-1) skips straight to `active` — there is no UI path to that state.
An OAuth sign-in (PR-4) skips `pending_email` (the provider already proved the email) and starts
at `pending_approval`.

## Branch / PR strategy

This is a stack, not five independent branches off `master`:

```
master
  └─ PR-0  tsemachmizrachi/cor-7-pr-0-registrationlogin-design-doc   (this doc)
       └─ PR-1  tsemachmizrachi/cor-8-pr-1-auth-foundation-admin-bootstrap-cli
            └─ PR-2  tsemachmizrachi/cor-9-pr-2-self-registration-email-confirmation
                 └─ PR-3  tsemachmizrachi/cor-10-pr-3-admin-approval-page
                      └─ PR-4  tsemachmizrachi/cor-11-pr-4-google-facebook-sign-in
```

Only PR-0 ever merges to `master`. Each later PR merges into the branch below it in the stack
(PR-1 → PR-0, PR-2 → PR-1, etc.), so every PR's diff stays reviewable on its own even though the
work is sequential. PR-0 merging to `master` is what ultimately brings the whole stack in, one
link at a time, as each subsequent PR gets rebased/re-based onto the merged branch below it.

## PR breakdown

### [PR-0 — COR-7](https://linear.app/coral-studio/issue/COR-7): Design doc
This document. No app code.

### [PR-1 — COR-8](https://linear.app/coral-studio/issue/COR-8): Auth foundation + admin bootstrap CLI
1. `lib/database/schema.ts`: `users`/`accounts`/`sessions`/`verificationTokens` tables (schema above).
2. `auth.config.ts` + `auth.ts`: NextAuth v5, `DrizzleAdapter`, JWT sessions, `Credentials`
   provider only (OAuth is PR-4). Session exposes `role`/`status`.
3. `app/api/auth/[...nextauth]/route.ts`.
4. `lib/verifyCredentials.ts`: bcrypt check + require `status === 'active'`, one generic
   non-enumerable error for both "wrong password" and "not active yet".
5. Wire the existing `app/login/page.tsx` form to `signIn('credentials', …)`.
6. `scripts/create-admin.ts` + `pnpm create-admin`: the only way to create an admin — inserts
   directly with `role=admin`, `status=active`, `emailVerified=now`. Bootstraps the required
   first active admin.
7. `pnpm add next-auth@beta @auth/drizzle-adapter bcryptjs` + `-D @types/bcryptjs`;
   `.env`: `AUTH_SECRET`.

### [PR-2 — COR-9](https://linear.app/coral-studio/issue/COR-9): Self-registration + email confirmation
8. `lib/validation.ts`: `isValidEmail`/`isValidPasswordLength`.
9. `lib/email/` (`types.ts`, `mock-provider.ts`, `resend-provider.ts`, `index.ts`):
   `getEmailProvider()`, mock by default until `RESEND_API_KEY` is set.
10. `lib/emailVerification.ts`: create/consume verification tokens; on verify, flips
    `status` from `pending_email` to `pending_approval` and emails every active admin that a
    registration is awaiting approval.
11. `app/api/auth/register/route.ts`: creates the user (`role` always `user`), hashes the
    password, sends the verification email.
12. `app/register/page.tsx`: new form, matching `app/login/page.tsx`'s existing styling.
13. `app/verify-email/page.tsx`: consumes the token, shows success / pending-approval messaging.
14. `pnpm add resend`.

### [PR-3 — COR-10](https://linear.app/coral-studio/issue/COR-10): Admin approval page
15. `app/admin/users/page.tsx`: session-gated (role=admin only) page listing
    `status='pending_approval'` users with Approve/Reject actions.
16. Server actions (or `app/api/admin/users/[id]/approve|reject/route.ts`) to flip
    `status`/`approvedAt`/`approvedById`, and email the user on approval.
17. `middleware.ts`: first real route protection in this codebase — gates `/admin/*` to
    authenticated admins only. Nothing else is gated (requirement 8).

### [PR-4 — COR-11](https://linear.app/coral-studio/issue/COR-11): Google & Facebook sign-in
18. `auth.config.ts`: add `Google`/`Facebook` providers, reading `AUTH_GOOGLE_ID`/`SECRET` and
    `AUTH_FACEBOOK_ID`/`SECRET` — new credentials created for coral-studio specifically.
19. OAuth sign-ins start at `pending_approval` (skip `pending_email`) and go through the same
    admin-approval gate as credentials sign-ups.
20. Add "Continue with Google"/"Continue with Facebook" buttons to `app/login/page.tsx` and
    `app/register/page.tsx`.
