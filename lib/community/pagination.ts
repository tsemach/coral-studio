export interface PostsCursor {
  createdAt: string
  id: string
}

export function encodeCursor(cursor: PostsCursor): string {
  return Buffer.from(JSON.stringify(cursor)).toString('base64url')
}

export function decodeCursor(raw: string | null): PostsCursor | null {
  if (!raw) return null
  try {
    return JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as PostsCursor
  } catch {
    return null
  }
}
