// Entry point for Pattern Quest inside its frame. Loads only Pattern Quest's own styles.
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../../app/App.jsx'
import { I18nProvider } from '../../shared/i18n/index.jsx'
import ErrorBoundary from '../../shared/ui/ErrorBoundary.jsx'
import { setLang } from '../../state/settings.js'
import '../../styles/index.css'

const requested = new URLSearchParams(window.location.search).get('lang')
if (requested === 'en' || requested === 'bn') setLang(requested)

export function mount(element) {
  createRoot(element).render(
    <StrictMode>
      <ErrorBoundary>
        <I18nProvider>
          <App />
        </I18nProvider>
      </ErrorBoundary>
    </StrictMode>,
  )
}
