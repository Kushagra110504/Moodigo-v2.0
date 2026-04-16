import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

export default function Cooldown({ until, onComplete }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const calcTime = () => {
      const diff = until - Date.now()
      if (diff <= 0) {
        onComplete()
        return '00:00'
      }
      const m = Math.floor(diff / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }

    setTimeLeft(calcTime())
    const timer = setInterval(() => {
      setTimeLeft(calcTime())
    }, 1000)

    return () => clearInterval(timer)
  }, [until, onComplete])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="min-h-screen flex flex-col items-center justify-center p-6 text-center"
    >
      <div className="max-w-md w-full glass-strong rounded-3xl p-10 mt-10">
        <h2 className="font-display text-4xl text-storybook-text mb-4">You are currently resetting.</h2>
        <p className="text-storybook-dark/60 font-body mb-8">
          The sanctuary requires time to breathe before your next visit to maintain the magic of your experience.
        </p>
        
        <div className="text-6xl font-body font-light text-storybook-green mb-8">
          {timeLeft}
        </div>
        
        <p className="text-xs text-storybook-dark/40 uppercase tracking-widest">
          Return later
        </p>
      </div>
    </motion.div>
  )
}
