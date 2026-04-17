import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, Mic, Square } from 'lucide-react'
import clsx from 'clsx'

export default function MoodInput({ onSubmit, isLoading }) {
  const [mood, setMood] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const mediaRecorderRef = useRef(null)
  const audioChunksRef = useRef([])
  const textareaRef = useRef(null)

  const handleStartRecording = async (e) => {
    e.preventDefault()
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        stream.getTracks().forEach(track => track.stop())
        await processRecording(audioBlob)
      }

      mediaRecorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error('Microphone access denied:', err)
      alert("Microphone access is required to use the voice feature.")
    }
  }

  const handleStopRecording = (e) => {
    e.preventDefault()
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
    }
  }

  const processRecording = async (audioBlob) => {
    setIsTranscribing(true)
    try {
      // Convert blob to base64
      const reader = new FileReader()
      reader.readAsDataURL(audioBlob)
      reader.onloadend = async () => {
        const base64Data = reader.result.split(',')[1] // remove data:audio/webm;base64,
        
        const res = await fetch('/api/transcribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioBase64: base64Data })
        })

        if (!res.ok) {
          throw new Error('Transcription failed')
        }

        const data = await res.json()
        if (data.text) {
          setMood(prev => prev ? `${prev} ${data.text}` : data.text)
        }
        setIsTranscribing(false)
      }
    } catch (err) {
      console.error('Transcription error:', err)
      setIsTranscribing(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = mood.trim()
    if (!trimmed || isLoading || isTranscribing) return
    onSubmit(trimmed)
  }

  const charCount = mood.length
  const isValid = charCount >= 2 && charCount <= 500

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      className="relative w-full max-w-2xl mx-auto flex flex-col items-center"
    >
      {/* Background purely aesthetic pebbles */}
      <div className="absolute inset-0 -z-10 pointer-events-none scale-[1.2]">
        <div className="absolute top-[-20%] left-[-15%] w-64 h-64 bg-storybook-yellow/60 blob-pebble animate-float" style={{ animationDelay: '0s' }} />
        <div className="absolute top-[10%] right-[-20%] w-56 h-56 bg-storybook-green/30 blob-pebble animate-float" style={{ animationDelay: '-3s' }} />
        <div className="absolute bottom-[-10%] left-[10%] w-72 h-72 bg-storybook-blue/50 blob-pebble animate-float" style={{ animationDelay: '-6s' }} />
      </div>

      <div className="text-center mb-12 relative z-10 w-full pt-16">
        <motion.h1 
          className="font-display text-5xl md:text-7xl mb-4 leading-tight tracking-tight bg-gradient-to-br from-storybook-dark to-storybook-text bg-clip-text text-transparent drop-shadow-sm"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          How do you feel?
        </motion.h1>
        <motion.p 
          className="text-storybook-dark/70 font-body text-base md:text-lg max-w-md mx-auto leading-relaxed"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.5 }}
        >
          Take a deep breath and share your mood. We'll build a 90-second sanctuary entirely for you.
        </motion.p>
      </div>

      <form onSubmit={handleSubmit} className="w-full relative z-10 space-y-8 px-4">
        <div className="relative group">
          {/* Outer glowing aura */}
          <div className="absolute -inset-1 bg-gradient-to-r from-white/60 via-storybook-yellow/40 to-white/60 rounded-[2.5rem] blur-xl opacity-50 group-hover:opacity-100 transition duration-700"></div>
          
          <div className="relative bg-white/70 backdrop-blur-xl border border-white/80 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-all duration-500 overflow-hidden">
            {/* Subtle inner highlight */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent pointer-events-none rounded-[2rem]"></div>
            
            <textarea
              ref={textareaRef}
              id="mood-input"
              value={mood}
              onChange={(e) => setMood(e.target.value)}
              placeholder="e.g. A quiet rainy morning, anxious energy..."
              maxLength={500}
              rows={4}
              disabled={isLoading || isRecording || isTranscribing}
              className={clsx(
                'w-full bg-transparent px-8 py-8 text-storybook-dark placeholder-storybook-dark/30',
                'font-body text-xl resize-none outline-none focus:ring-0 relative z-10',
                (isLoading || isTranscribing) ? 'opacity-50 cursor-not-allowed' : '',
              )}
            />
            {/* Elegant Character counter & Microphone Button */}
            <div className="absolute bottom-5 left-7 z-10 flex items-center gap-3">
              <button
                type="button"
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                disabled={isLoading || isTranscribing}
                className={clsx(
                  "p-3 rounded-full transition-all duration-300 shadow-sm flex items-center gap-2",
                  isRecording 
                    ? "bg-red-500 text-white animate-pulse" 
                    : "bg-storybook-dark/5 text-storybook-dark hover:bg-storybook-dark/10"
                )}
                title={isRecording ? "Stop Recording" : "Hold or Tap to Vent"}
              >
                {isRecording ? <Square fill="currentColor" size={16} /> : <Mic size={18} />}
                {isRecording && <span className="text-xs font-semibold px-1">Recording...</span>}
              </button>
              
              {isTranscribing && (
                <div className="flex items-center gap-2 text-xs font-medium text-storybook-dark/60 animate-pulse">
                  <Loader2 size={12} className="animate-spin" />
                  Transcribing...
                </div>
              )}
            </div>

            <div className="absolute bottom-6 right-7 text-xs font-medium tracking-widest text-storybook-dark/40 z-10">
              {charCount} / 500
            </div>
          </div>
        </div>

        <div className="flex justify-center pt-6">
          <motion.button
            type="submit"
            id="generate-btn"
            disabled={!isValid || isLoading}
            whileHover={isValid && !isLoading ? { scale: 1.02 } : {}}
            whileTap={isValid && !isLoading ? { scale: 0.98 } : {}}
            className={clsx(
              'relative overflow-hidden rounded-full px-12 py-5 font-body font-semibold tracking-wider transition-all duration-500',
              'text-white shadow-xl group',
              !isValid || isLoading 
                ? 'opacity-40 cursor-not-allowed bg-storybook-text/50 shadow-none' 
                : 'bg-storybook-text hover:bg-[#1a2d13] hover:shadow-2xl hover:-translate-y-1'
            )}
          >
            {/* Super subtle inner button glow */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
            <AnimatePresence mode="wait">
              {isLoading ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2"
                >
                  <Loader2 size={18} className="animate-spin" />
                  <span>Preparing Sanctuary...</span>
                </motion.div>
              ) : (
                <motion.div
                  key="idle"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Start Immersion
                </motion.div>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </form>
    </motion.div>
  )
}
