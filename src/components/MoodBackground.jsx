import { useState, useRef } from 'react'
import { motion } from 'framer-motion'

/**
 * MoodBackground
 * 
 * A fail-safe, high-fidelity background engine.
 * 1. Base Layer: AI-generated color gradient.
 * 2. Primary Layer: AI-generated cinematic still image via Pollinations.
 * 3. Fallback Layer: Unsplash nature image (in case Pollinations is down).
 * 4. Animation: "Ken-Burns" slow, continuous zoom-and-pan for a living, breathing feel.
 * 5. Top Layer: Subtle Vignette to focus attention on the subtitles.
 */

export default function MoodBackground({ imagePrompt, colorPalette, mood }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const seed = useRef(Math.floor(Math.random() * 99999)).current

  console.log('[MoodBackground] Initializing with prompt:', imagePrompt)

  // Primary AI Image (Proxied securely via backend using your API key)
  const primaryImageUrl = imagePrompt
    ? `/api/image?prompt=${encodeURIComponent(imagePrompt + ", soft pastel crayon style cartoon, beautiful hand drawn 2d animation still, ultra cozy")}&seed=${seed}`
    : null;

  // Fallback: If Pollinations hits a rate limit, we safely fall back to the beautiful dynamic AI color gradient.
  // This prevents jarring, unpredictable stock photos of real people from appearing.
  const finalImageUrl = imgError ? null : primaryImageUrl;

  const fallbackGradient =
    colorPalette?.length === 3
      ? `linear-gradient(to bottom right, ${colorPalette[0]}, ${colorPalette[1]}, ${colorPalette[2]})`
      : 'linear-gradient(to bottom right, #1a1a2e, #16213e, #4a4e69)'

  return (
    <div className="absolute inset-0 overflow-hidden bg-[#050505]">
      {/* ── Layer 1: Base Gradient (Failsafe & Ambient light) ── */}
      <motion.div
        className="absolute inset-0 opacity-50 z-0"
        style={{ backgroundImage: fallbackGradient }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
      />

      {/* ── Layer 2: The Main Cinematic Image ── */}
      {finalImageUrl && (
        <motion.div
          key={finalImageUrl}
          className="absolute inset-0 z-10 pointer-events-none overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 2, ease: 'easeInOut' }}
        >
          <motion.img
            src={finalImageUrl}
            alt="Mood visualization"
            className="w-full h-full object-cover brightness-[0.9] contrast-[1.1]"
            crossOrigin="anonymous"
            onLoad={() => {
              console.log('[MoodBackground] Image loaded successfully');
              setImgLoaded(true);
            }}
            onError={(e) => {
              console.error('[MoodBackground] Primary image failed, switching to fallback', e);
              if (!imgError) setImgError(true);
            }}
            initial={{ scale: 1.0 }}
            animate={{ scale: 1.15 }}
            transition={{ duration: 120, repeat: Infinity, repeatType: 'reverse', ease: 'linear' }}
          />
        </motion.div>
      )}

      {/* ── Layer 3: Deep Immersion Vignette ── */}
      <div
        className="absolute inset-0 z-20 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at center, transparent 40%, rgba(0,0,0,0.65) 100%)',
        }}
      />
    </div>
  )
}
