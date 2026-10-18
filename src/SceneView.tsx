import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
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

interface Props {
  imageUrl: string
  width: number
  height: number
  layers: BoxLayer[]
  /** When set, students can drag to draw boxes and click a box to remove it. */
  drawLayerKey?: string
  onAdd?: (box: Box) => void
  onRemove?: (index: number) => void
  alt: string
  /** Shown just above the picture, for example a stopwatch. */
  overlay?: ReactNode
}

const ZOOMS = [1, 1.5, 2, 3, 4]
const MAX_ZOOM = 6
/** How far a finger can move and still count as a tap, in screen pixels. */
const TAP_SLOP = 10

export function SceneView({ imageUrl, width, height, layers, drawLayerKey, onAdd, onRemove, alt, overlay }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [zoom, setZoomRaw] = useState(1)
  const [tool, setTool] = useState<'draw' | 'move'>('draw')
  const [draft, setDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  // on touch screens: every finger on the photo, and what the current gesture is doing
  const fingers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{
    kind: 'tap' | 'pan' | 'pinch'
    x: number
    y: number
    left: number
    top: number
    dist: number
    zoom: number
  } | null>(null)
  const [full, setFull] = useState(false)
  // in full-screen mode, the photo's width at 100% so the whole photo fits on screen
  const [fitWidth, setFitWidth] = useState<number | null>(null)
  const canDraw = Boolean(onAdd)
  const drawing = canDraw && tool === 'draw'

  // full-screen photo mode for phones: the page underneath doesn't scroll
  useEffect(() => {
    if (!full) return
    const before = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = before
    }
  }, [full])
  useEffect(() => {
    const el = scrollRef.current
    if (!full || !el) return
    const fit = () => setFitWidth(Math.min(el.clientWidth, (el.clientHeight * width) / height))
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    return () => ro.disconnect()
  }, [full, width, height])
  const openFull = () => {
    setFull(true)
    setZoomRaw(1)
  }
  const closeFull = () => {
    setFull(false)
    setZoomRaw(1)
  }

  /** Zooms while keeping the point under (cx, cy) in place (cx, cy relative to the viewport). */
  const setZoom = (next: number, cx?: number, cy?: number) => {
    const el = scrollRef.current
    const z = Math.min(MAX_ZOOM, Math.max(1, next))
    if (!el) return setZoomRaw(z)
    const px = cx ?? el.clientWidth / 2
    const py = cy ?? el.clientHeight / 2
    const fx = (el.scrollLeft + px) / el.scrollWidth
    const fy = (el.scrollTop + py) / el.scrollHeight
    setZoomRaw(z)
    requestAnimationFrame(() => {
      el.scrollLeft = fx * el.scrollWidth - px
      el.scrollTop = fy * el.scrollHeight - py
    })
  }
  const step = (dir: 1 | -1) => {
    const i = ZOOMS.findIndex((z) => z >= zoom - 0.01)
    setZoom(ZOOMS[Math.min(ZOOMS.length - 1, Math.max(0, (i < 0 ? 0 : i) + dir))])
  }

  // pinch on a trackpad (or Ctrl + scroll) zooms around the pointer
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const wheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return
      e.preventDefault()
      const r = el.getBoundingClientRect()
      setZoom(zoom * Math.exp(-e.deltaY * 0.01), e.clientX - r.left, e.clientY - r.top)
    }
    el.addEventListener('wheel', wheel, { passive: false })
    return () => el.removeEventListener('wheel', wheel)
  })

  const toImage = (e: PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
    }
  }

  /** Zooms in 2× on one quarter of the photo, so small insects are big enough to see. */
  const corner = (cx: 0 | 1, cy: 0 | 1) => {
    setZoomRaw(2)
    requestAnimationFrame(() => {
      const el = scrollRef.current
      if (!el) return
      el.scrollLeft = cx * (el.scrollWidth - el.clientWidth)
      el.scrollTop = cy * (el.scrollHeight - el.clientHeight)
    })
  }

  // touch: one finger pans, two fingers pinch, and a quick tap marks an insect
  const fingerDown = (e: PointerEvent<SVGSVGElement>) => {
    fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const el = scrollRef.current!
    const pts = [...fingers.current.values()]
    if (pts.length === 1) {
      gesture.current = {
        kind: 'tap',
        x: e.clientX,
        y: e.clientY,
        left: el.scrollLeft,
        top: el.scrollTop,
        dist: 0,
        zoom,
      }
    } else if (pts.length === 2) {
      const [a, b] = pts
      gesture.current = {
        kind: 'pinch',
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        left: el.scrollLeft,
        top: el.scrollTop,
        dist: Math.hypot(a.x - b.x, a.y - b.y),
        zoom,
      }
    }
  }
  const fingerMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!fingers.current.has(e.pointerId)) return
    fingers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const g = gesture.current
    const el = scrollRef.current!
    if (!g) return
    if (g.kind === 'pinch') {
      const [a, b] = [...fingers.current.values()]
      if (!b) return
      const r = el.getBoundingClientRect()
      setZoom((g.zoom * Math.hypot(a.x - b.x, a.y - b.y)) / g.dist, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top)
      return
    }
    if (g.kind === 'tap' && Math.hypot(e.clientX - g.x, e.clientY - g.y) > TAP_SLOP) g.kind = 'pan'
    if (g.kind === 'pan') {
      el.scrollLeft = g.left - (e.clientX - g.x)
      el.scrollTop = g.top - (e.clientY - g.y)
    }
  }
  const fingerUp = (e: PointerEvent<SVGSVGElement>) => {
    fingers.current.delete(e.pointerId)
    const g = gesture.current
    if (fingers.current.size > 0) return
    gesture.current = null
    if (g?.kind !== 'tap') return
    // tapping a mark removes it (handled here, not on click, so the click a
    // tap sends afterwards can't remove the mark it just made)
    const hit = (e.target as Element).getAttribute('data-box')
    if (hit !== null) return onRemove?.(Number(hit))
    if (!onAdd) return
    // a tap marks the insect with a small square around the spot
    const p = toImage(e)
    const side = width / 40
    onAdd({ x: p.x - side / 2, y: p.y - side / 2, w: side, h: side })
  }

  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') return fingerDown(e)
    if ((e.target as Element).getAttribute('data-box') !== null) return
    svgRef.current!.setPointerCapture(e.pointerId)
    if (drawing) {
      const p = toImage(e)
      setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
    } else if (zoom > 1 && e.pointerType === 'mouse') {
      const el = scrollRef.current!
      pan.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop }
    }
  }
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') return fingerMove(e)
    if (pan.current) {
      const el = scrollRef.current!
      el.scrollLeft = pan.current.left - (e.clientX - pan.current.x)
      el.scrollTop = pan.current.top - (e.clientY - pan.current.y)
      return
    }
    if (!draft) return
    const p = toImage(e)
    setDraft({ ...draft, x1: p.x, y1: p.y })
  }
  const up = (e: PointerEvent<SVGSVGElement>) => {
    if (e.pointerType === 'touch') return fingerUp(e)
    pan.current = null
    if (!draft) return
    const box = {
      x: Math.min(draft.x0, draft.x1),
      y: Math.min(draft.y0, draft.y1),
      w: Math.abs(draft.x1 - draft.x0),
      h: Math.abs(draft.y1 - draft.y0),
    }
    setDraft(null)
    if (box.w > 6 && box.h > 6) onAdd?.(box)
  }

  const stroke = Math.max(2, width / 500) / Math.sqrt(zoom)
  const cursor = drawing ? 'crosshair' : zoom > 1 ? 'grab' : 'default'

  const svg = (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${width} ${height}`}
      className={drawing ? 'scene-svg drawing' : 'scene-svg'}
      style={{ cursor }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={(e) => {
        setDraft(null)
        pan.current = null
        fingers.current.delete(e.pointerId)
        gesture.current = null
      }}
    >
      {layers.map((layer) =>
        layer.boxes.map((b, i) => {
          const color = layer.colors?.[i] ?? layer.color
          const removable = layer.key === drawLayerKey && onRemove && drawing
          return (
            <g key={`${layer.key}-${i}`}>
              <rect
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                fill={removable ? 'rgba(255,255,255,0.01)' : 'none'}
                stroke={color}
                strokeWidth={stroke}
                strokeDasharray={layer.dashed ? `${stroke * 3} ${stroke * 2}` : undefined}
                data-box={removable ? i : undefined}
                style={removable ? { cursor: 'pointer' } : { pointerEvents: 'none' }}
                onClick={removable && !TOUCH ? () => onRemove(i) : undefined}
              />
              {layer.labels?.[i] && (
                <text
                  x={b.x}
                  y={b.y - stroke * 2}
                  fill={color}
                  fontSize={Math.max(14, width / 90) / Math.sqrt(zoom)}
                  fontWeight={700}
                  paintOrder="stroke"
                  stroke="#fff"
                  strokeWidth={stroke * 1.5}
                  style={{ pointerEvents: 'none' }}
                >
                  {layer.labels[i]}
                </text>
              )}
            </g>
          )
        }),
      )}
      {draft && (
        <rect
          x={Math.min(draft.x0, draft.x1)}
          y={Math.min(draft.y0, draft.y1)}
          width={Math.abs(draft.x1 - draft.x0)}
          height={Math.abs(draft.y1 - draft.y0)}
          fill="rgba(37, 99, 235, 0.12)"
          stroke="#2563eb"
          strokeWidth={stroke}
        />
      )}
    </svg>
  )

  // on a phone the photo on the page is a preview; looking and marking happen full screen
  if (TOUCH && !full) {
    return (
      <div className="scene-frame">
        {overlay}
        <button className="scene-preview" onClick={openFull} aria-label="Open the photo full screen">
          <span className="scene-inner">
            <img src={imageUrl} alt={alt} draggable={false} />
            <svg viewBox={`0 0 ${width} ${height}`} className="scene-svg" aria-hidden>
              {layers.map((layer) =>
                layer.boxes.map((b, i) => (
                  <rect
                    key={`${layer.key}-${i}`}
                    x={b.x}
                    y={b.y}
                    width={b.w}
                    height={b.h}
                    fill="none"
                    stroke={layer.colors?.[i] ?? layer.color}
                    strokeWidth={stroke}
                    strokeDasharray={layer.dashed ? `${stroke * 3} ${stroke * 2}` : undefined}
                  />
                )),
              )}
            </svg>
          </span>
          <span className="open-full">
            🔍 {canDraw ? 'Tap to open the photo and mark insects' : 'Tap to see the photo up close'}
          </span>
        </button>
      </div>
    )
  }

  if (TOUCH) {
    return (
      <div className="scene-frame full" role="dialog" aria-label="Photo, full screen">
        <div className="zoom-bar">
          <button onClick={closeFull} aria-label="Close the full-screen photo">
            ✕ Done
          </button>
          <button onClick={() => step(-1)} disabled={zoom <= 1} aria-label="Zoom out">
            −
          </button>
          <button onClick={() => step(1)} disabled={zoom >= 4} aria-label="Zoom in">
            +
          </button>
          <span className="corners" role="group" aria-label="Zoom to a corner">
            <button onClick={() => corner(0, 0)} aria-label="Top left">
              ↖
            </button>
            <button onClick={() => corner(1, 0)} aria-label="Top right">
              ↗
            </button>
            <button onClick={() => corner(0, 1)} aria-label="Bottom left">
              ↙
            </button>
            <button onClick={() => corner(1, 1)} aria-label="Bottom right">
              ↘
            </button>
          </span>
          <span className="small zoom-hint">
            Pinch to zoom, drag to move.{canDraw && ' Tap an insect to mark it; tap a mark to remove it.'}
          </span>
          <span className="small rotate-hint">Turn your phone sideways for a bigger photo.</span>
        </div>
        {overlay}
        <div className="scene-scroll" ref={scrollRef}>
          <div
            className="scene-inner"
            style={
              fitWidth ? { width: zoom * fitWidth, minWidth: 0, flexShrink: 0, margin: 'auto' } : { width: '100%' }
            }
          >
            <img src={imageUrl} alt={alt} draggable={false} />
            {svg}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="scene-frame">
      <div className="zoom-bar">
        <button onClick={() => step(-1)} disabled={zoom <= 1} aria-label="Zoom out">
          −
        </button>
        <span className="zoom-level">{Math.round(zoom * 100)}%</span>
        <button onClick={() => step(1)} disabled={zoom >= 4} aria-label="Zoom in">
          +
        </button>
        <button onClick={() => setZoom(1)} disabled={zoom === 1}>
          Fit
        </button>
        {canDraw && (
          <span className="tool-switch" role="group" aria-label="What dragging does">
            <button className={tool === 'draw' ? 'on' : ''} onClick={() => setTool('draw')}>
              ▭ Draw boxes
            </button>
            <button className={tool === 'move' ? 'on' : ''} onClick={() => setTool('move')}>
              ✋ Move around
            </button>
          </span>
        )}
        <span className="muted small zoom-hint">
          {zoom > 1
            ? drawing
              ? 'Scroll to move around, or pick ✋ to drag.'
              : 'Drag or scroll to move around.'
            : 'Zoom in to look closely. Pinch or Ctrl + scroll works too.'}
        </span>
      </div>
      {overlay}
      <div className={zoom > 1 ? 'scene-scroll zoomed' : 'scene-scroll'} ref={scrollRef}>
        <div className="scene-inner" style={{ width: `${zoom * 100}%` }}>
          <img src={imageUrl} alt={alt} draggable={false} />
          {svg}
        </div>
      </div>
    </div>
  )
}
