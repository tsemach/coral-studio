const fs = require('fs')
const path = require('path')

// Dynamically resolve and parse .env / .env.local at the repo root
const dotenvCandidates = ['.env.local', '.env'].map((f) =>
  path.resolve(__dirname, '../../../../', f)
)
let bypassSecret = ''

for (const dotenvPath of dotenvCandidates) {
  if (!fs.existsSync(dotenvPath)) continue
  const content = fs.readFileSync(dotenvPath, 'utf8')
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (trimmed.startsWith('VERCEL_AUTOMATION_BYPASS_SECRET=')) {
      const parts = trimmed.split('=')
      bypassSecret = parts.slice(1).join('=').replace(/^['"]|['"]$/g, '').trim()
      break
    }
  }
  if (bypassSecret) break
}

if (!bypassSecret) {
  console.error(
    'Error: VERCEL_AUTOMATION_BYPASS_SECRET is missing from .env.local / .env. Run `vercel env pull` first.'
  )
  process.exit(1)
}

// Only fetch coral-studio's own Vercel deployments (project preview/prod
// hostnames follow coral-studio*.vercel.app). Adjust this pattern once the
// project is linked and you know the exact production domain.
const ALLOWED_HOST_PATTERN = /^coral-studio.*\.vercel\.app$/

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.log('Usage: node vercel-fetch.js <url> <path> [method] [bodyJson]')
    process.exit(1)
  }

  const [baseUrl, apiPath, method = 'GET', bodyJson = ''] = args

  let host
  try {
    host = new URL(baseUrl).host
  } catch {
    console.error(`Error: invalid URL: ${baseUrl}`)
    process.exit(1)
  }

  if (!ALLOWED_HOST_PATTERN.test(host)) {
    console.error(
      `Error: host not allowed. Only hosts matching ${ALLOWED_HOST_PATTERN} may be fetched (got: ${host})`
    )
    process.exit(1)
  }

  const cleanedUrl = `${baseUrl.replace(/\/$/, '')}/${apiPath.replace(/^\//, '')}`

  const headers = {
    'x-vercel-protection-bypass': bypassSecret,
    'Content-Type': 'application/json',
  }

  const options = { method, headers }
  if (bodyJson) options.body = bodyJson

  try {
    const res = await fetch(cleanedUrl, options)
    const text = await res.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
    console.log(
      JSON.stringify(
        { status: res.status, headers: Object.fromEntries(res.headers.entries()), data },
        null,
        2
      )
    )
  } catch (error) {
    console.error('Request failed:', error.message)
    process.exit(1)
  }
}

main()
