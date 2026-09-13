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

// @vercel/blob/client also transitively pulls in @vercel/oidc (for a Vercel
// OIDC token-verification path this app never exercises -- it's only ever
// reachable from Vercel's own server-side auth flows, not from put()), and
// @vercel/oidc's verify-vercel-oidc-token.js does a bare `require("jose")`.
// jose's package.json resolves "require" to its Node CJS build, which in
// turn imports "node:buffer" -- unavailable on-device and previously only
// caught on the (Node-buffer-free) web target, not native. jose ships its
// own browser-safe ESM build (dist/browser/index.js, verified dependency-
// free of any node: import) behind its "browser" export condition; redirect
// to it explicitly, scoped to requests from inside @vercel/oidc's own dist
// folder so nothing else in the app (mobile-app never imports jose itself)
// is affected.
// @vercel/oidc and jose are transitive dependencies (of @vercel/blob, not
// of this app directly), so pnpm's isolated node_modules layout doesn't
// hoist them where a plain require.resolve('@vercel/oidc') would find them
// -- resolve each relative to its own known importer instead. jose's own
// package.json `exports` map doesn't expose './dist/browser/index.js' as a
// public subpath, so resolve its package root and join the path manually,
// the same way the block above reaches into @vercel/blob's dist folder.
const vercelOidcEntry = require.resolve('@vercel/oidc', { paths: [vercelBlobDistDir] })
const vercelOidcDistDir = path.dirname(vercelOidcEntry)
const joseRoot = path.dirname(require.resolve('jose/package.json', { paths: [vercelOidcEntry] }))
const joseBrowserEntry = path.join(joseRoot, 'dist/browser/index.js')

const defaultResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (vercelBlobNodeShims.has(moduleName) && context.originModulePath.includes(vercelBlobDistDir)) {
    return {
      type: 'sourceFile',
      filePath: path.join(vercelBlobDistDir, `${moduleName}-browser.js`),
    }
  }
  if (moduleName === 'jose' && context.originModulePath.includes(vercelOidcDistDir)) {
    return {
      type: 'sourceFile',
      filePath: joseBrowserEntry,
    }
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform)
}

module.exports = config
