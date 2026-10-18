import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react'
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

export function SceneView({ imageUrl, width, height, layers, drawLayerKey, onAdd, onRemove, alt, overlay }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [zoom, setZoomRaw] = useState(1)
  const [tool, setTool] = useState<'draw' | 'move'>('draw')
  const [draft, setDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const pan = useRef<{ x: number; y: number; left: number; top: number } | null>(null)
  const canDraw = Boolean(onAdd)
  const drawing = canDraw && tool === 'draw'

  /** Zooms while keeping the point under (cx, cy) in place (cx, cy relative to the viewport). */
  const setZoom = (next: number, cx?: number, cy?: number) => {
    const el = scrollRef.current
    const z = Math.min(4, Math.max(1, next))
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

  const down = (e: PointerEvent<SVGSVGElement>) => {
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
  const up = () => {
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
          <svg
            ref={svgRef}
            viewBox={`0 0 ${width} ${height}`}
            className={drawing ? 'scene-svg drawing' : 'scene-svg'}
            style={{ cursor }}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={() => {
              setDraft(null)
              pan.current = null
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
                      onClick={removable ? () => onRemove(i) : undefined}
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
        </div>
      </div>
    </div>
  )
}
