/* =========================================================
   PRO CODER QUIZ ENGINE
   Plays any course from src/courses (HTML today; CSS and JavaScript later).
   The course is picked with ?course=<id> and defaults to HTML.
   Markup and styles live in quiz/index.html; this file only drives them.
   ========================================================= */
import { getCourse } from '../src/courses/index.js'
import { OPTION_COUNT, validateCourse } from '../src/courses/validate.js'
import { fullInvitation, shareMessage, shareTitle } from '../src/buddies/shareMessages.js'
import { SHARE_PATHS, shareUrl } from '../src/buddies/shareLinks.js'
import { canNativeShare, copyText, nativeShare } from '../src/buddies/shareActions.js'
import { BUDDIES_TEXT } from '../src/buddies/text.js'

const BRAND = 'Pro Coder'
const course = getCourse(new URLSearchParams(window.location.search).get('course'))
const ALL_QUESTIONS = course.questions
const LEVELS = new Map(course.levels.map((level) => [level.number, level]))

/* =========================================================
   CONFIG
   ========================================================= */
const CONFIG = {
  secondsPerQuestion: 30,
  lowTimeThreshold: 10,
  basePoints: 10,       // first-try correct answer
  wrongPenalty: 3,      // minus per wrong attempt on a question
  minPoints: 1,         // floor for any correct answer (incl. after time-up)
  letters: ['A', 'B', 'C', 'D'].slice(0, OPTION_COUNT),
  sound: true,
}

/* =========================================================
   STATE
   ========================================================= */
const state = {
  questions: ALL_QUESTIONS, // this run: the whole course, or from a chosen level to the end
  startOffset: 0,           // position of questions[0] in the whole course
  index: 0,
  score: 0,
  answerState: 'intro',     // "intro" | "idle" | "correct" | "finished"
  drawerOpen: false,
  history: [],              // one entry per completed question
  q: null,                  // per-question state, see newQuestionState()
}

function newQuestionState() {
  return {
    wrongAttempts: 0,
    hintOpened: false,
    timedOut: false,
    activeMs: 0,         // time spent with the question visible & unpaused
    runningSince: null,  // Date.now() when the clock last (re)started, or null if paused
  }
}

/* =========================================================
   DOM
   ========================================================= */
const $ = (id) => document.getElementById(id)
const els = {
  courseName: $('course-name'),
  introView: $('intro-view'), introTitle: $('intro-title'), introTagline: $('intro-tagline'),
  introText: $('intro-text'), introStats: $('intro-stats'), introLevels: $('intro-levels'), startBtn: $('start-btn'),
  quizChrome: $('quiz-chrome'),
  currentNum: $('current-num'), totalNum: $('total-num'), score: $('score'),
  timer: $('timer'), timerIcon: $('timer-icon'), timerValue: $('timer-value'),
  progressTrack: $('progress-track'), progressFill: $('progress-fill'),
  quizView: $('quiz-view'), resultsView: $('results-view'),
  levelBanner: $('level-banner'), levelTag: $('level-tag'), topic: $('topic'),
  questionText: $('question-text'), optionsGrid: $('options-grid'), feedback: $('feedback'),
  hintBtn: $('hint-btn'), nextBtn: $('next-btn'),
  drawer: $('lesson-drawer'), overlay: $('drawer-overlay'), drawerClose: $('drawer-close'),
  drawerHint: $('drawer-hint'), drawerBody: $('drawer-body'), backBtn: $('back-btn'),
  resultsTitle: $('results-title'), resultsSub: $('results-sub'), resultsNext: $('results-next'),
  badge: $('badge'), badgeIcon: $('badge-icon'), badgeTitle: $('badge-title'), badgeDesc: $('badge-desc'),
  resScore: $('res-score'), resAccuracy: $('res-accuracy'), resTime: $('res-time'), resFirst: $('res-first'),
  levelBars: $('level-bars'), reviewList: $('review-list'), restartBtn: $('restart-btn'), overviewBtn: $('overview-btn'),
  fsBtn: $('fs-btn'), fsIconEnter: $('fs-icon-enter'), fsIconExit: $('fs-icon-exit'), fsLabel: $('fs-label'),
  shareBtn: $('share-btn'), shareStatus: $('share-status'),
  themeBtn: $('theme-btn'), themeSun: $('theme-icon-sun'), themeMoon: $('theme-icon-moon'), themeLabel: $('theme-label'),
}

