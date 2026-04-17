import http from 'http';

const data = JSON.stringify({ mood: "I feel a bit anxious but trying to stay calm" });

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/generate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

console.log("Calling local API at http://localhost:3000/api/generate...");

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log("STATUS:", res.statusCode);
    try {
      const parsed = JSON.parse(body);
      console.log("RESPONSE JSON:", JSON.stringify(parsed, null, 2));
      
      if (parsed.visuals) {
        console.log("\n--- VISUALS CHECK ---");
        console.log("imagePrompt exists:", !!parsed.visuals.imagePrompt);
        console.log("videoPrompt exists:", !!parsed.visuals.videoPrompt);
        console.log("colorPalette length:", parsed.visuals.colorPalette?.length);
      } else {
        console.log("\n❌ ERROR: 'visuals' key missing in response!");
      }
    } catch (e) {
      console.log("FAILED TO PARSE JSON:", body);
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();
