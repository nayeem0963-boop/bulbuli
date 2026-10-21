import { useCallback, useEffect, useRef, useState } from 'react'
import { FEEDBACK_TIMING } from '../utils/feedbackConfig.js'
import {
  playBonus,
  playCorrect,
  playGameOver,
  playLevelUp,
  playSound,
  playWrong,
} from '../utils/sound.js'

function useQuizFeedback() {
  const [feedback, setFeedback] = useState(null)
  const [milestone, setMilestone] = useState(null)
  const eventId = useRef(0)
  const feedbackTimer = useRef(null)
  const milestoneTimer = useRef(null)

  const publishFeedback = useCallback((type, target = null) => {
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current)
    const event = { id: ++eventId.current, type, target }
    setFeedback(event)
    feedbackTimer.current = window.setTimeout(() => {
      setFeedback((current) => current?.id === event.id ? null : current)
      feedbackTimer.current = null
    }, FEEDBACK_TIMING.fast)
    return event
  }, [])

  const publishMilestone = useCallback((type, message, duration = FEEDBACK_TIMING.banner) => {
    if (milestoneTimer.current !== null) window.clearTimeout(milestoneTimer.current)
    const event = { id: ++eventId.current, type, message }
    setMilestone(event)
    milestoneTimer.current = window.setTimeout(() => {
      setMilestone((current) => current?.id === event.id ? null : current)
      milestoneTimer.current = null
    }, duration)
    return event
  }, [])

  const triggerClick = useCallback(() => playSound('click'), [])
  const triggerCorrect = useCallback((target) => {
    playCorrect()
    return publishFeedback('correct', target)
  }, [publishFeedback])
  const triggerWrong = useCallback((target) => {
    playWrong()
    return publishFeedback('wrong', target)
  }, [publishFeedback])
  const triggerBonus = useCallback((message = '+1 Extra Life!') => {
    playBonus()
    return publishMilestone('bonus', message, FEEDBACK_TIMING.banner)
  }, [publishMilestone])
  const triggerLevelUp = useCallback((message = null) => {
    playLevelUp()
    return message
      ? publishMilestone('level-up', message, FEEDBACK_TIMING.banner)
      : null
  }, [publishMilestone])
  const triggerGameOver = useCallback((message = null) => {
    playGameOver()
    return message
      ? publishMilestone('game-over', message, FEEDBACK_TIMING.banner)
      : null
  }, [publishMilestone])

  const clearFeedback = useCallback(() => {
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current)
    feedbackTimer.current = null
    setFeedback(null)
  }, [])

  const clearMilestone = useCallback(() => {
    if (milestoneTimer.current !== null) window.clearTimeout(milestoneTimer.current)
    milestoneTimer.current = null
    setMilestone(null)
  }, [])

  useEffect(() => () => {
    if (feedbackTimer.current !== null) window.clearTimeout(feedbackTimer.current)
    if (milestoneTimer.current !== null) window.clearTimeout(milestoneTimer.current)
  }, [])

  return {
    feedback,
    milestone,
    triggerClick,
    triggerCorrect,
    triggerWrong,
    triggerBonus,
    triggerLevelUp,
    triggerGameOver,
    clearFeedback,
    clearMilestone,
  }
}

export default useQuizFeedback
