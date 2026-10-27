import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { BLOCK_TYPES } from '../../level/blockTypes.js'
import { useEditorActions, useEditorTool, useLevel } from '../../level/LevelEditorProvider.jsx'
import { axisNormal, resolveTarget } from '../../level/placement.js'
import BlockLayer from './blocks/BlockLayer.jsx'
import CheckerFloor from './CheckerFloor.jsx'
import GhostCursor from './GhostCursor.jsx'

// Pointer travel (px) between down and up beyond which a "click" was really an orbit/pan drag.
const DRAG_THRESHOLD_PX = 5
const _n = new THREE.Vector3()

/** World-space face normal of a raycast hit, snapped to an axis. */
function hitNormal(e) {
  if (!e.face) return { x: 0, y: 1, z: 0 }
  _n.copy(e.face.normal).transformDirection(e.object.matrixWorld)
  return axisNormal(_n)
}

/**
 * Turns raycast hits on the floor and blocks into editor actions.
 *
 *   left click           place the selected block on the clicked face / floor cell
 *   Erase tool + click   delete the clicked block
 *   Shift + click        delete (any tool)
 *   right click (no drag) delete
 *
 * R3F already raycasts pointer events against the scene; each mesh forwards (event, block) here.
 * Hover only moves the ghost cursor and writes to hoverStore, both outside React rendering,
 * so the scene doesn't re-render while the mouse moves.
 */
/** readOnly: hover/clicks do nothing (used while framing a thumbnail). */
export default function PlacementController({ hoverStore, readOnly = false }) {
  const { level } = useLevel()
  const tool = useEditorTool()
  const actions = useEditorActions()
  const ghost = useRef(null)
  const lastHit = useRef(null)

  const levelRef = useRef(level)
  const toolRef = useRef(tool)
  const readOnlyRef = useRef(readOnly)
  useLayoutEffect(() => {
    readOnlyRef.current = readOnly
    if (readOnly) {
      lastHit.current = null
      ghost.current?.hide()
      hoverStore.set(null)
    }
  }, [readOnly, hoverStore])

  const show = useMemo(() => (hit) => {
    const target = hit && resolveTarget(hit, toolRef.current, levelRef.current)
    if (!target) {
      ghost.current?.hide()
      hoverStore.set(null)
      return null
    }
    const { blockType, paintColor } = toolRef.current
    const def = BLOCK_TYPES[blockType]
    const kind = target.action === 'erase' ? 'erase' : target.valid ? 'place' : 'invalid'
    ghost.current?.show(target.cell, kind, def.paintable ? paintColor : def.defaultColor)
    hoverStore.set(target)
    return target
  }, [hoverStore])

  // Tool or level changed under a still pointer (hotkey, undo): refresh the preview in place.
  useLayoutEffect(() => {
    levelRef.current = level
    toolRef.current = tool
    if (lastHit.current) show(lastHit.current)
  }, [level, tool, show])

  // Holding Shift flips the preview to erase without needing a mouse move.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key !== 'Shift' || !lastHit.current) return
      lastHit.current = { ...lastHit.current, erase: e.type === 'keydown' }
      show(lastHit.current)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('keyup', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('keyup', onKey)
    }
  }, [show])

  // Stable for the component's lifetime, so memo'd floor/blocks never re-render for handlers.
  const handlers = useMemo(() => {
    const toHit = (e, block) => ({
      block,
      normal: block ? hitNormal(e) : null,
      point: { x: e.point.x, y: e.point.y, z: e.point.z },
      erase: e.shiftKey,
    })
    const settle = () => {
      // After an edit the hovered geometry changed; wait for the next pointer move to re-aim.
      lastHit.current = null
      ghost.current?.hide()
    }

    return {
      onPointerMove(e, block) {
        e.stopPropagation()
        if (readOnlyRef.current) return
        lastHit.current = toHit(e, block)
        show(lastHit.current)
      },
      onPointerOut() {
        lastHit.current = null
        ghost.current?.hide()
        hoverStore.set(null)
      },
      onClick(e, block) {
        e.stopPropagation()
        if (readOnlyRef.current || e.delta > DRAG_THRESHOLD_PX) return
        const target = resolveTarget(toHit(e, block), toolRef.current, levelRef.current)
        if (!target) return
        if (target.action === 'erase') actions.removeAt(target.cell)
        else actions.placeAt(target.cell) // invalid spots play the error sound inside placeAt
        settle()
      },
      onContextMenu(e, block) {
        e.stopPropagation()
        e.nativeEvent.preventDefault()
        if (readOnlyRef.current || e.delta > DRAG_THRESHOLD_PX || !block) return // right-drag = pan
        actions.removeAt({ x: block.x, y: block.y, z: block.z })
        settle()
      },
    }
  }, [actions, hoverStore, show])

  return (
    <>
      <CheckerFloor handlers={handlers} />
      <BlockLayer blocks={level.blocks} handlers={handlers} />
      <GhostCursor ref={ghost} />
    </>
  )
}
