export type WorkshopListItem = {
  id: string
  title: string
  scriptSlug: string | null
  rehearsalAt: Date | null
  location: 'studio' | 'online' | null
  memberCount: number
  memberUserIds: string[]
}

export type WorkshopMember = {
  id: string
  userId: string
  name: string | null
  email: string
  type: 'viewer' | 'actor'
  part: string | null
}

export type WorkshopDetail = {
  id: string
  title: string
  scriptSlug: string | null
  rehearsalAt: Date | null
  location: 'studio' | 'online' | null
  meetingUrl: string | null
  createdById: string
  members: WorkshopMember[]
}

export type AddableUser = { id: string; name: string | null; email: string }
