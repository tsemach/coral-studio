// CORS support for the /api/mobile/* surface. Native builds (iOS/Android)
// never go through a browser, so this only matters for the mobile app's
// web target (`pnpm --filter mobile-app web`), which runs on a different
// origin/port than studio-web's dev server -- without these headers the
// browser blocks every request before the app ever sees a response.
// Access-Control-Allow-Origin: '*' is safe here since these routes are
// bearer-token authenticated (no cookies), not credentialed.
const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

export function withMobileCors<Context = unknown>(
  handler: (request: Request, context: Context) => Promise<Response>
) {
  return async (request: Request, context: Context): Promise<Response> => {
    const response = await handler(request, context)
    const headers = new Headers(response.headers)
    for (const [key, value] of Object.entries(CORS_HEADERS)) {
      headers.set(key, value)
    }
    return new Response(response.body, { status: response.status, headers })
  }
}

export function mobileCorsPreflight(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}
