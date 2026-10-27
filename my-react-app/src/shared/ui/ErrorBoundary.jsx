import { Component } from 'react';
import { createTranslator } from '../i18n/translator.js';
import { settings } from '../../state/settings.js';

/** Catches render errors so one bug shows a friendly card instead of a blank page. */
export default class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error, info) {
    console.error('Pro Coder crashed:', error, info.componentStack);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    const { t } = createTranslator(settings.get().lang); // no hooks here: this runs outside the provider's guarantees
    return (
      <div className="crash" role="alert">
        <h1>{t('err.title')}</h1>
        <button type="button" className="btn btn--primary btn--lg" onClick={() => { window.location.hash = '#/'; window.location.reload(); }}>
          {t('err.retry')}
        </button>
      </div>
    );
  }
}
