export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const sec = Math.floor(seconds % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

/** Friendly length of time, like "12 minutes" or "3.5 hours". */
export function formatDuration(seconds: number): string {
  const one = (v: number, unit: string) => {
    const shown = v < 10 ? Math.round(v * 10) / 10 : Math.round(v)
    return `${shown.toLocaleString('en-US')} ${unit}${shown === 1 ? '' : 's'}`
  }
  if (seconds < 90) return one(seconds, 'second')
  if (seconds < 90 * 60) return one(seconds / 60, 'minute')
  return one(seconds / 3600, 'hour')
}
