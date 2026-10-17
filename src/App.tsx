import { useState } from 'react'
import { HowAiSees } from './HowAiSees'
import { useLab } from './lab'
import { StepFind } from './steps/StepFind'
import { StepLearn } from './steps/StepLearn'
import { StepNight } from './steps/StepNight'
import { StepReview } from './steps/StepReview'
import { StepSort } from './steps/StepSort'

const STEPS = ['The night', 'Find the bugs', 'Sort the crops', 'Be the reviewer', 'What did we learn?']

export default function App() {
  const lab = useLab()
  const [step, setStep] = useState(0)
  const [explainer, setExplainer] = useState(false)
  const go = (i: number) => {
    setStep(i)
    setExplainer(false)
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
              className={i === step && !explainer ? 'step current' : i < step ? 'step done' : 'step'}
              onClick={() => go(i)}
              disabled={i > 0 && !lab.scene}
              aria-current={i === step && !explainer ? 'step' : undefined}
            >
              <span className="num">{i + 1}</span>
              <span className="label">{name}</span>
            </button>
          ))}
          <button
            className={explainer ? 'step explain current' : 'step explain'}
            onClick={() => {
              setExplainer(true)
              window.scrollTo({ top: 0, behavior: 'smooth' })
            }}
            aria-current={explainer ? 'page' : undefined}
          >
            <span className="num" aria-hidden>
              🔍
            </span>
            <span className="label">How the AI sees</span>
          </button>
        </nav>
      </header>

      <main>
        {explainer ? (
          <>
            <HowAiSees lab={lab} />
            <div className="nav-buttons">
              <button className="primary" onClick={() => go(step)}>
                ← Back to the lesson
              </button>
            </div>
          </>
        ) : (
          <>
            {step === 0 && <StepNight lab={lab} />}
            {step === 1 && lab.scene && <StepFind lab={lab} onExplain={() => setExplainer(true)} />}
            {step === 2 && lab.scene && <StepSort lab={lab} />}
            {step === 3 && lab.scene && <StepReview lab={lab} />}
            {step === 4 && lab.scene && <StepLearn lab={lab} />}

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
