export type TapeNoteTag = 'objective_action' | 'truthfulness_listening' | 'vocal_physicality' | 'framing_eyeline'

export interface TapeItem {
  id: string
  title: string
  description: string
  authorId: string
  authorName: string | null
  authorImage: string | null
  authorRole: string
  durationSeconds: number | null
  createdAt: Date
  notesCount: number
}

export interface TapeNoteItem {
  id: string
  tapeId: string
  authorId: string
  authorName: string | null
  authorImage: string | null
  authorRole: string
  timestampSeconds: number
  tag: TapeNoteTag | null
  content: string
  createdAt: Date
}

export type TapeItemDTO = Omit<TapeItem, 'createdAt'> & { createdAt: string }

export function toTapeItemDTO(tape: TapeItem): TapeItemDTO {
  return { ...tape, createdAt: tape.createdAt.toISOString() }
}
