import { approveUser, rejectUser } from '@/app/admin/users/actions'

type PendingUser = {
  id: string
  name: string | null
  email: string
  createdAt: Date
}

export function PendingUsersPanel({ pending }: { pending: PendingUser[] }) {
  if (pending.length === 0) {
    return <p className="text-sm text-foreground/60">No registrations are waiting for approval.</p>
  }

  return (
    <ul className="space-y-3">
      {pending.map((user) => (
        <li
          key={user.id}
          className="flex items-center justify-between gap-4 rounded-sm border border-border bg-background px-5 py-4"
        >
          <div>
            <p className="font-medium">{user.name || user.email}</p>
            <p className="text-sm text-foreground/60">{user.email}</p>
          </div>

          <div className="flex shrink-0 gap-2">
            <form action={approveUser.bind(null, user.id)}>
              <button
                type="submit"
                className="rounded-sm bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-transform hover:-translate-y-0.5"
              >
                Approve
              </button>
            </form>
            <form action={rejectUser.bind(null, user.id)}>
              <button
                type="submit"
                className="rounded-sm border border-border px-4 py-2 text-sm font-semibold text-foreground/70 transition-colors hover:text-foreground"
              >
                Reject
              </button>
            </form>
          </div>
        </li>
      ))}
    </ul>
  )
}
