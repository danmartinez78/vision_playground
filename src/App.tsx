import { useState } from 'react'
import { HowAiLearns, HowAiSees } from './HowAiSees'
import { Credits } from './Credits'
import { useLab } from './lab'
import { OwnPhoto } from './OwnPhoto'
import { StepFind } from './steps/StepFind'
import { StepLearn } from './steps/StepLearn'
import { StepNight } from './steps/StepNight'
import { StepReview } from './steps/StepReview'
import { StepSort } from './steps/StepSort'

const STEPS = [
  'Look at a photo',
  'Find the insects',
  'How the AI sees',
  'How the AI learns',
  'Name the insects',
  "Check the AI's work",
  'What did we learn?',
]

export default function App() {
  const lab = useLab()
  const [step, setStep] = useState(0)
  const [page, setPage] = useState<'lesson' | 'own' | 'credits'>('lesson')
  const ownPhoto = page !== 'lesson'
  const go = (i: number) => {
    setStep(i)
    setPage('lesson')
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
            <p>How a computer finds and names insects</p>
          </div>
        </div>
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
          <button
            className={page === 'own' ? 'step own current' : 'step own'}
            onClick={() => {
              setPage('own')
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            aria-current={page === 'own' ? 'page' : undefined}
            aria-label="Try your own photo"
          >
            <span className="num" aria-hidden>
              📷
            </span>
            <span className="label">Try your own photo</span>
          </button>
        </nav>
      </header>

      <main>
        {ownPhoto ? (
          <>
            {page === 'own' ? <OwnPhoto /> : <Credits />}
            <div className="nav-buttons">
              <button className="primary" onClick={() => go(step)}>
                ← Back to the lesson
              </button>
            </div>
          </>
        ) : (
          <>
            {step === 0 && <StepNight lab={lab} />}
            {step === 1 && lab.scene && <StepFind lab={lab} onExplain={() => go(2)} />}
            {step === 2 && lab.scene && <HowAiSees lab={lab} />}
            {step === 3 && lab.scene && <HowAiLearns lab={lab} />}
            {step === 4 && lab.scene && <StepSort lab={lab} />}
            {step === 5 && lab.scene && <StepReview lab={lab} />}
            {step === 6 && lab.scene && <StepLearn lab={lab} />}

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
        <button
          className="link"
          onClick={() => {
            setPage('credits')
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
        >
          Credits and links
        </button>
      </footer>
    </div>
  )
}
