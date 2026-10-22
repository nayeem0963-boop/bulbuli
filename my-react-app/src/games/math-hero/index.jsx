// Math Hero's screen still lives in src/routes/MathHero.jsx; this file plugs it into the arcade.
import MathHero from '../../routes/MathHero.jsx'

export default function MathHeroGame({ playerId }) {
  return <MathHero userId={playerId} />
}
