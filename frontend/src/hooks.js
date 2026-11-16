import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from './lib/api'

/** Fetch on mount and whenever deps change. Ignores stale responses. */
export function useAsync(fn, deps, { enabled = true } = {}) {
  const [state, setState] = useState({ data: null, loading: enabled, error: null })
  const seq = useRef(0)
  const run = useCallback(async () => {
    const id = ++seq.current
    setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await fn()
      if (id === seq.current) setState({ data, loading: false, error: null })
    } catch (e) {
      if (id === seq.current) setState((s) => ({ data: s.data, loading: false, error: errorMessage(e) }))
    }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (enabled) run() }, [run, enabled])
  return { ...state, reload: run, setData: (data) => setState((s) => ({ ...s, data })) }
}

export function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value)
  useEffect(() => { const t = setTimeout(() => setV(value), ms); return () => clearTimeout(t) }, [value, ms])
  return v
}

/** Reactive CSS media query. Defaults to the desktop answer on the server / first render in tests. */
export function useMediaQuery(query) {
  const get = () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : true)
  const [matches, setMatches] = useState(get)
  useEffect(() => {
    if (!window.matchMedia) return undefined
    const mq = window.matchMedia(query)
    const on = () => setMatches(mq.matches)
    on()
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [query])
  return matches
}

/** Persisted boolean/string preference in localStorage. */
export function useStoredState(key, initial) {
  const [value, setValue] = useState(() => {
    try { const v = localStorage.getItem(key); return v === null ? initial : JSON.parse(v) } catch { return initial }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* ignore */ } }, [key, value])
  return [value, setValue]
}

const FOCUSABLE = 'a[href],button:not([disabled]),textarea:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Dialog focus management: moves focus in on open (first form field if any, else first control), keeps Tab and
 * Shift+Tab inside, closes on Escape, and returns focus to whatever opened it.
 */
export function useDialogFocus(active, ref, onClose) {
  const close = useRef(onClose)
  useEffect(() => { close.current = onClose })
  useEffect(() => {
    if (!active) return undefined
    const opener = document.activeElement
    const node = ref.current
    if (!node) return undefined
    const items = () => [...node.querySelectorAll(FOCUSABLE)].filter((e) => e.getClientRects().length > 0)
    const t = setTimeout(() => { (node.querySelector('input:not([disabled]),select:not([disabled]),textarea:not([disabled])') || items()[0] || node).focus() }, 30)
    const onKey = (e) => {
      if (e.key === 'Escape') { e.stopPropagation(); close.current?.(); return }
      if (e.key !== 'Tab') return
      const f = items()
      if (!f.length) { e.preventDefault(); return }
      const first = f[0]
      const last = f[f.length - 1]
      if (!node.contains(document.activeElement)) { e.preventDefault(); first.focus() }
      else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); document.removeEventListener('keydown', onKey); if (opener && document.contains(opener)) opener.focus?.() }
  }, [active, ref])
}
