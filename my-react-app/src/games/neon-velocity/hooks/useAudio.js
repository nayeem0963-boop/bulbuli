import { useEffect } from 'react'
import { audio } from '../audio/AudioController'
import { runtime } from '../stores/runtime'
import { DeathCause, GameStatus, useGameStore } from '../stores/useGameStore'
import { EV, GameEvents } from '../systems/events'
import { vfx } from '../systems/vfx'

const MUSIC_STATE = {
  [GameStatus.START]: 'menu',
  [GameStatus.PLAYING]: 'playing',
  [GameStatus.PAUSED]: 'paused',
  [GameStatus.GAME_OVER]: 'gameover',
}

/**
 * Binds the AudioController to the game:
 *   - unlocks audio on the first user gesture (autoplay policy)
 *   - mirrors mute / volume settings
 *   - drives the music state from game status
 *   - maps gameplay events to sound effects
 *   - feeds run speed + surge into the music ~10×/s (filter + arrangement)
 * Mount once, in <App/>.
 */
export function useAudio() {
  useEffect(() => {
    const syncMusic = () => audio.setMusicState(MUSIC_STATE[useGameStore.getState().status])

    // 1. Unlock on first gesture — then keep listening in case the context gets suspended again (iOS)
    const unlock = () => {
      // resume() is async; sync the music once the context is actually running
      audio.unlock().then((ok) => { if (ok) syncMusic() })
    }
    // browsers allow this once the page has had any click, e.g. the launcher's Start button
    unlock()
    const gestureOpts = { passive: true }
    window.addEventListener('pointerdown', unlock, gestureOpts)
    window.addEventListener('keydown', unlock, gestureOpts)
    window.addEventListener('touchend', unlock, gestureOpts)

    // 2. Settings
    const settingsKey = (s) => `${s.muted}|${s.musicVolume}|${s.sfxVolume}`
    const applySettings = () => {
      const { muted, musicVolume, sfxVolume } = useGameStore.getState()
      audio.applySettings({ muted, musicVolume, sfxVolume })
    }
    applySettings()
    const offSettings = useGameStore.subscribe(settingsKey, applySettings)

    // 3. Status → music
    const offStatus = useGameStore.subscribe((s) => s.status, (status) => {
      syncMusic()
      if (status === GameStatus.GAME_OVER && useGameStore.getState().deathCause === DeathCause.CRASH) {
        audio.play('crash')
      }
    })

    // 4. Events → SFX
    const on = GameEvents.on
    const offs = [
      on(EV.JUMP, () => audio.play('jump')),
      on(EV.DOUBLE_JUMP, () => audio.play('doubleJump')),
      on(EV.WALL_JUMP, () => audio.play('wallJump')),
      on(EV.LAND, ({ impact }) => { if (impact > 6) audio.play('land', { impact }) }),
      on(EV.SLIDE, () => audio.play('slide')),
      on(EV.SLAM, () => audio.play('slam')),
      on(EV.SLAM_LAND, () => audio.play('slamLand')),
      on(EV.GRIND_START, () => { audio.play('grindStart'); audio.startLoop('grind') }),
      on(EV.GRIND_END, () => audio.stopLoop('grind')),
      on(EV.WALLRUN_START, () => audio.play('wallrun')),
      on(EV.PICKUP, ({ variant }) => audio.pickup(variant)),
      on(EV.HIT, () => { audio.play('hit'); audio.stopLoop('grind'); audio.impactDuck() }),
      on(EV.SMASH, () => audio.play('smash')),
      on(EV.SURGE_START, () => audio.play('surgeStart')),
      on(EV.SURGE_END, () => audio.play('surgeEnd')),
      on(EV.SPEED_UP, ({ tier }) => audio.play('speedUp', { tier })),
      on(EV.FALL, () => audio.play('fall')),
    ]

    // 5. Continuous intensity
    const interval = setInterval(() => audio.setIntensity(runtime.speedFactor, vfx.surge), 100)

    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('touchend', unlock)
      offSettings()
      offStatus()
      offs.forEach((off) => off())
      clearInterval(interval)
      audio.shutdown()
    }
  }, [])
}
