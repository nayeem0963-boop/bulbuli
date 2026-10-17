import { useState } from 'react'

function ModuleReadingMaterial({ material, id, tabIndex = 0 }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <section className="card module-reading-card" aria-labelledby={`${id}-heading`}>
      <div className="module-reading-heading">
        <div>
          <p className="eyebrow">Before you begin</p>
          <h2 id={`${id}-heading`}>Reading Material</h2>
        </div>
        <button
          className="button-secondary module-reading-toggle"
          type="button"
          tabIndex={tabIndex}
          aria-expanded={expanded}
          aria-controls={`${id}-content`}
          onClick={() => setExpanded((isExpanded) => !isExpanded)}
        >
          {expanded ? 'Hide Reading Material' : 'Show Reading Material'}
        </button>
      </div>
      <div
        className={`module-reading-content${expanded ? ' is-expanded' : ''}`}
        id={`${id}-content`}
        aria-hidden={!expanded}
      >
        <div className="module-reading-content-inner">
          <p>{material.introduction}</p>
          {material.keyIdeas.length > 0 && (
            <div>
              <h3>Key ideas</h3>
              <ul>
                {material.keyIdeas.map((idea) => <li key={idea}>{idea}</li>)}
              </ul>
            </div>
          )}
          {material.reviewPrompts.length > 0 && (
            <div>
              <h3>Concepts to review</h3>
              <ul>
                {material.reviewPrompts.map((prompt) => <li key={prompt}>{prompt}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default ModuleReadingMaterial
