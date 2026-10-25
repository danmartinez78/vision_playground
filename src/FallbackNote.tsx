import type { DetectResult } from './lib/detect'

const TRY_ELSEWHERE = 'open this site on a laptop or a newer phone or tablet, in Chrome or Edge.'

/** Says plainly when the AI didn't run on this device, so the results are never mistaken for a live run. */
export function FallbackNote({ detector }: { detector: DetectResult }) {
  if (detector.engine === 'saved') {
    return (
      <p className="note fallback-note">
        <strong>This device can't run the AI itself,</strong> so you're seeing the answers the same AI gave when we ran
        it on a bigger computer. To watch it run live, {TRY_ELSEWHERE}
      </p>
    )
  }
  if (detector.engine !== 'simple') return null
  return (
    <p className="warn fallback-note">
      <strong>Heads up: this device couldn't run our trained AI.</strong> A simple spot finder looked at the photo
      instead. It isn't AI: it boxes anything darker than the sheet, so shadows and specks become false alarms. To see
      YOLO11n really work, {TRY_ELSEWHERE}
    </p>
  )
}
