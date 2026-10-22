// Pattern Quest is a complete little app of its own (src/app, features, core, shared, state)
// with its own router, styles, sound and language switch. It runs in a frame so its styles
// and the arcade's never mix. The frame loads /embed/pattern-quest (see src/main.jsx).
export default function PatternQuest({ language, game }) {
  return (
    <div className="embedded-game">
      <h1 className="visually-hidden">{game.title[language]}</h1>
      <iframe
        className="embedded-game-frame"
        src={`/embed/pattern-quest?lang=${language}`}
        title={game.title[language]}
        allow="fullscreen; autoplay"
      />
    </div>
  )
}
