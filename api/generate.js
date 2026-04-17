import { SYSTEM_PROMPT, buildUserPrompt } from '../src/lib/prompts.js'

// Groq is OpenAI-compatible and completely free (no credit card needed)
// Get your key at: https://console.groq.com/keys
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions'
const GROQ_MODEL = 'llama-3.1-8b-instant'

const MAX_MOOD_LENGTH = 500
const MIN_MOOD_LENGTH = 2

function corsHeaders(origin) {
  const allowed = process.env.ALLOWED_ORIGIN || '*'
  return {
    'Access-Control-Allow-Origin': allowed === '*' ? '*' : (origin || '*'),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function validateMood(mood) {
  if (typeof mood !== 'string') return 'mood must be a string'
  const trimmed = mood.trim()
  if (trimmed.length < MIN_MOOD_LENGTH) return `mood must be at least ${MIN_MOOD_LENGTH} characters`
  if (trimmed.length > MAX_MOOD_LENGTH) return `mood must be at most ${MAX_MOOD_LENGTH} characters`
  return null
}

function validateIntensity(intensity) {
  const valid = ['subtle', 'medium', 'intense']
  if (!valid.includes(intensity)) return `intensity must be one of: ${valid.join(', ')}`
  return null
}

function validateResponse(parsed) {
  if (!parsed || typeof parsed !== 'object') return false
  if (!parsed.visuals || typeof parsed.visuals.imagePrompt !== 'string') return false
  if (!Array.isArray(parsed.visuals.effects)) return false
  if (!parsed.story || !Array.isArray(parsed.story)) return false
  if (!parsed.audio || typeof parsed.audio.baseFrequency !== 'number' || typeof parsed.audio.binauralHz !== 'number') return false
  if (!parsed.visuals.colorPalette || !Array.isArray(parsed.visuals.colorPalette)) return false
  return true
}

function extractJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    // If not direct parsable, try looking for a code block
    const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
    if (match) {
      try {
        return JSON.parse(match[1])
      } catch {
        return null
      }
    }
    return null
  }
}

export default async function handler(req, res) {
  const origin = req.headers['origin'] || ''
  const headers = corsHeaders(origin)

  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { ...headers, 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method not allowed' }))
    return
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    res.writeHead(500, { ...headers, 'Content-Type': 'application/json' })
    res.end(JSON.stringify({
      error: 'API key not configured. Add GROQ_API_KEY to your .env file. Get a free key at https://console.groq.com/keys',
    }))
    return
  }

  let body
  try {
    body = typeof req.body === 'object' ? req.body : JSON.parse(req.body || '{}')
  } catch {
    res.writeHead(400, { ...headers, 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Invalid JSON body' }))
    return
  }

  const { mood } = body

  const moodError = validateMood(mood)
  if (moodError) {
    res.writeHead(400, { ...headers, 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: moodError }))
    return
  }

  try {
    const groqRes = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(mood.trim()) },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.9,
        max_tokens: 4096,
      }),
    })

    if (!groqRes.ok) {
      const errData = await groqRes.json().catch(() => ({}))
      const message = errData?.error?.message || `Groq API error: ${groqRes.status}`
      res.writeHead(502, { ...headers, 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: message }))
      return
    }

    const data = await groqRes.json()
    const rawText = data?.choices?.[0]?.message?.content || ''

    if (!rawText) {
      res.writeHead(500, { ...headers, 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'AI returned empty response. Please try again.' }))
      return
    }

    const parsedJson = extractJson(rawText)
    if (!parsedJson || !validateResponse(parsedJson)) {
      console.error("Invalid AI JSON format:", rawText.slice(0,200))
      res.writeHead(500, { ...headers, 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'AI did not return valid JSON format. Please try again.' }))
      return
    }

    res.writeHead(200, { ...headers, 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ...parsedJson, mood: mood.trim() }))
  } catch (err) {
    console.error('[moodigo/generate]', err)
    res.writeHead(500, { ...headers, 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Failed to generate experience. Please try again.' }))
  }
}
