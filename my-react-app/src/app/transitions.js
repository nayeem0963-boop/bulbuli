import { flushSync } from 'react-dom';
import { prefersReducedMotion } from '../shared/hooks/useReducedMotion.js';

/**
 * Run a state update inside a View Transition so the browser animates old screen -> new screen.
 * Falls back to a plain update when the API is missing or the player prefers reduced motion.
 * `direction` ('forward' | 'back') is exposed as <html data-nav="..."> for the CSS to read.
 */
export function withViewTransition(update, direction = 'forward') {
  if (typeof document === 'undefined' || !document.startViewTransition || prefersReducedMotion()) {
    update();
    return;
  }
  const root = document.documentElement;
  root.dataset.nav = direction;
  const transition = document.startViewTransition(() => {
    flushSync(update); // the new DOM must be ready when the callback returns
  });
  const clear = () => { delete root.dataset.nav; };
  transition.finished.then(clear, clear);
}
