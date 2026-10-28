import { useEffect, useRef } from 'react'

/**
 * Drives a native <dialog> as a modal: showModal() gives focus trapping, Esc to close,
 * a backdrop and an inert page for free. Returns props to spread on the <dialog>.
 *
 *   const dialogProps = useModalDialog(onClose)
 *   return <dialog {...dialogProps}>…</dialog>
 *
 * Mount the component to open it; unmount it to close it.
 */
export function useModalDialog(onClose) {
  const ref = useRef(null)
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
    return () => {
      if (dialog?.open) dialog.close()
    }
  }, [])

  return {
    ref,
    // Esc
    onCancel: (event) => {
      event.preventDefault()
      onCloseRef.current?.()
    },
    // a click on the backdrop lands on the <dialog> element itself
    onClick: (event) => {
      if (event.target === event.currentTarget) onCloseRef.current?.()
    },
  }
}
