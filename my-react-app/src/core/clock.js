/**
 * A countdown that lives outside React. Components read it two ways:
 *  - `useClockSecond(clock)` re-renders once per whole second (labels, ticking sound)
 *  - a requestAnimationFrame loop calls `remaining()` to draw a smooth bar without re-rendering
 *
 * `now` and the timer functions are injectable so tests can run with a fake clock.
 */
export class Clock {
  #left = 0;        // seconds left at the moment `#since` was taken
  #since = 0;
  #running = false;
  #second = 0;      // whole seconds, rounded up: the value subscribers see
  #total = 1;
  #timer = null;
  #listeners = new Set();

  // The timer defaults are wrapped in arrows on purpose: browsers throw "Illegal invocation"
  // if setInterval is called with the Clock as `this`.
  constructor({ cap = Infinity, tickMs = 100, onExpire = () => {}, now = () => performance.now(), setTimer = (fn, ms) => setInterval(fn, ms), clearTimer = (id) => clearInterval(id) } = {}) {
    this.cap = cap;
    this.tickMs = tickMs;
    this.onExpire = onExpire;
    this.now = now;
    this.setTimer = setTimer;
    this.clearTimer = clearTimer;
  }

  /** Reset to `seconds` and start counting down. */
  start(seconds) {
    this.#total = seconds;
    this.#left = seconds;
    this.#since = this.now();
    this.#running = true;
    this.#sync();
    this.#ensureTimer();
  }

  pause() {
    if (!this.#running) return;
    this.#left = this.remaining();
    this.#running = false;
    this.#stopTimer();
  }

  resume() {
    if (this.#running || this.#left <= 0) return;
    this.#since = this.now();
    this.#running = true;
    this.#ensureTimer();
  }

  /** Add (or subtract) seconds, clamped to [0, cap]. Fires onExpire if it reaches zero. */
  add(seconds) {
    const next = Math.max(0, Math.min(this.cap, this.remaining() + seconds));
    this.#left = next;
    this.#since = this.now();
    this.#total = Math.max(this.#total, next);
    this.#sync();
    if (next <= 0) this.#expire();
  }

  remaining() {
    if (!this.#running) return this.#left;
    return Math.max(0, this.#left - (this.now() - this.#since) / 1000);
  }

  /** Share of the original time that is left (0..1). */
  fraction() {
    return Math.min(1, this.remaining() / this.#total);
  }

  get running() { return this.#running; }
  get total() { return this.#total; }

  /** Stop timers. The clock can be started again afterwards. */
  dispose() {
    this.#running = false;
    this.#stopTimer();
  }

  tick() {
    if (!this.#running) return;
    this.#sync();
    if (this.remaining() <= 0) this.#expire();
  }

  // useSyncExternalStore contract
  subscribe = (fn) => {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  };
  getSecond = () => this.#second;

  #sync() {
    const s = Math.ceil(this.remaining());
    if (s !== this.#second) {
      this.#second = s;
      this.#listeners.forEach((fn) => fn());
    }
  }

  #expire() {
    this.#left = 0;
    this.#running = false;
    this.#stopTimer();
    this.#sync();
    this.onExpire();
  }

  #ensureTimer() {
    if (!this.#timer) this.#timer = this.setTimer(() => this.tick(), this.tickMs);
  }

  #stopTimer() {
    if (this.#timer) {
      this.clearTimer(this.#timer);
      this.#timer = null;
    }
  }
}
