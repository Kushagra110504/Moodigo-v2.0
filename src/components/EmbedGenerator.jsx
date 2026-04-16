import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Copy, Check, Download, ChevronDown, Code2, BookOpen } from 'lucide-react'
import clsx from 'clsx'

function AccordionSection({ title, icon: Icon, children }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="glass rounded-xl overflow-hidden border border-white/08">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-white/03 transition-colors duration-200"
      >
        <div className="flex items-center gap-2">
          <Icon size={14} className="text-purple-400" />
          <span className="text-sm font-body text-white/70">{title}</span>
        </div>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown size={14} className="text-white/30" />
        </motion.div>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 text-sm font-body text-white/50 leading-relaxed border-t border-white/05 pt-3">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function EmbedGenerator({ html, mood }) {
  const [copied, setCopied] = useState(false)

  const embedSnippet = `<!-- Moodigo Embed: ${mood} -->
<div style="width:100%;height:600px;border-radius:16px;overflow:hidden;">
  <iframe
    srcdoc="${html.replace(/"/g, '&quot;')}"
    sandbox="allow-scripts"
    style="width:100%;height:100%;border:none;"
    title="Moodigo — ${mood}"
  ></iframe>
</div>`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedSnippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
      const el = document.createElement('textarea')
      el.value = embedSnippet
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `moodigo-${mood.toLowerCase().replace(/\s+/g, '-').slice(0, 40)}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="space-y-4"
    >
      <div className="flex items-center gap-2 mb-4">
        <Code2 size={16} className="text-purple-400" />
        <h3 className="text-sm font-body text-white/60 uppercase tracking-widest">Export & Embed</h3>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <motion.button
          id="copy-embed-btn"
          onClick={handleCopy}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className={clsx(
            'flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-body transition-all duration-300',
            copied
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
              : 'glass border border-white/10 text-white/60 hover:text-white/90 hover:border-purple-500/40',
          )}
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div
                key="copied"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-2"
              >
                <Check size={14} />
                <span>Copied!</span>
              </motion.div>
            ) : (
              <motion.div
                key="copy"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                className="flex items-center gap-2"
              >
                <Copy size={14} />
                <span>Copy Embed</span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>

        <motion.button
          id="download-html-btn"
          onClick={handleDownload}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          className="flex-1 flex items-center justify-center gap-2 glass rounded-xl py-3 text-sm font-body text-white/60 hover:text-white/90 border border-white/10 hover:border-purple-500/40 transition-all duration-200"
        >
          <Download size={14} />
          <span>Download HTML</span>
        </motion.button>
      </div>

      {/* Embed Preview */}
      <div className="glass rounded-xl p-4 border border-white/06">
        <p className="text-xs font-body text-white/30 mb-2 uppercase tracking-widest">Embed Snippet</p>
        <pre className="text-xs font-body text-purple-300/70 overflow-x-auto scrollbar-thin whitespace-pre-wrap break-all leading-relaxed">
          {`<iframe srcdoc="..." />`}
          {'\n'}
          <span className="text-white/20">
            {/* Full snippet available via Copy button above */}
            {html.length} bytes of self-contained HTML
          </span>
        </pre>
      </div>

      {/* Accordions */}
      <AccordionSection title="How to Embed" icon={Code2}>
        <ol className="space-y-2 list-decimal list-inside">
          <li>Click <strong className="text-white/70">Copy Embed</strong> to copy the full snippet</li>
          <li>Paste it anywhere in your HTML — a blog post, portfolio, or web app</li>
          <li>The iframe is fully self-contained; no scripts load from external servers</li>
          <li>Resize the container div to control dimensions</li>
        </ol>
      </AccordionSection>

      <AccordionSection title="Best Practices for Emotional Design" icon={BookOpen}>
        <ul className="space-y-2">
          <li>
            <strong className="text-white/70">Context matters:</strong> Subtle intensities work well
            for ambient backgrounds; intense ones shine as hero sections
          </li>
          <li>
            <strong className="text-white/70">Pair with intention:</strong> Match the mood to the
            emotional journey you want users to feel on arrival
          </li>
          <li>
            <strong className="text-white/70">Performance:</strong> All generated HTML is pure
            CSS/JS — no network requests, no layout shift
          </li>
          <li>
            <strong className="text-white/70">Accessibility:</strong> Add{' '}
            <code className="text-purple-300">prefers-reduced-motion</code> overrides for users
            who prefer less animation
          </li>
        </ul>
      </AccordionSection>
    </motion.div>
  )
}
