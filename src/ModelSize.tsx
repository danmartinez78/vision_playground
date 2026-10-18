import { useState } from 'react'

/** Ultralytics' published YOLO11 numbers (COCO, 640 pixels): docs.ultralytics.com/models/yolo11 */
const YOLO11 = [
  { name: 'YOLO11n (nano)', params: 2.6, flops: 6.5, cpuMs: 56, score: 39.5 },
  { name: 'YOLO11s (small)', params: 9.4, flops: 21.6, cpuMs: 90, score: 47.0 },
  { name: 'YOLO11m (medium)', params: 20.1, flops: 68.1, cpuMs: 183, score: 51.5 },
  { name: 'YOLO11l (large)', params: 25.3, flops: 87.2, cpuMs: 239, score: 53.4 },
  { name: 'YOLO11x (extra large)', params: 56.9, flops: 195.3, cpuMs: 463, score: 54.7 },
]
const MAX_FLOPS = YOLO11[YOLO11.length - 1].flops

/** Our own test on the AMI light-trap test photos (AP50, as a percent). */
const OURS = [
  {
    name: 'Big model (Faster R-CNN)',
    detail: 'trained mostly on moths',
    size: '330 MB',
    time: '3.6 seconds',
    score: 47,
  },
  {
    name: 'Small model (YOLO11n)',
    detail: 'trained on all kinds of insects',
    size: '11 MB',
    time: '0.09 seconds',
    score: 82,
  },
]

export function ModelSize() {
  const [guess, setGuess] = useState<number | null>(null)

  return (
    <div className="callout">
      <h3>Bigger model or smaller model?</h3>
      <p>
        A model with more numbers can learn more, but every number is math the computer has to do for every photo. So a
        bigger model needs a faster computer, more power and more time.
      </p>

      <h4>The YOLO11 family</h4>
      <p className="small">
        The company that makes YOLO trains five sizes and tests them all on the same set of everyday photos (people,
        cars, dogs and more). The bar shows how much math each one does per photo. The test score is out of 100.
      </p>
      <div className="size-chart" role="table" aria-label="YOLO11 sizes">
        <div className="size-row head" role="row">
          <span role="columnheader">Model</span>
          <span role="columnheader">Math per photo</span>
          <span role="columnheader">Test score</span>
        </div>
        {YOLO11.map((m) => (
          <div className="size-row" role="row" key={m.name}>
            <span role="cell">
              <strong>{m.name}</strong>
              <small className="muted">
                {m.params} million numbers · {m.cpuMs} ms on a computer chip (CPU)
              </small>
            </span>
            <span role="cell" className="size-bar-cell">
              <span className="size-bar" style={{ width: `${(m.flops / MAX_FLOPS) * 100}%` }} />
              <small>{m.flops} billion steps</small>
            </span>
            <span role="cell" className="size-score">
              {m.score.toFixed(1)}
            </span>
          </div>
        ))}
      </div>
      <p className="small">
        The extra large model does <strong>30 times</strong> more math than nano but scores only about 15 points higher.
        Each size up helps a little less than the one before. Scientists call this <em>diminishing returns</em>. A
        Mothbox or a phone can't carry a big graphics chip, so a small model is often the smart pick.
      </p>

      <h4>Bigger isn't always better</h4>
      {guess === null ? (
        <>
          <p>
            We tested two detectors on real light-trap photos. One is about 30 times bigger. Which one do you think
            found more of the insects?
          </p>
          <div className="group-buttons">
            {OURS.map((m, i) => (
              <button key={m.name} className="chip" onClick={() => setGuess(i)}>
                {m.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="table-scroll">
            <table className="tally compare">
              <thead>
                <tr>
                  <th></th>
                  <th>File size</th>
                  <th>Time per photo</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {OURS.map((m) => (
                  <tr key={m.name}>
                    <td>
                      <strong>{m.name}</strong>
                      <br />
                      <small className="muted">{m.detail}</small>
                    </td>
                    <td>{m.size}</td>
                    <td>{m.time}</td>
                    <td>
                      <strong>{m.score}</strong>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            {guess === 1 ? 'You got it! ' : 'Surprise! '}The small model found more. The big model learned mostly from
            moths, but most of the insects in these photos are other bugs. What a model practiced on matters as much as
            how big it is.
          </p>
          <p className="small muted">
            Score is out of 100 (AP50: how well its boxes match the insects experts boxed). Both were tested on the same
            photos, on the same computer chip.
          </p>
        </>
      )}
    </div>
  )
}
