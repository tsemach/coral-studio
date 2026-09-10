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

// @vercel/blob/client ships Node-core shims (undici/crypto/stream) behind
// package.json's browserify-style `browser` field map, a convention that
// Webpack/Next.js honors but Metro does not implement. Without this, Metro
// tries to bundle @vercel/blob's real `undici`/`crypto` imports and fails
// to resolve them. Redirect just those three bare specifiers to the
// browser-safe files @vercel/blob itself ships for this exact purpose,
// scoped to requests coming from inside @vercel/blob's own dist folder so
// nothing else in the app is affected.
const vercelBlobDistDir = path.dirname(require.resolve('@vercel/blob/client'))
const vercelBlobNodeShims = new Set(['undici', 'crypto', 'stream'])
const defaultResolveRequest = config.resolver.resolveRequest
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (vercelBlobNodeShims.has(moduleName) && context.originModulePath.includes(vercelBlobDistDir)) {
    return {
      type: 'sourceFile',
      filePath: path.join(vercelBlobDistDir, `${moduleName}-browser.js`),
    }
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform)
}

module.exports = config
