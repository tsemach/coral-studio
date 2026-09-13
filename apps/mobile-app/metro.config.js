const { getDefaultConfig } = require('expo/metro-config')
const path = require('path')

const projectRoot = __dirname
const workspaceRoot = path.resolve(projectRoot, '../..')

const config = getDefaultConfig(projectRoot)

// pnpm workspaces symlink packages into node_modules/.pnpm — point Metro at
// the workspace root so it can resolve shared packages/* and follow those
// symlinks instead of only looking inside mobile-app/node_modules.
config.watchFolders = [workspaceRoot]
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
]

// @vercel/blob/client's dist/client.js bare-imports Node builtins
// (undici/crypto/stream). @vercel/blob's package.json redirects those to
// its own browser-safe shims via an object-valued `browser` field, which
// Metro's resolver does know how to remap -- but Expo's own resolver
// chain (withMetroMultiPlatform.js's Node-builtin shimming, e.g.
// requestNodeExternals) intercepts bare `undici`/`crypto`/`stream`
// specifiers and shims them to empty/null *before* Metro's browser-field
// remap logic gets a chance to run, so @vercel/blob's own redirect never
// takes effect and bundling fails. This override steps in ahead of that:
// redirect just those three bare specifiers to the browser-safe files
// @vercel/blob itself ships for this exact purpose, scoped to requests
// coming from inside @vercel/blob's own dist folder so nothing else in
// the app is affected.
const vercelBlobDistDir = path.dirname(require.resolve('@vercel/blob/client'))
const vercelBlobNodeShims = new Set(['undici', 'crypto', 'stream'])

// @vercel/blob/client also transitively pulls in @vercel/oidc -- a Vercel
// OIDC token-verification path this app never exercises (only reachable
// from Vercel's own server-side auth flows, never from put()). Its
// react-native/browser entry (index-browser.js) still eagerly requires
// verify-vercel-oidc-token.js, whose top-level code calls jose's
// createRemoteJWKSet(...) at *import* time -- not lazily, not only when
// verifyVercelOidcToken() is actually called. That call touches the global
// Web Crypto API (`crypto.subtle`/`crypto.getRandomValues`), which doesn't
// exist in Hermes, so simply importing @vercel/oidc throws
// "ReferenceError: Property 'crypto' doesn't exist" at app startup on
// native -- previously only caught on the web target (agent-browser/
// Chrome DOES have a real `crypto` global, so this never surfaced there).
// Rather than polyfill Web Crypto for one unused dependency, resolve
// @vercel/oidc to Metro's built-in `{ type: 'empty' }` (the same technique
// Expo's own resolver chain uses to shim out real Node builtins) so its
// file is never evaluated at all, scoped to requests from inside
// @vercel/blob's own dist folder.
//
// Sanity-check the package actually resolves from @vercel/blob's own
// resolution context (pnpm's isolated node_modules layout means a plain
// require.resolve('@vercel/oidc') from this file wouldn't find it, since
// it's a dependency of @vercel/blob, not of this app directly) -- this
// throws loudly at Metro-config-load time if @vercel/blob ever stops
// depending on it, rather than silently leaving a stale, ineffective rule.
require.resolve('@vercel/oidc', { paths: [vercelBlobDistDir] })

const defaultResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (vercelBlobNodeShims.has(moduleName) && context.originModulePath.includes(vercelBlobDistDir)) {
    return {
      type: 'sourceFile',
      filePath: path.join(vercelBlobDistDir, `${moduleName}-browser.js`),
    }
  }
  if (moduleName === '@vercel/oidc' && context.originModulePath.includes(vercelBlobDistDir)) {
    return { type: 'empty' }
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform)
}

module.exports = config
