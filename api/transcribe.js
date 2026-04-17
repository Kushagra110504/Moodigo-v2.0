export default async function handler(req, res) {
  // CORS Setup
  const origin = req.headers['origin'] || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Method Not Allowed' }))
    return
  }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'GROQ_API_KEY not configured' }))
    return
  }

  try {
    // 1. Read incoming JSON body containing base64 audio
    // Compatibility: Local dev-server uses raw streams, Vercel auto-parses req.body
    let bodyData = ''
    if (req.body) {
      bodyData = typeof req.body === 'object' ? JSON.stringify(req.body) : req.body
    } else {
      for await (const chunk of req) {
        bodyData += chunk
      }
    }
    
    const { audioBase64 } = JSON.parse(bodyData)
    
    if (!audioBase64) {
      res.writeHead(400, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: 'Missing audioBase64 in request body' }))
      return
    }

    // 2. Decode base64 back into a binary buffer
    const audioBuffer = Buffer.from(audioBase64, 'base64')
    
    // 3. Construct FormData for Groq Whisper
    const formData = new FormData()
    
    // Convert Node Buffer to Web Blob for FormData compatibility
    const webBlob = new Blob([audioBuffer], { type: 'audio/webm' })
    formData.append('file', webBlob, 'recording.webm')
    formData.append('model', 'whisper-large-v3')
    formData.append('response_format', 'json')
    formData.append('language', 'en')

    // 4. POST to Groq Whisper
    const groqRes = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
        // FormData automatically sets correct multi-part content-type boundaries
      },
      body: formData
    })

    const groqData = await groqRes.json()

    if (!groqRes.ok) {
      console.error('[Whisper Proxy] Groq Error:', groqData)
      res.writeHead(groqRes.status, { 'Content-Type': 'application/json' })
      res.end(JSON.stringify({ error: groqData.error?.message || 'Transcription failed' }))
      return
    }

    // Return the transcribed text successfully
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ text: groqData.text }))
    
  } catch (err) {
    console.error('[Whisper Proxy] Internal Error:', err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error processing audio' }))
  }
}
