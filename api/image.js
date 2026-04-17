import { parse } from 'url'

// Global cache to prevent React Strict Mode duplicate fetches from hitting rate limits.
const activeFetches = new Map()

export default async function handler(req, res) {
  // CORS check
  const origin = req.headers['origin'] || '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  const { query } = parse(req.url, true)
  const prompt = query.prompt
  const seed = query.seed || Math.floor(Math.random() * 99999)

  if (!prompt) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Missing prompt query parameter' }))
    return
  }

  // We no longer require an API key since the free tier is perfectly adequate for images.
  // Passing a 0-budget key causes a strict 402 exception.

  // Construct the Pollinations URL for the image
  const polliUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1920&height=1080&nologo=true&model=flux&seed=${seed}`

  try {
    // 1. Check if we are already fetching this exact image (React Strict Mode double-fetch prevention)
    if (activeFetches.has(polliUrl)) {
      console.log('[MoodImageProxy] Merging concurrent request from cache:', prompt.slice(0, 30) + '...');
      const { contentType, buffer } = await activeFetches.get(polliUrl);
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' });
      res.end(buffer);
      return;
    }

    // 2. Define the exact fetch logic as a Promise we can cache
    const fetchImageWork = async () => {
      let polliRes;
      let attempts = 0;
      const maxAttempts = 3;

      while (attempts < maxAttempts) {
        polliRes = await fetch(polliUrl, { method: 'GET' });

        if (polliRes.ok || (polliRes.status !== 429 && polliRes.status >= 400 && polliRes.status !== 500)) {
          break; // Success or fatal error
        }

        console.warn(`[MoodImageProxy] Rate limited (429). Attempt ${attempts + 1}/${maxAttempts}. Waiting 3s...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
        attempts++;
      }

      if (!polliRes || !polliRes.ok) {
        const errText = polliRes ? await polliRes.text() : 'Max retries reached';
        const status = polliRes ? polliRes.status : 429;
        throw { status, text: errText };
      }

      const contentType = polliRes.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await polliRes.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return { contentType, buffer };
    };

    // 3. Save the promise into the cache BEFORE it resolves
    const workPromise = fetchImageWork();
    activeFetches.set(polliUrl, workPromise);

    // 4. Await our own work
    try {
      const { contentType, buffer } = await workPromise;
      res.writeHead(200, { 'Content-Type': contentType, 'Cache-Control': 'public, max-age=86400' });
      res.end(buffer);
    } catch (apiErr) {
      // Clear cache on error so a true retry is possible later
      activeFetches.delete(polliUrl);
      console.error('[MoodImageProxy] Error from Pollinations:', apiErr.status, apiErr.text);
      res.writeHead(apiErr.status || 500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: `Pollinations API error: ${apiErr.status}` }));
    }

    // Optional: Clear memory cache after 15 seconds so we don't leak RAM over the session
    setTimeout(() => activeFetches.delete(polliUrl), 15000);

  } catch (err) {
    console.error('[MoodImageProxy] Internal Error:', err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Internal server error while fetching image' }))
  }
}
