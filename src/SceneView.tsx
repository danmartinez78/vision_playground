import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { TOUCH } from './lib/touch'
import type { Box } from './lib/types'

export interface BoxLayer {
  key: string
  boxes: Box[]
  color: string
  /** a color for each box, when boxes in one layer differ (for example right and wrong) */
  colors?: string[]
  dashed?: boolean
  labels?: string[]
}

/** Boxes the student can add, adjust and remove. */
export interface EditableBoxes {
  boxes: Box[]
  color: string
  onChange: (boxes: Box[]) => void
}

interface Props {
  imageUrl: string
  width: number
  height: number
  layers: BoxLayer[]
  edit?: EditableBoxes
  alt: string
  /** A strip along the top of the photo, for example a stopwatch. */
  bar?: ReactNode
  /** Phones show the photo full screen. Pass these to open and close it from outside. */
  full?: boolean
  onFullChange?: (full: boolean) => void
}

type Corner = 'nw' | 'ne' | 'sw' | 'se'

/** What the pointer that went down is doing. */
type Op =
  | { kind: 'press'; x: number; y: number; box: number | null; timer: number }
  | { kind: 'pan'; x: number; y: number; left: number; top: number }
  | { kind: 'draw'; x0: number; y0: number }
  | { kind: 'move'; box: number; start: Box; x: number; y: number }
  | { kind: 'resize'; box: number; corner: Corner; start: Box }
  | { kind: 'pinch'; x: number; y: number; dist: number; zoom: number }

const ZOOMS = [1, 1.5, 2, 3, 4, 6, 8]
const MAX_ZOOM = 8
/** How far a finger or mouse can move and still count as a tap, in screen pixels. */
const SLOP = 8
/** How long to hold a finger still before dragging draws a box. */
const HOLD_MS = 350
/** Smallest box side, in screen pixels. */
const MIN_SIDE = 8
/** The side of the box a tap puts down, in screen pixels: about a fingertip. */
const TAP_SIDE = 56

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(1, z))

