/**
 * Local dev server for Moodigo API
 * Simulates the Vercel serverless function at localhost:3000
 *
 * Usage: npm run dev:api
 * The npm script sets ANTHROPIC_API_KEY by reading .env.local via PowerShell,
 * so no dotenv package is needed.
 */

import { createServer } from 'http'
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ── Robust .env.local loader ──────────────────────────────────────────────────
// Handles UTF-8, UTF-8 BOM, CRLF, LF, leading/trailing whitespace
function loadEnvFile(filePath) {
  try {
    let content = readFileSync(filePath)
    // Strip UTF-8 BOM if present (EF BB BF)
    if (content[0] === 0xef && content[1] === 0xbb && content[2] === 0xbf) {
      content = content.slice(3)
    }
    // Also strip UTF-16 LE BOM if present (FF FE)
    if (content[0] === 0xff && content[1] === 0xfe) {
      console.warn('⚠️  .env.local is UTF-16 LE encoded. Converting...')
      content = Buffer.from(content.toString('utf16le'))
    }

    const text = content.toString('utf8')
    let loaded = 0

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eqIdx = line.indexOf('=')
      if (eqIdx === -1) continue

      const key = line.slice(0, eqIdx).trim()
      let value = line.slice(eqIdx + 1).trim()

      // Strip surrounding quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }

      if (key) {
        process.env[key] = value
        loaded++
      }
    }
    console.log(`✅ Loaded .env.local (${loaded} variable${loaded !== 1 ? 's' : ''})`)
    return true
  } catch (e) {
    if (e.code === 'ENOENT') {
      console.error('❌ .env.local not found!')
    } else {
      console.error('❌ Error reading .env.local:', e.message)
    }
    return false
  }
}

// Load .env first, then .env.local (which overrides)
loadEnvFile(join(__dirname, '.env'))
loadEnvFile(join(__dirname, '.env.local'))

// ── Verify required env vars ──────────────────────────────────────────────────
const apiKey = process.env.GROQ_API_KEY
if (!apiKey) {
  console.error('\n❌ GROQ_API_KEY is NOT set!')
  console.error('   Add to your .env file:  GROQ_API_KEY=gsk_...')
  console.error('   Get a FREE key at: https://console.groq.com/keys\n')
  process.exit(1)
}

console.log(`🔑 Groq key: ${apiKey.slice(0, 10)}...${apiKey.slice(-4)}`)

// ── Import & serve the handlers ────────────────────────────────────────────────
const { default: generateHandler } = await import('./api/generate.js')
const { default: imageHandler } = await import('./api/image.js')
const { default: transcribeHandler } = await import('./api/transcribe.js')

const PORT = 3000

const server = createServer((req, res) => {
  if (req.url === '/api/generate' || req.url === '/api/generate/') {
    let body = ''
    req.on('data', (chunk) => (body += chunk))
    req.on('end', () => {
      try {
        req.body = body ? JSON.parse(body) : {}
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON body' }))
        return
      }
      generateHandler(req, res)
    })
    return
  }

  if (req.url.startsWith('/api/image')) {
    imageHandler(req, res)
    return
  }

  if (req.url.startsWith('/api/transcribe')) {
    transcribeHandler(req, res)
    return
  }

  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ error: 'Not found' }))
})

server.listen(PORT, () => {
  console.log(`\n🚀 Moodigo API dev server at http://localhost:${PORT}`)
  console.log(`   Proxied from Vite at http://localhost:5173/api/generate`)
  console.log(`   Ready to generate mood experiences!\n`)
})
