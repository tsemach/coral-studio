'use server'

import { revalidatePath } from 'next/cache'
import { auth } from '@/auth'
import { addScript, deleteScript } from '@/lib/workshops/scripts'

// Render-time gating on the page is not a security boundary -- a Server
// Action is directly POSTable, so every action here re-checks admin the
// same way app/admin/users/actions.ts's requireAdmin() does.
async function requireAdmin() {
  const session = await auth()
  if (!session?.user?.id || (session.user as { role?: string }).role !== 'admin') {
    throw new Error('Unauthorized')
  }
}

export async function uploadScript(formData: FormData): Promise<{ error: string } | void> {
  await requireAdmin()

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { error: 'Choose a JSON file to upload.' }
  }

  // addScript()'s underlying Blob put() call is not wrapped in try/catch --
  // a network/auth/rate-limit failure there would otherwise throw past this
  // action's declared { error } contract as an unhandled Server Action error.
  let result: Awaited<ReturnType<typeof addScript>>
  try {
    result = await addScript(file)
  } catch {
    return { error: 'Something went wrong uploading the script. Try again.' }
  }
  if ('error' in result) return result

  revalidatePath('/scripts')
}

export async function removeScript(slug: string): Promise<void> {
  await requireAdmin()
  await deleteScript(slug)
  revalidatePath('/scripts')
}