export function SceneView({ imageUrl, width, height, layers, edit, alt, bar, full: fullProp, onFullChange }: Props) {
  const stageRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  // zoom starts over whenever the photo opens or closes full screen
  const [zoomState, setZoomState] = useState({ full: false, z: 1 })
  // the photo's on-screen width at zoom 1, so that the whole photo fits
  const [fitWidth, setFitWidth] = useState(0)
  const [fullOwn, setFullOwn] = useState(false)
  const full = fullProp ?? fullOwn
  const zoom = zoomState.full === full ? zoomState.z : 1
  const setZoom = (z: number) => setZoomState({ full, z })
  const setFull = (f: boolean) => {
    setFullOwn(f)
    onFullChange?.(f)
  }
  const [picked, setSelected] = useState<number | null>(null)
  const [draft, setDraft] = useState<Box | null>(null)
  // a box being moved or resized, shown here and saved when the pointer lets go
  const [live, setLive] = useState<{ i: number; box: Box } | null>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const op = useRef<Op | null>(null)
  const boxes = edit?.boxes ?? []
  const preview = TOUCH && !full
  const selected = edit && picked !== null && picked < boxes.length ? picked : null

  // the page underneath doesn't scroll while the photo is full screen
  useEffect(() => {
    if (!full) return
    const before = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = before
    }
  }, [full])

  // fit the photo to the space it has: the full screen, or the page width (at most 75% of the window's height)
  useEffect(() => {
    const el = stageRef.current
    if (!el) return
    const fit = () => {
      const w = el.clientWidth
      const h = full ? el.clientHeight : window.innerHeight * 0.75
      setFitWidth(Math.max(1, Math.min(w, (h * width) / height)))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    window.addEventListener('resize', fit)
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', fit)
    }
  }, [full, width, height, preview])

  /** Screen pixels per photo pixel. */
  const scale = (zoom * fitWidth) / width || 1

  // the photo point (as a fraction of the photo) to keep under a spot on screen after the zoom changes
  const anchor = useRef<{ fx: number; fy: number; x: number; y: number } | null>(null)
  const placeAnchor = () => {
    const el = scrollRef.current
    const a = anchor.current
    if (!el || !a) return
    anchor.current = null
    const inner = el.firstElementChild as HTMLElement
    el.scrollLeft = inner.offsetLeft + a.fx * inner.offsetWidth - a.x
    el.scrollTop = inner.offsetTop + a.fy * inner.offsetHeight - a.y
  }
  useLayoutEffect(placeAnchor, [zoom, fitWidth])

  /**
   * Zooms so the photo point under (fromX, fromY) ends up under (x, y), both relative to the stage.
   * A pinch moves its middle as it zooms, so the two can differ.
   */
  const zoomAt = (next: number, x?: number, y?: number, fromX = x, fromY = y) => {
    const el = scrollRef.current
    const z = clampZoom(next)
    if (!el) return setZoom(z)
    const cx = el.clientWidth / 2
    const cy = el.clientHeight / 2
    const inner = el.firstElementChild as HTMLElement
    // a zoom that hasn't reached the screen yet still knows which point to keep
    const { fx, fy } = anchor.current ?? {
      fx: (el.scrollLeft + (fromX ?? cx) - inner.offsetLeft) / inner.offsetWidth,
      fy: (el.scrollTop + (fromY ?? cy) - inner.offsetTop) / inner.offsetHeight,
    }
    anchor.current = { fx, fy, x: x ?? cx, y: y ?? cy }
    if (z === zoom) placeAnchor()
    else setZoom(z)
  }
  const step = (dir: 1 | -1) => {
    const i = ZOOMS.findIndex((z) => z >= zoom - 0.01)
    zoomAt(ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, (i < 0 ? 0 : i) + dir))])
  }

  // Ctrl + scroll, or a trackpad pinch, zooms around the pointer; plain scrolling moves around
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const r = el.getBoundingClientRect()
      zoomAt(zoom * Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  })

  const toImage = (cx: number, cy: number) => {
    const r = svgRef.current!.getBoundingClientRect()
    return { x: ((cx - r.left) / r.width) * width, y: ((cy - r.top) / r.height) * height }
  }
  const inPhoto = (b: Box): Box => {
    const w = Math.min(b.w, width)
    const h = Math.min(b.h, height)
    return { x: Math.max(0, Math.min(b.x, width - w)), y: Math.max(0, Math.min(b.y, height - h)), w, h }
  }
  const fromCorners = (x0: number, y0: number, x1: number, y1: number): Box => {
    const left = Math.max(0, Math.min(x0, x1))
    const top = Math.max(0, Math.min(y0, y1))
    const right = Math.min(width, Math.max(x0, x1))
    const bottom = Math.min(height, Math.max(y0, y1))
    return { x: left, y: top, w: Math.max(0, right - left), h: Math.max(0, bottom - top) }
  }
  const remove = (i: number) => {
    edit?.onChange(boxes.filter((_, k) => k !== i))
    setSelected(null)
  }
  const add = (b: Box) => {
    if (!edit) return
    edit.onChange([...boxes, b])
    setSelected(boxes.length)
  }

  // Delete removes the chosen box, Escape lets go of it
  useEffect(() => {
    if (!edit || selected === null) return
    const key = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea')) return
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        remove(selected)
      } else if (e.key === 'Escape') setSelected(null)
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  const cancelPress = () => {
    const o = op.current
    if (o?.kind === 'press') window.clearTimeout(o.timer)
  }
  const startPan = (x: number, y: number) => {
    const el = scrollRef.current!
    op.current = { kind: 'pan', x, y, left: el.scrollLeft, top: el.scrollTop }
  }

  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 1) return
    svgRef.current!.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointers.current.values()]
    if (pts.length === 2) {
      // a second finger means zoom: drop whatever the first finger started
      cancelPress()
      setDraft(null)
      setLive(null)
      const [a, b] = pts
      op.current = {
        kind: 'pinch',
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        zoom,
      }
      return
    }
    if (pts.length > 2) return
    // the middle mouse button always moves the photo
    if (e.pointerType === 'mouse' && e.button === 1) return startPan(e.clientX, e.clientY)
    const t = e.target as Element
    const handle = t.getAttribute('data-handle')
    const boxAttr = t.getAttribute('data-box')
    const box = boxAttr === null ? null : Number(boxAttr)
    if (edit && handle) {
      const [i, corner] = handle.split(':')
      op.current = { kind: 'resize', box: Number(i), corner: corner as Corner, start: boxes[Number(i)] }
      return
    }
    if (edit && box !== null && box === selected) {
      const p = toImage(e.clientX, e.clientY)
      op.current = { kind: 'move', box, start: boxes[box], x: p.x, y: p.y }
      return
    }
    // anything else waits to see if it's a tap, a drag or (with a finger) a hold
    const timer =
      TOUCH && edit
        ? window.setTimeout(() => {
            const o = op.current
            if (o?.kind !== 'press') return
            navigator.vibrate?.(15)
            const p = toImage(o.x, o.y)
            // holding a box picks it up to move; holding anywhere else starts a new box
            if (o.box !== null) {
              setSelected(o.box)
              op.current = { kind: 'move', box: o.box, start: boxes[o.box], x: p.x, y: p.y }
              return
            }
            op.current = { kind: 'draw', x0: p.x, y0: p.y }
            setDraft({ x: p.x, y: p.y, w: 0, h: 0 })
            setSelected(null)
          }, HOLD_MS)
        : 0
    op.current = { kind: 'press', x: e.clientX, y: e.clientY, box, timer }
  }

  const move = (e: PointerEvent<SVGSVGElement>): void => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const o = op.current
    const el = scrollRef.current!
    if (!o) return
    switch (o.kind) {
      case 'pinch': {
        const [a, b] = [...pointers.current.values()]
        if (!b) return
        // zoom by how far apart the fingers are, and move with their midpoint
        const r = el.getBoundingClientRect()
        const mx = (a.x + b.x) / 2
        const my = (a.y + b.y) / 2
        zoomAt((o.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / o.dist, mx - r.left, my - r.top, o.x - r.left, o.y - r.top)
        o.x = mx
        o.y = my
        return
      }
      case 'press': {
        if (Math.hypot(e.clientX - o.x, e.clientY - o.y) <= SLOP) return
        window.clearTimeout(o.timer)
        if (edit && e.pointerType === 'mouse' && o.box !== null) {
          // with a mouse, dragging a box moves it
          setSelected(o.box)
          const p = toImage(o.x, o.y)
          op.current = { kind: 'move', box: o.box, start: boxes[o.box], x: p.x, y: p.y }
        } else if (edit && e.pointerType === 'mouse') {
          // and dragging anywhere else draws a new one
          const p = toImage(o.x, o.y)
          op.current = { kind: 'draw', x0: p.x, y0: p.y }
          setSelected(null)
        } else startPan(o.x, o.y)
        return move(e)
      }
      case 'pan':
        el.scrollLeft = o.left - (e.clientX - o.x)
        el.scrollTop = o.top - (e.clientY - o.y)
        return
      case 'draw': {
        const p = toImage(e.clientX, e.clientY)
        setDraft(fromCorners(o.x0, o.y0, p.x, p.y))
        return
      }
      case 'move': {
        const p = toImage(e.clientX, e.clientY)
        setLive({ i: o.box, box: inPhoto({ ...o.start, x: o.start.x + p.x - o.x, y: o.start.y + p.y - o.y }) })
        return
      }
      case 'resize': {
        const p = toImage(e.clientX, e.clientY)
        const s = o.start
        // the opposite corner stays put
        const fx = o.corner.includes('w') ? s.x + s.w : s.x
        const fy = o.corner.includes('n') ? s.y + s.h : s.y
        setLive({ i: o.box, box: fromCorners(fx, fy, p.x, p.y) })
        return
      }
    }
  }

  const up = (e: PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(e.pointerId)) return
    pointers.current.delete(e.pointerId)
    const o = op.current
    if (pointers.current.size > 0) {
      // one finger of a pinch lifted: the other one moves the photo
      if (o?.kind === 'pinch') {
        const [rest] = [...pointers.current.values()]
        startPan(rest.x, rest.y)
      }
      return
    }
    op.current = null
    if (!o) return
    const minSide = MIN_SIDE / scale
    if (o.kind === 'press') {
      window.clearTimeout(o.timer)
      if (!edit) return
      // tapping a box picks it (or lets go of it)
      if (o.box !== null) return setSelected(o.box === selected ? null : o.box)
      if (!TOUCH) return setSelected(null)
      // a finger tap puts a box on the spot, ready to be fitted
      const p = toImage(o.x, o.y)
      const side = TAP_SIDE / scale
      add(inPhoto({ x: p.x - side / 2, y: p.y - side / 2, w: side, h: side }))
    } else if (o.kind === 'draw') {
      setDraft(null)
      if (draft && draft.w > minSide && draft.h > minSide) add(draft)
    } else if ((o.kind === 'move' || o.kind === 'resize') && live) {
      setLive(null)
      if (live.box.w > minSide && live.box.h > minSide)
        edit?.onChange(boxes.map((b, k) => (k === live.i ? live.box : b)))
    }
  }

  const cancel = (e: PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId)
    cancelPress()
    op.current = null
    setDraft(null)
    setLive(null)
  }

  // lines and handles stay the same size on screen at any zoom
  const stroke = Math.max(1.5, 2 / Math.sqrt(zoom)) / scale
  const handleR = 7 / scale
  const shown = boxes.map((b, i) => (live?.i === i ? live.box : b))
  const sel = selected !== null ? shown[selected] : null

  const drawLayer = (layer: BoxLayer, withLabels: boolean) =>
    layer.boxes.map((b, i) => {
      const color = layer.colors?.[i] ?? layer.color
      return (
        <g key={`${layer.key}-${i}`}>
          <rect
            x={b.x}
            y={b.y}
            width={b.w}
            height={b.h}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={layer.dashed ? `${stroke * 3} ${stroke * 2}` : undefined}
          />
          {withLabels && layer.labels?.[i] && (
            <text
              x={b.x}
              y={b.y - stroke * 2}
              fill={color}
              fontSize={12 / scale}
              fontWeight={700}
              paintOrder="stroke"
              stroke="#fff"
              strokeWidth={stroke * 1.5}
            >
              {layer.labels[i]}
            </text>
          )}
        </g>
      )
    })

  // on a phone the photo on the page is a preview that opens full screen
  if (preview) {
    return (
      <div className="viewer">
        {bar && <div className="viewer-bar">{bar}</div>}
        <button className="scene-preview" onClick={() => setFull(true)} aria-label="Open the photo full screen">
          <span className="scene-inner" ref={stageRef}>
            <img src={imageUrl} alt={alt} draggable={false} />
            <svg viewBox={`0 0 ${width} ${height}`} className="scene-svg" aria-hidden>
              {layers.map((l) => drawLayer(l, false))}
              {edit && drawLayer({ key: 'edit', boxes, color: edit.color }, false)}
            </svg>
          </span>
          <span className="open-full">
            🔍 {edit ? 'Tap to open the photo and box insects' : 'Tap to see the photo up close'}
          </span>
        </button>
      </div>
    )
  }

  const zoomed = zoom > 1.01
  const hint = !edit
    ? null
    : sel
      ? TOUCH
        ? 'Drag the corners to fit the insect. Tap × to remove the box.'
        : 'Drag the corners to fit the insect. × or Delete removes the box.'
      : boxes.length === 0
        ? TOUCH
          ? 'Tap an insect to box it. Drag to move around, pinch to zoom.'
          : 'Drag around an insect to draw a box. Scroll to move around.'
        : null

  return (
    <div className={full ? 'viewer full' : 'viewer'} role={full ? 'dialog' : undefined} aria-label={alt}>
      {(bar || full) && (
        <div className="viewer-bar">
          {full && (
            <button className="viewer-close" onClick={() => setFull(false)} aria-label="Close the full-screen photo">
              ✕
            </button>
          )}
          {bar}
        </div>
      )}
      <div
        className="viewer-stage"
        ref={stageRef}
        style={full || !fitWidth ? undefined : { height: (fitWidth * height) / width }}
      >
        <div className={zoomed ? 'scene-scroll zoomed' : 'scene-scroll'} ref={scrollRef}>
          <div className="scene-inner" style={{ width: fitWidth ? zoom * fitWidth : '100%' }}>
            <img src={imageUrl} alt={alt} draggable={false} />
            <svg
              ref={svgRef}
              viewBox={`0 0 ${width} ${height}`}
              className={edit ? 'scene-svg editing' : 'scene-svg'}
              onPointerDown={down}
              onPointerMove={move}
              onPointerUp={up}
              onPointerCancel={cancel}
              onContextMenu={(e) => e.preventDefault()}
            >
              {layers.map((l) => drawLayer(l, true))}
              {edit &&
                shown.map((b, i) => (
                  <rect
                    key={`edit-${i}`}
                    x={b.x}
                    y={b.y}
                    width={b.w}
                    height={b.h}
                    // nearly clear, so the whole box can be tapped
                    fill={i === selected ? 'rgba(37, 99, 235, 0.15)' : 'rgba(255, 255, 255, 0.01)'}
                    stroke={edit.color}
                    strokeWidth={i === selected ? stroke * 1.5 : stroke}
                    data-box={i}
                    className={i === selected ? 'edit-box chosen' : 'edit-box'}
                  />
                ))}
              {edit &&
                sel &&
                (['nw', 'ne', 'sw', 'se'] as Corner[]).map((c) => {
                  const cx = c.includes('w') ? sel.x : sel.x + sel.w
                  const cy = c.includes('n') ? sel.y : sel.y + sel.h
                  return (
                    <g key={c}>
                      <circle cx={cx} cy={cy} r={handleR} fill="#fff" stroke={edit.color} strokeWidth={stroke * 1.2} />
                      {/* a bigger, invisible circle that's easy to grab with a finger */}
                      <circle
                        cx={cx}
                        cy={cy}
                        r={handleR * (TOUCH ? 3 : 1.6)}
                        fill="transparent"
                        data-handle={`${selected}:${c}`}
                        className={`handle ${c}`}
                      />
                    </g>
                  )
                })}
              {draft && (
                <rect
                  x={draft.x}
                  y={draft.y}
                  width={draft.w}
                  height={draft.h}
                  fill="rgba(37, 99, 235, 0.15)"
                  stroke={edit?.color}
                  strokeWidth={stroke}
                />
              )}
            </svg>
            {edit && sel && !live && (
              // just above the box, or below it when the box is at the top of the photo
              <button
                className={sel.y * scale < 48 ? 'box-remove below' : 'box-remove'}
                style={{
                  left: `${((sel.x + sel.w / 2) / width) * 100}%`,
                  top: `${((sel.y * scale < 48 ? sel.y + sel.h : sel.y) / height) * 100}%`,
                }}
                onClick={() => remove(selected!)}
                aria-label="Remove this box"
              >
                ×
              </button>
            )}
          </div>
        </div>
        <div className="viewer-zoom" role="group" aria-label="Zoom">
          {!TOUCH && (
            <>
              <button onClick={() => step(-1)} disabled={!zoomed} aria-label="Zoom out" title="Zoom out">
                −
              </button>
              <button onClick={() => step(1)} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in" title="Zoom in">
                +
              </button>
            </>
          )}
          {(zoomed || !TOUCH) && (
            <button onClick={() => zoomAt(1)} disabled={!zoomed} title="Show the whole photo">
              Fit
            </button>
          )}
        </div>
        {hint && <p className="viewer-hint">{hint}</p>}
      </div>
    </div>
  )
}