/* =========================================================
   CLOCK
   One stopwatch per question measures ACTIVE time only.
   The countdown display is derived from it:  left = limit − active.
   It runs only while: question unanswered, drawer closed, tab visible.
   So time spent reading the lesson never counts, for the countdown
   or for the "Time Taken" on the results screen.
   ========================================================= */
const Clock = {
  tickId: null,

  canRun() {
    return state.answerState === 'idle' && !state.drawerOpen && !document.hidden
  },
  isRunning() {
    return Boolean(state.q) && state.q.runningSince !== null
  },
  activeMs() {
    if (!state.q) return 0
    return state.q.activeMs + (this.isRunning() ? Date.now() - state.q.runningSince : 0)
  },
  msLeft() {
    return Math.max(0, CONFIG.secondsPerQuestion * 1000 - this.activeMs())
  },
  /** Start if allowed (safe to call any time). */
  resume() {
    if (!state.q || this.isRunning() || !this.canRun()) return this.render()
    state.q.runningSince = Date.now()
    if (!this.tickId) this.tickId = setInterval(() => this.tick(), 250)
    this.render()
  },
  /** Bank the elapsed time and freeze. */
  pause() {
    if (this.isRunning()) {
      state.q.activeMs += Date.now() - state.q.runningSince
      state.q.runningSince = null
    }
    this.render()
  },
  tick() {
    if (state.answerState !== 'idle') return // results show the total time instead
    if (state.q && !state.q.timedOut && this.msLeft() === 0) onTimeUp()
    this.render()
  },
  render() {
    if (state.answerState === 'finished' || state.answerState === 'intro') return
    const secs = Math.ceil(this.msLeft() / 1000)
    els.timerValue.textContent = formatClock(secs)
    const cls = els.timer.classList
    const idle = state.answerState === 'idle'
    cls.toggle('done', !idle)
    cls.toggle('expired', idle && state.q && state.q.timedOut)
    cls.toggle('paused', idle && !this.isRunning() && !(state.q && state.q.timedOut))
    cls.toggle('low', idle && this.isRunning() && secs <= CONFIG.lowTimeThreshold && secs > 0)
    els.timerIcon.textContent = cls.contains('paused') ? '⏸' : cls.contains('done') ? '✔' : '⏱'
  },
}

function onTimeUp() {
  state.q.timedOut = true
  setFeedback(`⏰ Time's up! You can still answer, for ${CONFIG.minPoints} point.`, 'error')
}

/* =========================================================
   THEME
   Pro Coder's own light/dark choice: dark by default, saved on this device as
   bulbuli.pro-coder.theme. The <head> script applies a saved choice before the first paint;
   this keeps the button and the browser's theme colour in step. Switching never touches the
   quiz state, so it works mid-question and in full screen.
   ========================================================= */
const Theme = {
  KEY: 'bulbuli.pro-coder.theme',
  current() {
    return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
  },
  toggle() {
    const next = this.current() === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = next
    try { localStorage.setItem(this.KEY, next) } catch { /* not saved: fine for this visit */ }
    this.sync()
  },
  sync() {
    const light = this.current() === 'light'
    // the icon shows where the button takes you: the moon in light mode, the sun in dark mode
    // (SVG elements have no .hidden property: set the attribute itself)
    els.themeSun.toggleAttribute('hidden', light)
    els.themeMoon.toggleAttribute('hidden', !light)
    const label = light ? 'Switch to dark mode' : 'Switch to light mode'
    els.themeLabel.textContent = light ? 'Dark' : 'Light'
    els.themeBtn.title = label
    els.themeBtn.setAttribute('aria-label', label)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#f4f6fb' : '#0f172a')
  },
}

