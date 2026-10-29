import { useState } from 'react'
import { HowAiLearns, HowAiSees } from './HowAiSees'
import { HowWeMade } from './HowWeMade'
import { Welcome } from './Welcome'
import { useLab } from './lab'
import { firstOpenStep, todosFor } from './lib/progress'
import { OwnPhoto } from './OwnPhoto'
import { StepFind } from './steps/StepFind'
import { StepLearn } from './steps/StepLearn'
import { StepNight } from './steps/StepNight'
import { StepReview } from './steps/StepReview'
import { StepSort } from './steps/StepSort'

const STEPS = ['Look at a photo', 'Find the insects', 'Moth or not?', "Check the AI's work", 'What did we learn?']

type Page = 'lesson' | 'own' | 'ai' | 'about'

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
  // the step whose unfinished jobs are listed, after a try to skip past it
  const [blocked, setBlocked] = useState<number | null>(null)
  const go = (i: number) => {
    setStep(i)
    setBlocked(null)
    setPage('lesson')
  }
  /** Go to a step, or, if an earlier one isn't finished, show what's left there and point at it. */
  const tryGo = (i: number) => {
    const open = firstOpenStep(lab, i)
    if (open === i) return go(i)
    setStep(open)
    setPage('lesson')
    setBlocked(open)
    const first = todosFor(lab, open)[0]
    window.setTimeout(() => {
      const el = first && document.getElementById(first.target)
      if (!el) return
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.remove('attention')
      void el.offsetWidth
      el.classList.add('attention')
      window.setTimeout(() => el.classList.remove('attention'), 2400)
    }, 50)
  }
  const todos = blocked === step ? todosFor(lab, step) : []
  const openStep = firstOpenStep(lab, STEPS.length - 1)
  const openAi = (part: 'sees' | 'learns' = 'sees') => {
    setAiPart(part)
    setPage('ai')
  }

  return (
    <div className="app">
      <Welcome onAbout={() => setPage('about')} />
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
              className={
                (i === step && !ownPhoto ? 'step current' : i < step ? 'step done' : 'step') +
                (i > openStep ? ' locked' : '')
              }
              onClick={() => tryGo(i)}
              aria-label={`Step ${i + 1}: ${name}`}
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
            {page === 'about' && <HowWeMade />}
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
            {step === 3 && lab.scene && <StepReview lab={lab} />}
            {step === 4 && lab.scene && <StepLearn lab={lab} onOwn={() => setPage('own')} onAi={() => openAi()} />}

            {todos.length > 0 && (
              <div className="warn todo" role="alert">
                <strong>Before you go on:</strong>
                <ul>
                  {todos.map((t) => (
                    <li key={t.target}>{t.text}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="nav-buttons">
              {step > 0 && (
                <button className="ghost" onClick={() => go(step - 1)}>
                  ← Back
                </button>
              )}
              {step < STEPS.length - 1 && (
                <button className="primary" onClick={() => tryGo(step + 1)}>
                  Next: {STEPS[step + 1]} →
                </button>
              )}
            </div>
          </>
        )}
      </main>

      <footer className="small muted">
        A practice lab for our FIRST LEGO League team, inspired by the open-source{' '}
        <a href="https://mothbox.org/" target="_blank" rel="noreferrer">
          Mothbox
        </a>{' '}
        insect monitor by Digital Naturalism Laboratories.{' '}
        <button className="link" onClick={() => setPage('about')}>
          How we made this site
        </button>
      </footer>
    </div>
  )
}
