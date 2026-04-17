import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { playSoundscape, fadeOutAudio } from '../lib/audio'
import EffectsOverlay from './EffectsOverlay'
import MoodBackground from './MoodBackground'

export default function Immersion({ data, onComplete }) {
  const [timeLeft, setTimeLeft] = useState(90)
  const [currentLineIndex, setCurrentLineIndex] = useState(0)
  
  const { mood, visuals = {}, story = [], audio = {} } = data
  const { imagePrompt, colorPalette } = visuals

  useEffect(() => {
    // Start audio
    playSoundscape(audio)

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      clearInterval(timer)
      fadeOutAudio()
    }
  }, [audio])

  // Map 90s into 6 segments of 15s (if there are 6 lines)
  useEffect(() => {
    const elapsed = 90 - timeLeft
    const linesCount = story.length || 1
    const segmentDuration = 90 / linesCount
    const newIndex = Math.floor(elapsed / segmentDuration)
    
    if (newIndex < linesCount && newIndex !== currentLineIndex) {
      setCurrentLineIndex(newIndex)
    }

    if (timeLeft === 0) {
      fadeOutAudio()
      setTimeout(onComplete, 3000) // fade out buffer
    }
  }, [timeLeft, currentLineIndex, story.length, onComplete])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 2 }}
      className="fixed inset-0 z-50 overflow-hidden flex flex-col items-center justify-center bg-storybook-dark"
    >
      {/* ── Image Background Engine ── */}
      <MoodBackground
        imagePrompt={imagePrompt}
        colorPalette={colorPalette}
        mood={mood}
      />

      {/* Dynamic Visual Overlays Engine */}
      <EffectsOverlay effects={visuals.effects || []} />

      {/* Film Grain Texture for vintage Storybook feeling */}
      <div className="absolute inset-0 z-0 opacity-[0.15] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 400 400\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.95\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />

      {/* Subtitles Overlay */}
      <div className="relative z-50 w-full max-w-4xl px-8 md:px-12 py-10 rounded-3xl bg-black/40 backdrop-blur-md border border-white/10 shadow-2xl flex justify-center items-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentLineIndex}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            className="font-display text-3xl md:text-5xl text-white/95 leading-relaxed drop-shadow-[0_4px_10px_rgba(0,0,0,0.5)]"
          >
            {story[currentLineIndex] || ''}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Subtle Progress Bar */}
      <div className="absolute bottom-0 left-0 h-1 bg-white/20" style={{ width: `${((90 - timeLeft) / 90) * 100}%`, transition: 'width 1s linear' }} />
    </motion.div>
  )
}
