import { useEffect, useState } from 'react';
import { Maximize, Minimize } from 'lucide-react';
import { useI18n } from '../i18n/index.jsx';
import {
  canRequestFullscreen, exitFullscreen, fullscreenElement, onFullscreenChange, requestFullscreen,
} from '../lib/fullscreen.js';
import Button from './Button.jsx';

/**
 * Pattern Quest's full-screen button, in its own top bar. Pattern Quest is a whole app; inside the
 * arcade it runs in a frame (allow="fullscreen"), so full screen on this document makes that frame,
 * i.e. the game itself, fill the screen. The label follows the browser's real state (Esc too).
 */
export default function FullscreenButton() {
  const { t } = useI18n();
  const [on, setOn] = useState(() => !!fullscreenElement());

  useEffect(() => onFullscreenChange(() => setOn(!!fullscreenElement())), []);

  if (!canRequestFullscreen(document.documentElement)) return null; // e.g. iPhone Safari

  const toggle = () => {
    if (fullscreenElement()) exitFullscreen();
    else requestFullscreen(document.documentElement).catch(() => {});
  };
  const label = t(on ? 'fs.exit' : 'fs.enter');
  const Icon = on ? Minimize : Maximize;
  return (
    <Button variant="pill" className="fs-button" onClick={toggle} title={label} aria-label={label}>
      <Icon aria-hidden="true" focusable="false" size={18} strokeWidth={2.75} />
      <span className="fs-button-label">{label}</span>
    </Button>
  );
}