/* =========================================================
   FULLSCREEN
   Standard Fullscreen API, with the webkit-prefixed versions for older Safari.
   Full screen takes the course's own root (.app), not the page. The button stays hidden
   where full screen isn't available (e.g. iPhone Safari).
   ========================================================= */
const Fullscreen = {
  supported: Boolean(document.fullscreenEnabled || document.webkitFullscreenEnabled),
  // The course itself (.app, which also holds the lesson drawer): not the whole document.
  root: document.getElementById('app'),

  isOn() {
    return (document.fullscreenElement || document.webkitFullscreenElement || null) === this.root
  },
  async enter() {
    const el = this.root
    if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' })
    else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen()
  },
  async exit() {
    if (document.exitFullscreen) await document.exitFullscreen()
    else if (document.webkitExitFullscreen) document.webkitExitFullscreen()
  },
  async toggle() {
    try {
      if (this.isOn()) await this.exit()
      else await this.enter()
    } catch (err) {
      console.warn('Fullscreen request failed:', err)
      // say so, instead of a button that silently does nothing (the course keeps filling the window)
      Share.say('Full screen isn’t available here right now. The course still fills the window.')
    }
    this.sync() // whatever happened, the button shows the real state
  },
  /** Runs on every change, including leaving with Esc or the browser's own controls. */
  sync() {
    const on = this.isOn()
    this.root.classList.toggle('is-fullscreen', on)
    els.fsBtn.classList.toggle('is-on', on)
    els.fsIconEnter.toggleAttribute('hidden', on)
    els.fsIconExit.toggleAttribute('hidden', !on)
    els.fsLabel.textContent = on ? 'Exit full screen' : 'Full screen'
    els.fsBtn.title = on ? 'Exit full screen (F or Esc)' : 'Enter full screen (F)'
    els.fsBtn.setAttribute('aria-label', on ? 'Exit full screen' : 'Enter full screen')
  },
}

/* =========================================================
   COURSE OVERVIEW (intro screen)
   ========================================================= */
function renderIntro() {
  document.title = `${BRAND}: ${course.title} | Bulbuli`
  els.courseName.textContent = course.title
  els.introTitle.textContent = course.title
  els.introTagline.textContent = course.tagline ?? ''
  els.introText.textContent = course.intro ?? ''
  els.introStats.innerHTML = [
    `${ALL_QUESTIONS.length} questions`,
    `${course.levels.length} levels`,
    `${CONFIG.secondsPerQuestion}s per question`,
    'Hint + mini-lesson for every question',
  ].map((s) => `<li>${escapeHTML(s)}</li>`).join('')

  els.introLevels.innerHTML = ''
  course.levels.forEach((level) => {
    const count = ALL_QUESTIONS.filter((q) => q.level === level.number).length
    const li = document.createElement('li')
    li.className = 'intro-level'
    li.style.setProperty('--lvl-color', level.color)
    li.innerHTML = `
      <span class="intro-level-icon" aria-hidden="true">${level.icon}</span>
      <span class="intro-level-text">
        <span class="intro-level-name">Level ${level.number}: ${escapeHTML(level.name)}</span>
        <span class="intro-level-meta">${escapeHTML(level.difficulty ?? '')} · ${count} questions</span>
      </span>`
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'btn btn-secondary btn-small'
    btn.textContent = level.number === course.levels[0].number ? 'Start' : 'Start here'
    btn.setAttribute('aria-label', `Start at Level ${level.number}: ${level.name}`)
    btn.addEventListener('click', () => startCourse(level.number))
    li.appendChild(btn)
    els.introLevels.appendChild(li)
  })
}

