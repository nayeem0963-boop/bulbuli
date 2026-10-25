import { useEffect, useRef } from 'react'

function isEditableTarget(target) {
  return target instanceof HTMLElement && (
    target.isContentEditable
    || target.tagName === 'INPUT'
    || target.tagName === 'TEXTAREA'
    || target.tagName === 'SELECT'
  )
}

function getNearestWord(words, character) {
  return words
    .filter((word) => (
      typeof word.target === 'string'
      && word.target.length > 0
      && word.progressIndex === 0
      && word.target[0].toLowerCase() === character
    ))
    .sort((a, b) => a.position.z - b.position.z)[0]
}

export default function useWordTyping({
  wordsRef,
  effectsRef,
  enabled = true,
  onKeystroke,
  onProgress,
  onWordComplete,
}) {
  const activeWordId = useRef(null)

  useEffect(() => {
    if (!enabled || !wordsRef || typeof window === 'undefined') return undefined
    // word ids restart at 0 every run, so never carry a target over from a previous run
    activeWordId.current = null

    const onKeyDown = (event) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || isEditableTarget(event.target)) return
      if (event.key.length !== 1) return

      const character = event.key.toLowerCase()
      const words = wordsRef.current
      if (!Array.isArray(words) || words.length === 0) {
        activeWordId.current = null
        return
      }

      let activeWord = words.find((word) => word.id === activeWordId.current)
      if (!activeWord) {
        activeWordId.current = null
        activeWord = getNearestWord(words, character)
      }

      const expected = activeWord?.target[activeWord.progressIndex]?.toLowerCase()
      const isCorrect = Boolean(activeWord && expected === character)
      onKeystroke?.(isCorrect, event, activeWord ?? null)
      if (!isCorrect) return

      activeWord.progressIndex += 1
      onProgress?.(activeWord)

      if (effectsRef) {
        effectsRef.current.push({
          position: { ...activeWord.position },
          completed: activeWord.progressIndex >= activeWord.target.length,
        })
      }

      if (activeWord.progressIndex >= activeWord.target.length) {
        activeWord.completed = true
        onWordComplete?.(activeWord)
        activeWordId.current = null
      } else {
        activeWordId.current = activeWord.id
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [enabled, wordsRef, effectsRef, onKeystroke, onProgress, onWordComplete])
}
