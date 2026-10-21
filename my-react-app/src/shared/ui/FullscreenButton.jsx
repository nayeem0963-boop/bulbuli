import { useEffect, useState } from 'react';
import { useI18n } from '../i18n/index.jsx';
import Button from './Button.jsx';

export default function FullscreenButton() {
  const { t } = useI18n();
  const [on, setOn] = useState(() => !!document.fullscreenElement);

  useEffect(() => {
    const sync = () => setOn(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  if (!document.fullscreenEnabled) return null; // e.g. iPhone Safari

  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen?.().catch(() => {});
  };
  return <Button variant="pill" aria-pressed={on} onClick={toggle}>{t(on ? 'fs.exit' : 'fs.enter')}</Button>;
}
