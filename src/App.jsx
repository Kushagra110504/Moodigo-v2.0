import { useState, useCallback, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, X } from 'lucide-react'
import MoodInput from './components/MoodInput'
import Immersion from './components/Immersion'
import Cooldown from './components/Cooldown'
import { initAudio } from './lib/audio'

function ErrorBanner({ message, onDismiss }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4"
    >
      <div className="bg-red-50/90 backdrop-blur-md rounded-xl px-4 py-3 flex items-start gap-3 border border-red-200 shadow-lg">
        <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm font-body text-red-800 flex-1">{message}</p>
        <button
          onClick={onDismiss}
          className="text-red-400 hover:text-red-600 transition-colors duration-200 flex-shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  )
}

export default function App() {
  const [phase, setPhase] = useState('checking') // checking | idle | loading | immersion | cooldown
  const [cooldownUntil, setCooldownUntil] = useState(0)
  const [sessionData, setSessionData] = useState(null)
  const [error, setError] = useState(null)

  // Initialization & Cooldown Check
  useEffect(() => {
    const saved = localStorage.getItem('moodigo_cooldown')
    if (saved) {
      const until = parseInt(saved, 10)
      if (until > Date.now()) {
        setCooldownUntil(until)
        setPhase('cooldown')
        return
      } else {
        localStorage.removeItem('moodigo_cooldown')
      }
    }
    setPhase('idle')
  }, [])

  const handleGenerate = useCallback(async (mood) => {
    setError(null)
    setPhase('loading')

    // Initialize/resume audio context synchronously on user click 
    // to bypass browser autoplay restrictions before the async API call.
    initAudio()

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mood }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Server error: ${res.status}`)
      }

      const data = await res.json()
      if (!data.visuals || !data.story || !data.audio) {
        throw new Error('AI returned an incomplete experience payload.')
      }

      setSessionData({ visuals: data.visuals, story: data.story, audio: data.audio })
      setPhase('immersion')
    } catch (err) {
      if (err.message.includes('Failed to fetch')) {
        setError('Lost connection to the backend. Please ensure npm run dev:api is running in a terminal.')
      } else {
        setError(err.message || 'Something went wrong. Please try again.')
      }
      setPhase('idle')
    }
  }, [])

  const handleImmersionComplete = useCallback(() => {
    // Set 5 minute cooldown
    const until = Date.now() + 5 * 60 * 1000
    localStorage.setItem('moodigo_cooldown', until.toString())
    setCooldownUntil(until)
    setSessionData(null)
    setPhase('cooldown')
  }, [])

  const handleCooldownComplete = useCallback(() => {
    localStorage.removeItem('moodigo_cooldown')
    setPhase('idle')
  }, [])

  if (phase === 'checking') return null

  return (
    <div className="relative min-h-screen text-storybook-text overflow-hidden bg-storybook-base">

      <AnimatePresence>
        {error && (
          <ErrorBanner
            message={error}
            onDismiss={() => setError(null)}
          />
        )}
      </AnimatePresence>

      <main className="relative z-10 min-h-screen">
        <AnimatePresence mode="wait">
          
          {(phase === 'idle' || phase === 'loading') && (
            <motion.div
              key="input-phase"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6 }}
              className="min-h-screen flex flex-col items-center justify-center p-4"
            >
              <MoodInput
                onSubmit={handleGenerate}
                isLoading={phase === 'loading'}
              />
            </motion.div>
          )}

          {phase === 'immersion' && sessionData && (
            <Immersion 
              key="immersion-phase"
              data={sessionData} 
              onComplete={handleImmersionComplete} 
            />
          )}

          {phase === 'cooldown' && (
            <Cooldown 
              key="cooldown-phase"
              until={cooldownUntil} 
              onComplete={handleCooldownComplete} 
            />
          )}

        </AnimatePresence>
      </main>
    </div>
  )
}
