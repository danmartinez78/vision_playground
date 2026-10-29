import { AI_COLOR, YOU_COLOR, type LabResults } from './results'
import { formatDuration, formatTime } from './time'

export interface ResultsNotes {
  team: string
  learned: string
  sensor: string
}

export const LEARNED_STARTER = 'The computer was better at ___, but we were better at ___.'
export const SENSOR_STARTER = 'A sensor with AI could help our project by ___.'
export const SENSOR_LINE =
  'Our team is designing a Mothbox-like sensor to use before and after a treatment: find out which pests are there, treat only where they are, then count again to see if the treatment worked.'

const n = (v: number | null) => (v === null ? '—' : String(v))

/** "You vs. the AI" rows: label, you, AI. */
export function findRows(r: LabResults): Array<[string, string, string]> {
  const rows: Array<[string, string, string]> = []
  if (r.insects !== null)
    rows.push(['Insects found', `${n(r.you.found)} of ${r.insects}`, `${n(r.ai.found)} of ${r.insects}`])
  else rows.push(['Boxes drawn', String(r.you.boxes), n(r.ai.found)])
  if (r.insects !== null) {
    rows.push(['Missed', n(r.you.missed), n(r.ai.missed)])
    rows.push(['False alarms', n(r.you.falseAlarms), n(r.ai.falseAlarms)])
  }
  rows.push([
    'Time',
    r.you.seconds === null ? '—' : formatTime(r.you.seconds),
    r.ai.saved ? 'run ahead of time' : r.ai.seconds === null ? '—' : `${r.ai.seconds.toFixed(2)} seconds`,
  ])
  return rows
}

/** Short lines about sorting, checking and scaling up. */
export function resultLines(r: LabResults): string[] {
  const lines: string[] = []
  if (r.sort)
    lines.push(
      `Moth or not: we got ${r.sort.you} of ${r.sort.scored} right, the AI got ${r.sort.ai} of ${r.sort.scored}.`,
    )
  if (r.review)
    lines.push(
      `Checking the AI: we checked its ${r.review.checked} least-sure answers${r.review.aiWrong ? ` and fixed ${r.review.fixed} of its ${r.review.aiWrong} ${r.review.aiWrong === 1 ? 'mistake' : 'mistakes'}` : ', and it had them all right'}. AI alone: ${r.review.aiAlone} of ${r.review.scored} right. AI + us: ${r.review.team} of ${r.review.scored}.`,
    )
  if (r.scaleUp)
    lines.push(
      `One night of photos (about 300): by hand ${formatDuration(r.scaleUp.hand)}, computer + people ${formatDuration(r.scaleUp.team)}, computer alone ${formatDuration(r.scaleUp.computer)}.`,
    )
  return lines
}

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function block(label: string, v: string): string {
  const t = v.trim()
  return `<div class="write"><strong>${esc(label)}</strong><p>${t ? esc(t).replace(/\n/g, '<br>') : '<span class="blank">&nbsp;</span>'}</p></div>`
}

