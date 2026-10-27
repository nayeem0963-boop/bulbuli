import { Component } from 'react'

/** Keeps a crash in one panel (e.g. a lost WebGL context) from blanking the whole app. */
export default class ErrorBoundary extends Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    // Hook for real error reporting later (Sentry etc.).
    console.error('[voxelcraft]', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="grid h-full place-items-center rounded-2xl bg-slate-900 p-6 text-center ring-1 ring-slate-800">
        <div>
          <p className="font-display text-lg font-semibold text-white">{this.props.title ?? 'Something broke'}</p>
          <p className="mt-1 text-sm text-slate-400">Try again, or reload the page if it keeps happening.</p>
          <button
            type="button"
            onClick={() => this.setState({ error: null })}
            className="mt-4 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }
}
