import { useRef, useState, type PointerEvent } from 'react'
import type { Box } from './lib/types'

export interface BoxLayer {
  key: string
  boxes: Box[]
  color: string
  dashed?: boolean
  labels?: string[]
}

interface Props {
  imageUrl: string
  width: number
  height: number
  layers: BoxLayer[]
  zoom?: number
  /** When set, students can drag to draw boxes and click a box to remove it. */
  drawLayerKey?: string
  onAdd?: (box: Box) => void
  onRemove?: (index: number) => void
  alt: string
}

export function SceneView({ imageUrl, width, height, layers, zoom = 1, drawLayerKey, onAdd, onRemove, alt }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [draft, setDraft] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const drawing = Boolean(onAdd)

  const toImage = (e: PointerEvent) => {
    const rect = svgRef.current!.getBoundingClientRect()
    return {
      x: ((e.clientX - rect.left) / rect.width) * width,
      y: ((e.clientY - rect.top) / rect.height) * height,
    }
  }

  const down = (e: PointerEvent<SVGSVGElement>) => {
    if (!drawing || (e.target as Element).getAttribute('data-box') !== null) return
    const p = toImage(e)
    svgRef.current!.setPointerCapture(e.pointerId)
    setDraft({ x0: p.x, y0: p.y, x1: p.x, y1: p.y })
  }
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (!draft) return
    const p = toImage(e)
    setDraft({ ...draft, x1: p.x, y1: p.y })
  }
  const up = () => {
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

  const stroke = Math.max(2, width / 500)

  return (
    <div className={zoom > 1 ? 'scene-scroll zoomed' : 'scene-scroll'}>
      <div className="scene-inner" style={{ width: `${zoom * 100}%` }}>
        <img src={imageUrl} alt={alt} draggable={false} />
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className={drawing ? 'scene-svg drawing' : 'scene-svg'}
          onPointerDown={down}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={() => setDraft(null)}
        >
          {layers.map((layer) =>
            layer.boxes.map((b, i) => (
              <g key={`${layer.key}-${i}`}>
                <rect
                  x={b.x}
                  y={b.y}
                  width={b.w}
                  height={b.h}
                  fill={layer.key === drawLayerKey ? 'rgba(255,255,255,0.01)' : 'none'}
                  stroke={layer.color}
                  strokeWidth={stroke}
                  strokeDasharray={layer.dashed ? `${stroke * 3} ${stroke * 2}` : undefined}
                  data-box={layer.key === drawLayerKey ? i : undefined}
                  style={layer.key === drawLayerKey && onRemove ? { cursor: 'pointer' } : undefined}
                  onClick={layer.key === drawLayerKey && onRemove ? () => onRemove(i) : undefined}
                />
                {layer.labels?.[i] && (
                  <text x={b.x} y={b.y - stroke * 2} fill={layer.color} fontSize={Math.max(14, width / 90)} fontWeight={700}>
                    {layer.labels[i]}
                  </text>
                )}
              </g>
            )),
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
  )
}
