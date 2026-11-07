import { useLayoutEffect, useRef } from 'react';

/**
 * A ref that always holds the latest `value`, for reading current props / callbacks from event
 * handlers, timers, subscriptions and useFrame without re-subscribing.
 *
 * The ref is updated in a layout effect, i.e. after React commits and before the browser paints,
 * so render stays pure (React Compiler `refs` rule) and every callback that runs after the commit
 * (events, timers, animation frames) sees the new value. Don't read `.current` during render.
 */
export function useLatest(value) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