function showIntro() {
  closeDrawer({ resume: false })
  Clock.pause()
  state.answerState = 'intro'
  state.q = null
  els.quizView.hidden = true
  els.resultsView.hidden = true
  els.quizChrome.hidden = true
  els.introView.hidden = false
  els.startBtn.focus()
  window.scrollTo({ top: 0 })
}

/** Starts a run at the first question of `fromLevel` (default: the first level). */
function startCourse(fromLevel = course.levels[0].number) {
  const offset = Math.max(0, ALL_QUESTIONS.findIndex((q) => q.level === fromLevel))
  state.startOffset = offset
  state.questions = ALL_QUESTIONS.slice(offset)
  state.index = 0
  state.score = 0
  state.history = []
  els.introView.hidden = true
  els.resultsView.hidden = true
  els.quizChrome.hidden = false
  els.quizView.hidden = false
  renderQuestion()
  window.scrollTo({ top: 0 })
}

/* =========================================================
   QUIZ FLOW
   ========================================================= */
function renderQuestion() {
  const q = state.questions[state.index]
  const lvl = LEVELS.get(q.level)
  const prev = state.questions[state.index - 1]
  const courseIndex = state.startOffset + state.index // position in the whole course

  state.answerState = 'idle'
  state.q = newQuestionState()

  // Header: numbers always refer to the whole course
  els.currentNum.textContent = courseIndex + 1
  els.totalNum.textContent = ALL_QUESTIONS.length
  els.score.textContent = state.score
  setProgress(courseIndex / ALL_QUESTIONS.length)

  // Level styling + banner on the first question of each level
  els.quizView.style.setProperty('--lvl-color', lvl.color)
  els.levelTag.textContent = `Level ${q.level}${lvl.difficulty ? ` · ${lvl.difficulty}` : ''}`
  els.topic.textContent = q.topic
  const newLevel = !prev || prev.level !== q.level
  els.levelBanner.hidden = !newLevel
  if (newLevel) els.levelBanner.textContent = `${lvl.icon} Level ${q.level}: ${lvl.name}`

  // Question + options
  els.questionText.innerHTML = q.question
  els.optionsGrid.innerHTML = ''
  q.options.forEach((text, i) => {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'option-btn'
    btn.dataset.index = i
    const letter = document.createElement('span')
    letter.className = 'option-letter'
    letter.textContent = CONFIG.letters[i]
    const label = document.createElement('span')
    label.className = 'option-label'
    // Code-looking options (tags, attributes) get a monospace font
    if (/^<|^[a-z:-]+="|^[a-z]+$/.test(text)) label.classList.add('is-code')
    label.textContent = text // literal text, so "<nav>" shows as typed
    btn.append(letter, label)
    btn.addEventListener('click', () => checkAnswer(i))
    els.optionsGrid.appendChild(btn)
  })

  setFeedback('')
  els.hintBtn.disabled = false
  els.timer.title = 'Time left'
  els.nextBtn.disabled = true
  els.nextBtn.textContent = state.index === state.questions.length - 1 ? 'See Results 🏁' : 'Next Question ➔'

  els.drawerHint.textContent = `💡 Hint: ${q.hint}`
  els.drawerBody.innerHTML = q.lesson
  els.drawerBody.scrollTop = 0

  Clock.resume()
}

function pointsForCurrent() {
  if (state.q.timedOut) return CONFIG.minPoints
  return Math.max(CONFIG.minPoints, CONFIG.basePoints - state.q.wrongAttempts * CONFIG.wrongPenalty)
}

function checkAnswer(optionIndex) {
  if (state.answerState !== 'idle' || state.drawerOpen) return
  const q = state.questions[state.index]
  const btn = els.optionsGrid.querySelector(`[data-index="${optionIndex}"]`)
  if (!btn || btn.disabled) return

  if (optionIndex === q.correctIndex) {
    Clock.pause()                      // bank the active time first
    state.answerState = 'correct'
    Clock.render()

    btn.classList.add('correct')
    els.optionsGrid.querySelectorAll('.option-btn').forEach((b) => (b.disabled = true))

    const points = pointsForCurrent()
    addScore(points)
    playTone(true)

    const perfect = state.q.wrongAttempts === 0 && !state.q.timedOut
    setFeedback(`${perfect ? '🎉 Correct! First try!' : '✅ Correct!'} +${points} points`, 'success')

    state.history.push({
      id: q.id, level: q.level, topic: q.topic, points,
      wrongAttempts: state.q.wrongAttempts,
      timedOut: state.q.timedOut,
      hintOpened: state.q.hintOpened,
      activeMs: state.q.activeMs,
    })
    setProgress((state.startOffset + state.index + 1) / ALL_QUESTIONS.length)

    els.nextBtn.disabled = false
    els.nextBtn.focus()
  } else {
    state.q.wrongAttempts++
    btn.classList.add('wrong')
    btn.disabled = true
    playTone(false)
    setFeedback('❌ Not quite. Try again or read the hint!', 'error')
  }
}

function nextQuestion() {
  if (state.answerState !== 'correct') return
  closeDrawer({ resume: false })
  if (state.index < state.questions.length - 1) {
    state.index++
    renderQuestion()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } else {
    showResults()
  }
}

/* =========================================================
   LESSON DRAWER (pause / resume)
   ========================================================= */
function openDrawer() {
  if (state.drawerOpen || state.answerState === 'finished' || state.answerState === 'intro') return
  state.drawerOpen = true
  if (state.answerState === 'idle') state.q.hintOpened = true
  Clock.pause()                                  // ⏸ PAUSE RULE
  els.drawer.classList.add('open')
  els.drawer.setAttribute('aria-hidden', 'false')
  els.overlay.hidden = false
  els.backBtn.focus()
}

function closeDrawer({ resume = true } = {}) {
  if (!state.drawerOpen) return
  state.drawerOpen = false
  els.drawer.classList.remove('open')
  els.drawer.setAttribute('aria-hidden', 'true')
  els.overlay.hidden = true
  if (resume) {
    if (state.answerState === 'idle') els.hintBtn.focus()
    Clock.resume()                               // ▶ RESUME RULE
  }
}

/* =========================================================
   RESULTS
   ========================================================= */
function showResults() {
  state.answerState = 'finished'
  setProgress(1)

  const total = state.questions.length
  const wholeCourse = state.startOffset === 0
  const maxScore = total * CONFIG.basePoints
  const wrongTotal = state.history.reduce((s, h) => s + h.wrongAttempts, 0)
  const firstTry = state.history.filter((h) => h.wrongAttempts === 0 && !h.timedOut).length
  const accuracy = Math.round((total / (total + wrongTotal)) * 100) // correct picks ÷ all picks
  const totalMs = state.history.reduce((s, h) => s + h.activeMs, 0)
  const scorePct = (state.score / maxScore) * 100
  const badge = course.badges.find((b) => scorePct >= b.min) ?? course.badges[course.badges.length - 1]
  const firstLevel = LEVELS.get(state.questions[0].level)
  const lastLevel = course.levels[course.levels.length - 1]

  // Swap views
  els.quizView.hidden = true
  els.resultsView.hidden = false
  els.timer.classList.remove('low', 'paused', 'expired')
  els.timer.classList.add('done')
  els.timerIcon.textContent = '✔'
  els.timerValue.textContent = formatDuration(totalMs)
  els.timer.title = 'Total active time'

  // Headline
  if (wholeCourse) {
    els.resultsTitle.textContent = `🎉 ${course.title} Complete!`
    els.resultsSub.textContent =
      `You've finished the ${BRAND} ${course.title}: all ${total} questions across ${course.levels.length} levels. ` +
      'Reading time in the lessons is not counted.'
  } else {
    els.resultsTitle.textContent = `🎉 Levels ${firstLevel.number}–${lastLevel.number} Complete!`
    els.resultsSub.textContent =
      `You answered all ${total} questions from Level ${firstLevel.number} to the end of the ${course.title}. ` +
      `Start from Level 1 to complete the whole course.`
  }
  els.resultsNext.textContent = course.nextStep ?? 'Coming next on Pro Coder: CSS, then JavaScript.'
  els.resScore.textContent = `${state.score}/${maxScore}`
  els.resAccuracy.textContent = `${accuracy}%`
  els.resTime.textContent = formatDuration(totalMs)
  els.resFirst.textContent = `${firstTry}/${total}`

  // Badge
  els.badge.style.setProperty('--badge-color', badge.color)
  els.badgeIcon.textContent = badge.icon
  els.badgeTitle.textContent = badge.title
  els.badgeDesc.textContent = badge.desc

  // Per-level mastery bars
  els.levelBars.innerHTML = ''
  course.levels.forEach((lvl) => {
    const items = state.history.filter((h) => h.level === lvl.number)
    if (!items.length) return
    const got = items.reduce((s, h) => s + h.points, 0)
    const max = items.length * CONFIG.basePoints
    const pct = Math.round((got / max) * 100)
    const row = document.createElement('div')
    row.className = 'level-row'
    row.style.setProperty('--lvl-color', lvl.color)
    row.innerHTML = `
      <div class="level-row-top">
        <span>${lvl.icon} Level ${lvl.number}: ${escapeHTML(lvl.name)}</span>
        <span class="meta">${got}/${max} · ${pct}%</span>
      </div>
      <div class="bar" role="img" aria-label="${pct}%"><div class="bar-fill"></div></div>`
    els.levelBars.appendChild(row)
    requestAnimationFrame(() => requestAnimationFrame(() => {
      row.querySelector('.bar-fill').style.width = pct + '%'
    }))
  })

  // Review list
  els.reviewList.innerHTML = state.history
    .map((h, i) => {
      const marks = [
        h.wrongAttempts ? `${h.wrongAttempts}✗` : '',
        h.hintOpened ? '💡' : '',
        h.timedOut ? '⏰' : '',
      ].filter(Boolean).join(' ')
      return `<li>
        <span>${state.startOffset + i + 1}. ${escapeHTML(h.topic)}</span>
        <span class="meta">${marks ? marks + ' · ' : ''}${formatDuration(h.activeMs)} · ${h.points} pts</span>
      </li>`
    })
    .join('')

  els.restartBtn.focus()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function restartQuiz() {
  closeDrawer({ resume: false })
  startCourse(LEVELS.get(state.questions[0].level).number)
}

/* =========================================================
   HELPERS
   ========================================================= */
function setFeedback(message, type = '') {
  els.feedback.textContent = message
  els.feedback.className = `feedback ${type}`.trim()
}

function setProgress(fraction) {
  const pct = Math.round(fraction * 100)
  els.progressFill.style.width = `${pct}%`
  els.progressTrack.setAttribute('aria-valuenow', String(pct))
}

function addScore(points) {
  state.score += points
  els.score.textContent = state.score
  els.score.classList.remove('score-bump')
  void els.score.offsetWidth // restart the animation
  els.score.classList.add('score-bump')
}

function formatClock(totalSecs) {
  const m = String(Math.floor(totalSecs / 60)).padStart(2, '0')
  const s = String(totalSecs % 60).padStart(2, '0')
  return `${m}:${s}`
}

function formatDuration(ms) {
  const secs = Math.round(ms / 1000)
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return m ? `${m}m ${String(s).padStart(2, '0')}s` : `${s}s`
}

function escapeHTML(str) {
  return String(str).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))
}

