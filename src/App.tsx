import { useState } from 'react'
import { HowAiLearns, HowAiSees } from './HowAiSees'
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
  const [ownPhoto, setOwnPhoto] = useState(false)
  const go = (i: number) => {
    setStep(i)
    setOwnPhoto(false)
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
              disabled={i > 0 && !lab.scene}
              aria-current={i === step && !ownPhoto ? 'step' : undefined}
            >
              <span className="num">{i + 1}</span>
              <span className="label">{name}</span>
            </button>
          ))}
          <button
            className={ownPhoto ? 'step own current' : 'step own'}
            onClick={() => {
              setOwnPhoto(true)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            aria-current={ownPhoto ? 'page' : undefined}
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
            <OwnPhoto />
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
        <a href="https://digital-naturalism-laboratories.github.io/Mothbox/" target="_blank" rel="noreferrer">
          Mothbox
        </a>{' '}
        by Digital Naturalism Laboratories. Sample nights are computer drawn; the practice identifier imitates BioCLIP.
      </footer>
    </div>
  )
}
