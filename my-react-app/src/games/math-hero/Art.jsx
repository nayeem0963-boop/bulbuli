import mascot from '../../assets/math-hero-mascot-cutout.webp'

export default function MathHeroArt() {
  return (
    <div className="art art-math" aria-hidden="true">
      <span className="art-math-sum">3 + 4 = ?</span>
      <img src={mascot} alt="" width="160" height="196" loading="lazy" />
    </div>
  )
}