let audioCtx = null
function playTone(correct) {
  if (!CONFIG.sound) return
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)()
    const osc = audioCtx.createOscillator()
    const gain = audioCtx.createGain()
    const now = audioCtx.currentTime
    osc.type = correct ? 'sine' : 'square'
    osc.frequency.setValueAtTime(correct ? 660 : 180, now)
    if (correct) osc.frequency.linearRampToValueAtTime(990, now + 0.15)
    gain.gain.setValueAtTime(0.12, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + (correct ? 0.3 : 0.2))
    osc.connect(gain).connect(audioCtx.destination)
    osc.start(now)
    osc.stop(now + 0.3)
  } catch { /* no audio, visual feedback is enough */ }
}

/* =========================================================
   EVENTS
   ========================================================= */
els.startBtn.addEventListener('click', () => startCourse())
els.hintBtn.addEventListener('click', openDrawer)
els.drawerClose.addEventListener('click', () => closeDrawer())
els.backBtn.addEventListener('click', () => closeDrawer())
els.overlay.addEventListener('click', () => closeDrawer())
els.nextBtn.addEventListener('click', nextQuestion)
els.restartBtn.addEventListener('click', restartQuiz)
els.overviewBtn.addEventListener('click', showIntro)

// ===== Bulbuli Buddies: share this course =====
// The course's public page (https://bulbuli.org/quiz/?course=html), never this page's own address
// and nothing about the player's progress. The device's share sheet where there is one, otherwise
// the message and link go on the clipboard. The note says only what really happened.
const Share = {
  timer: 0,
  say(message) {
    clearTimeout(this.timer)
    els.shareStatus.textContent = message
    this.timer = setTimeout(() => { els.shareStatus.textContent = '' }, 4000)
  },
  async run() {
    const words = BUDDIES_TEXT.en.status
    const url = shareUrl(SHARE_PATHS.proCoder)
    const text = shareMessage('game', 'en')
    const data = { title: shareTitle('game', BRAND), text, url }
    if (canNativeShare(data)) {
      const result = await nativeShare(data)
      if (result === 'shared') return this.say(words.ready)
      if (result === 'cancelled') return this.say(words.cancelled)
    }
    const copied = await copyText(fullInvitation(text, url))
    this.say(copied ? words.copiedFallback : words.messageCopyFailed)
  },
}

