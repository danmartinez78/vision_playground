import type { DetectResult } from './lib/detect'

/** A clear warning when the trained AI couldn't run, so a pile of false alarms isn't blamed on it. */
export function FallbackNote({ detector }: { detector: DetectResult }) {
  if (detector.engine !== 'simple') return null
  return (
    <p className="warn fallback-note">
      <strong>Heads up: this device couldn't run our trained AI.</strong> A simple spot finder looked at the photo
      instead. It isn't AI: it boxes anything darker than the sheet, so shadows and specks become false alarms. To see
      YOLO11n really work, open this site on a laptop or a newer phone or tablet, in Chrome or Edge.
    </p>
  )
}
