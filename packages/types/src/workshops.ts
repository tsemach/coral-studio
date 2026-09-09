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

// HTTP DTO variants: the mobile API routes serialize responses through
// Response.json(), which turns rehearsalAt from a Date into an ISO string
// (unlike studio-web's RSC code, which preserves the Date across the
// server/client boundary and still needs the plain types above unchanged).
export type WorkshopListItemDTO = Omit<WorkshopListItem, 'rehearsalAt'> & { rehearsalAt: string | null }
export type WorkshopDetailDTO = Omit<WorkshopDetail, 'rehearsalAt'> & { rehearsalAt: string | null }
