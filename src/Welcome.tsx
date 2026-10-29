import { useEffect, useRef } from 'react'

const SEEN = 'welcome-seen'

function seen(): boolean {
  try {
    return localStorage.getItem(SEEN) === '1'
  } catch {
    return false
  }
}

/** A short note on the first visit: what the lab is, and where its photos and AIs come from. */
export function Welcome({ onAbout }: { onAbout: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    if (!seen()) dialog.current?.showModal()
  }, [])

  const close = () => {
    try {
      localStorage.setItem(SEEN, '1')
    } catch {
      // private browsing: the note shows again next time, which is fine
    }
    dialog.current?.close()
  }

  return (
    <dialog ref={dialog} className="welcome" onCancel={close} aria-labelledby="welcome-title">
      <h2 id="welcome-title">🦋 Welcome to the Mothbox Vision Lab</h2>
      <ul>
        <li>Real insect-monitor photos, with right answers from insect experts, checked by our team.</li>
        <li>Real AI, running right in your browser.</li>
        <li>You do each job first, then see how the AI does.</li>
      </ul>
      <div className="welcome-actions">
        <button
          className="link"
          onClick={() => {
            close()
            onAbout()
          }}
        >
          How we made this site
        </button>
        <button className="primary" onClick={close} autoFocus>
          Start
        </button>
      </div>
    </dialog>
  )
}