els.shareBtn.addEventListener('click', () => Share.run())
els.themeBtn.addEventListener('click', () => Theme.toggle())
Theme.sync()

if (Fullscreen.supported) {
  els.fsBtn.hidden = false
  els.fsBtn.addEventListener('click', () => Fullscreen.toggle())
  document.addEventListener('fullscreenchange', () => Fullscreen.sync())
  document.addEventListener('webkitfullscreenchange', () => Fullscreen.sync())
  Fullscreen.sync()
}

// Don't count time while the tab is hidden
document.addEventListener('visibilitychange', () => {
  if (document.hidden) Clock.pause()
  else Clock.resume()
})

// Keyboard: A–D / 1–4 answer · H lesson · F fullscreen · Esc close · Enter start/next/restart
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') return closeDrawer()
  if (e.ctrlKey || e.metaKey || e.altKey) return
  if ((e.key === 'f' || e.key === 'F') && Fullscreen.supported && !e.repeat) return Fullscreen.toggle()
  if (state.drawerOpen) return
  const onButton = document.activeElement?.tagName === 'BUTTON' || document.activeElement?.tagName === 'A'
  if (state.answerState === 'intro') {
    if (e.key === 'Enter' && !onButton) startCourse()
    return
  }
  if (state.answerState === 'finished') {
    if (e.key === 'Enter' && !onButton) restartQuiz()
    return
  }
  const key = e.key.length === 1 ? e.key.toUpperCase() : ''
  let idx = CONFIG.letters.indexOf(key)
  if (idx === -1) idx = key ? '1234'.slice(0, OPTION_COUNT).indexOf(key) : -1

  if (idx !== -1) checkAnswer(idx)
  else if (key === 'H' && state.answerState === 'idle') openDrawer()
  else if (e.key === 'Enter' && !els.nextBtn.disabled && document.activeElement !== els.nextBtn) nextQuestion()
})

/* =========================================================
   INIT
   ========================================================= */
const problems = validateCourse(course)
if (problems.length) console.warn(`Check the ${course.id} course data:`, problems)

renderIntro()
showIntro()
