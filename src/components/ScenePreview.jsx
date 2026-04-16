import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Volume2, VolumeX, RefreshCw, Maximize2, Minimize2 } from 'lucide-react'
import clsx from 'clsx'

export default function ScenePreview({ html, mood, intensity, onReset }) {
  const [isMuted, setIsMuted] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const iframeRef = useRef(null)
  const containerRef = useRef(null)

  const handleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await containerRef.current?.requestFullscreen()
        setIsFullscreen(true)
      } catch {
        // Fullscreen not available
      }
    } else {
      await document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = ''
      setTimeout(() => {
        if (iframeRef.current) iframeRef.current.srcdoc = html
      }, 50)
    }
  }

  const intensityLabel = {
    subtle: '✦ Subtle',
    medium: '✦✦ Medium',
    intense: '✦✦✦ Intense',
  }[intensity] || intensity

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="w-full h-full flex flex-col"
    >
      {/* Preview Header */}
      <div className="flex items-center justify-between px-4 py-3 glass-strong rounded-t-2xl border-b border-white/05">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-rose-500/60" />
            <div className="w-3 h-3 rounded-full bg-amber-500/60" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <span className="text-xs font-body text-white/30 truncate max-w-[180px]">
              {mood}
            </span>
            <span className="text-xs font-body text-purple-400/60">{intensityLabel}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="mute-toggle"
            onClick={() => setIsMuted(!isMuted)}
            className="glass rounded-lg p-2 text-white/40 hover:text-white/80 transition-all duration-200 hover:scale-105"
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          </button>
          <button
            id="refresh-preview"
            onClick={handleRefresh}
            className="glass rounded-lg p-2 text-white/40 hover:text-white/80 transition-all duration-200 hover:scale-105"
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button
            id="fullscreen-toggle"
            onClick={handleFullscreen}
            className="glass rounded-lg p-2 text-white/40 hover:text-white/80 transition-all duration-200 hover:scale-105"
            title="Fullscreen"
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* iframe Preview */}
      <div
        ref={containerRef}
        className={clsx(
          'relative flex-1 overflow-hidden rounded-b-2xl',
          'shadow-[0_0_60px_rgba(168,85,247,0.15)]',
        )}
        style={{ minHeight: '480px' }}
      >
        <iframe
          ref={iframeRef}
          id="scene-iframe"
          srcDoc={html}
          sandbox="allow-scripts allow-same-origin"
          className="absolute inset-0 w-full h-full border-0 rounded-b-2xl"
          title={`Moodigo scene: ${mood}`}
          allow={isMuted ? '' : 'autoplay'}
        />
        {/* Subtle vignette overlay */}
        <div
          className="absolute inset-0 pointer-events-none rounded-b-2xl"
          style={{
            background:
              'radial-gradient(ellipse at center, transparent 60%, rgba(8,6,19,0.4) 100%)',
          }}
        />
      </div>

      {/* Reset button */}
      <motion.button
        id="reset-btn"
        onClick={onReset}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="mt-4 w-full glass rounded-xl py-3 text-sm font-body text-white/40 hover:text-white/70 transition-all duration-200 border border-white/05 hover:border-white/15"
      >
        ← Try a different mood
      </motion.button>
    </motion.div>
  )
}
