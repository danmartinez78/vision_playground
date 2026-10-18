import { useState } from 'react'
import { HowAiLearns, HowAiSees } from './HowAiSees'
import { Credits } from './Credits'
import { useLab } from './lab'
import { OwnPhoto } from './OwnPhoto'
import { StepFind } from './steps/StepFind'
import { StepLearn } from './steps/StepLearn'
import { StepNight } from './steps/StepNight'
import { StepName } from './steps/StepName'
import { StepReview } from './steps/StepReview'
import { StepSort } from './steps/StepSort'

const STEPS = [
  'Look at a photo',
  'Find the insects',
  'Moth or not?',
  'Name the moth',
  "Check the AI's work",
  'What did we learn?',
]

type Page = 'lesson' | 'own' | 'ai' | 'credits'

export default function App() {
  const lab = useLab()
  const [step, setStep] = useState(0)
  const [page, setPageRaw] = useState<Page>('lesson')
  const [aiPart, setAiPart] = useState<'sees' | 'learns'>('sees')
  const ownPhoto = page !== 'lesson'
  const setPage = (p: Page) => {
    setPageRaw(p)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  const go = (i: number) => {
    setStep(i)
    setPage('lesson')
  }
  const openAi = (part: 'sees' | 'learns' = 'sees') => {
    setAiPart(part)
    setPage('ai')
  }

  return (
    <div className="app">
      <header className="top">
        <div className="brand">
          <span className="logo" aria-hidden>
            🦋
          </span>
          <div>
            <h1>Mothbox Vision Lab</h1>
            <p>How a computer finds insects and spots the moths</p>
          </div>
        </div>
        <nav className="extras" aria-label="Extras">
          <button
            className={page === 'ai' ? 'step extra current' : 'step extra'}
            onClick={() => openAi()}
            aria-current={page === 'ai' ? 'page' : undefined}
            aria-label="How the AI works"
          >
            <span className="num" aria-hidden>
              🧠
            </span>
            <span className="label">How the AI works</span>
          </button>
          <button
            className={page === 'own' ? 'step extra current' : 'step extra'}
            onClick={() => setPage('own')}
            aria-current={page === 'own' ? 'page' : undefined}
            aria-label="Try your own photo"
          >
            <span className="num" aria-hidden>
              📷
            </span>
            <span className="label">Try your own photo</span>
          </button>
        </nav>
        <nav className="stepper" aria-label="Lesson steps">
          {STEPS.map((name, i) => (
            <button
              key={name}
              className={i === step && !ownPhoto ? 'step current' : i < step ? 'step done' : 'step'}
              onClick={() => go(i)}
              aria-label={`Step ${i + 1}: ${name}`}
              disabled={i > 0 && !lab.scene}
              aria-current={i === step && !ownPhoto ? 'step' : undefined}
            >
              <span className="num">{i + 1}</span>
              <span className="label">{name}</span>
            </button>
          ))}
        </nav>
      </header>

      <main>
        {ownPhoto ? (
          <>
            {page === 'own' && <OwnPhoto />}
            {page === 'credits' && <Credits />}
            {page === 'ai' && (
              <>
                <div className="intro">
                  <h2>How the AI works</h2>
                  <p>
                    Extra for curious minds: what's going on inside the computer's detector. You don't need this to
                    finish the lesson.
                  </p>
                  <div className="tool-switch ai-tabs" role="tablist">
                    <button
                      role="tab"
                      aria-selected={aiPart === 'sees'}
                      className={aiPart === 'sees' ? 'on' : ''}
                      onClick={() => openAi('sees')}
                    >
                      1. How the AI sees
                    </button>
                    <button
                      role="tab"
                      aria-selected={aiPart === 'learns'}
                      className={aiPart === 'learns' ? 'on' : ''}
                      onClick={() => openAi('learns')}
                    >
                      2. How the AI learns
                    </button>
                  </div>
                </div>
                {aiPart === 'sees' ? <HowAiSees lab={lab} /> : <HowAiLearns lab={lab} />}
                {aiPart === 'sees' && (
                  <div className="nav-buttons">
                    <button className="primary" onClick={() => openAi('learns')}>
                      Next: How the AI learns →
                    </button>
                  </div>
                )}
              </>
            )}
            <div className="nav-buttons">
              <button className="primary" onClick={() => go(step)}>
                ← Back to the lesson
              </button>
            </div>
          </>
        ) : (
          <>
            {step === 0 && <StepNight lab={lab} />}
            {step === 1 && lab.scene && <StepFind lab={lab} onExplain={() => openAi()} />}
            {step === 2 && lab.scene && <StepSort lab={lab} />}
            {step === 3 && lab.scene && <StepName key={lab.scene.key} lab={lab} />}
            {step === 4 && lab.scene && <StepReview lab={lab} />}
            {step === 5 && lab.scene && <StepLearn lab={lab} onOwn={() => setPage('own')} onAi={() => openAi()} />}

            <div className="nav-buttons">
              {step > 0 && (
                <button className="ghost" onClick={() => go(step - 1)}>
                  ← Back
                </button>
              )}
              {step < STEPS.length - 1 && (
                <button className="primary" onClick={() => go(step + 1)} disabled={!lab.scene}>
                  Next: {STEPS[step + 1]} →
                </button>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="small muted">
        A practice lab for our FIRST LEGO League team, based on the open-source{' '}
        <a href="https://mothbox.org/" target="_blank" rel="noreferrer">
          Mothbox
        </a>{' '}
        by Digital Naturalism Laboratories.{' '}
        <button className="link" onClick={() => setPage('credits')}>
          Credits and links
        </button>
      </footer>
    </div>
  )
}
