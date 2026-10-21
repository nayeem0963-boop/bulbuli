import { forwardRef } from 'react';
import { play } from '../audio/sound.js';
import { cx } from '../lib/cx.js';

/**
 * The one button. `variant`: plain | primary | accent | pill. `sound`: a sound name, or false.
 */
const Button = forwardRef(function Button({ variant = 'plain', size = 'md', sound = 'click', onClick, className, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      type="button"
      className={cx('btn', `btn--${variant}`, `btn--${size}`, className)}
      onClick={(e) => {
        if (sound) play(sound);
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
});

export default Button;