/** A one-page printable report of the student's results. */
export function resultsReportHtml(r: LabResults, notes: ResultsNotes, photo: string | null, now = new Date()): string {
  const safePhoto = photo && /^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(photo) ? photo : null
  const team = notes.team.trim()
  const date = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const rows = findRows(r)
    .map(([k, a, b]) => `<tr><th>${esc(k)}</th><td>${esc(a)}</td><td>${esc(b)}</td></tr>`)
    .join('')
  const scale = r.scaleUp
    ? (() => {
        const max = r.scaleUp.hand || 1
        const bar = (label: string, s: number, color: string) =>
          `<div class="race"><span>${esc(label)}</span><span class="bar"><i style="width:${Math.max(1.5, (s / max) * 100).toFixed(1)}%;background:${color}"></i></span><strong>${esc(formatDuration(s))}</strong></div>`
        return `<h2>One night of photos (about 300)</h2>${bar('By hand', r.scaleUp.hand, '#94a3b8')}${bar('Computer + people', r.scaleUp.team, '#7c3aed')}${bar('Computer alone', r.scaleUp.computer, AI_COLOR)}`
      })()
    : ''
  const lines = resultLines(r)
    .filter((l) => !l.startsWith('One night'))
    .map((l) => `<li>${esc(l)}</li>`)
    .join('')
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Our Results · Mothbox Vision Lab</title><style>
body{font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#1e293b;max-width:860px;margin:0 auto;padding:20px;line-height:1.4;font-size:14px}
h1{margin:0;font-size:24px;color:#5b21b6}h2{font-size:16px;margin:12px 0 4px;color:#5b21b6}.meta{color:#64748b;margin:2px 0 10px}
.photo{width:100%;border-radius:6px;border:1px solid #cbd5e1}.key{font-size:12.5px;color:#475569;margin:4px 0}.key i{display:inline-block;width:12px;height:12px;border:3px solid;margin:0 4px -2px 10px}.key i:first-child{margin-left:0}
table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:4px 8px;text-align:left}thead th{background:#f1f5f9}tbody th{width:30%;font-weight:600;color:#475569}
ul{margin:4px 0;padding-left:20px}.race{display:grid;grid-template-columns:150px 1fr 110px;gap:8px;align-items:center;margin:3px 0}.bar{background:#f1f5f9;border-radius:4px;height:14px;display:block}.bar i{display:block;height:100%;border-radius:4px}
.sensor{background:#f5f3ff;border:1px solid #ddd6fe;border-radius:8px;padding:6px 10px;margin:10px 0}
.write{margin:6px 0}.write strong{display:block;font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.4px}.write p{margin:2px 0}.blank{display:block;border-bottom:1px solid #94a3b8;height:1.6em}
.actions{margin:8px 0}.actions button{font:inherit;padding:6px 14px;border-radius:8px;border:1px solid #5b21b6;background:#6d28d9;color:#fff;cursor:pointer}
.small{font-size:12px;color:#64748b}
@media print{@page{margin:10mm}.actions{display:none}body{padding:0;font-size:12px}h2{margin-top:8px}.photo{display:block;width:auto;max-width:100%;max-height:78mm;margin:0 auto}.key{text-align:center}th,td{padding:2px 8px}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
</style></head><body>
<h1>🦋 Our Results: Finding Insects with AI</h1>
<p class="meta">${team ? `${esc(team)} · ` : ''}Mothbox Vision Lab · ${esc(date)}${r.photo ? ` · Photo: ${esc(r.photo)}` : ''}</p>
<div class="actions"><button onclick="window.print()">🖨 Print or save as PDF</button></div>
${safePhoto ? `<img class="photo" src="${safePhoto}" alt="The photo with our boxes and the AI's boxes"><p class="key"><i style="border-color:${YOU_COLOR}"></i>Our boxes <i style="border-color:${AI_COLOR}"></i>The AI's boxes</p>` : ''}
<h2>Find the insects: us vs. the AI</h2>
<table><thead><tr><th></th><th>Us</th><th>The AI</th></tr></thead><tbody>${rows}</tbody></table>
${lines ? `<ul>${lines}</ul>` : ''}
${scale}
<p class="sensor">🔎 ${esc(SENSOR_LINE)}</p>
${block('One thing we learned', notes.learned)}
${block('How this could help our sensor', notes.sensor)}
<p class="small">${r.real ? 'Photo and expert answers: AMI-Traps dataset. ' : ''}${r.ai.spotFinder ? 'The AI could not run on this device, so a simple spot finder stood in. ' : 'Insect finder: our YOLO11n model trained on AMI-Traps. '}The AI makes mistakes, and so do people.</p>
</body></html>
`
}

const W = 1600
const H = 900
const FONT = '"Segoe UI", system-ui, -apple-system, Roboto, Arial, sans-serif'

function wrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  width: number,
  lineH: number,
  maxLines: number,
): number {
  const words = text.split(/\s+/).filter(Boolean)
  let line = ''
  let lines = 0
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > width && line) {
      if (lines === maxLines - 1) {
        ctx.fillText(`${line}…`, x, y)
        return y + lineH
      }
      ctx.fillText(line, x, y)
      y += lineH
      lines++
      line = w
    } else line = test
  }
  if (line) {
    ctx.fillText(line, x, y)
    y += lineH
  }
  return y
}

function loadImage(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null)
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** A 16:9 picture of the results, ready to drop into a slide. */
export async function resultsSlidePng(r: LabResults, notes: ResultsNotes, photo: string | null): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const img = await loadImage(photo)
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = '#5b21b6'
  ctx.fillRect(0, 0, W, 100)
  ctx.textBaseline = 'top'
  ctx.fillStyle = '#fff'
  ctx.font = `700 46px ${FONT}`
  ctx.fillText('🦋 Finding insects: us vs. the AI', 50, 24)

  // the photo on the left
  const px = 40
  const py = 130
  const pw = 860
  const ph = 560
  if (img) {
    const s = Math.min(pw / img.width, ph / img.height)
    const w = img.width * s
    const h = img.height * s
    ctx.drawImage(img, px + (pw - w) / 2, py, w, h)
    ctx.font = `600 22px ${FONT}`
    let kx = px + (pw - w) / 2
    const ky = py + h + 12
    for (const [label, color] of [
      ['Our boxes', YOU_COLOR],
      ["The AI's boxes", AI_COLOR],
    ] as const) {
      ctx.strokeStyle = color
      ctx.lineWidth = 4
      ctx.strokeRect(kx, ky + 2, 20, 20)
      ctx.fillStyle = '#334155'
      ctx.fillText(label, kx + 30, ky)
      kx += 30 + ctx.measureText(label).width + 30
    }
  }

  // the numbers on the right
  const x = 950
  const colW = W - x - 50
  let y = 130
  ctx.fillStyle = '#64748b'
  ctx.font = `700 24px ${FONT}`
  ctx.fillText('Us', x + colW * 0.5, y)
  ctx.fillText('AI', x + colW * 0.8, y)
  y += 40
  for (const [k, a, b] of findRows(r)) {
    ctx.fillStyle = '#475569'
    ctx.font = `600 24px ${FONT}`
    ctx.fillText(k, x, y + 6)
    ctx.fillStyle = YOU_COLOR
    ctx.font = `700 30px ${FONT}`
    ctx.fillText(a, x + colW * 0.5, y)
    ctx.fillStyle = AI_COLOR
    ctx.fillText(b.length > 9 ? b.replace(' seconds', ' s') : b, x + colW * 0.8, y)
    y += 48
  }
  y += 10
  ctx.fillStyle = '#1e293b'
  ctx.font = `400 23px ${FONT}`
  for (const line of resultLines(r)) y = wrap(ctx, line, x, y, colW, 30, 3) + 10

  // what the team learned, along the bottom
  const learned = notes.learned.trim()
  if (learned) {
    ctx.fillStyle = '#f5f3ff'
    ctx.fillRect(40, 740, W - 80, 108)
    ctx.fillStyle = '#5b21b6'
    ctx.font = `700 24px ${FONT}`
    ctx.fillText('What we learned', 60, 752)
    ctx.fillStyle = '#1e293b'
    ctx.font = `400 27px ${FONT}`
    wrap(ctx, learned, 60, 786, W - 120, 32, 2)
  }
  ctx.fillStyle = '#94a3b8'
  ctx.font = `400 18px ${FONT}`
  const team = notes.team.trim()
  ctx.fillText(
    `${team ? `${team} · ` : ''}Mothbox Vision Lab${r.real ? ' · Photo: AMI-Traps dataset' : ''}`,
    50,
    H - 32,
  )
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/png'))
}
