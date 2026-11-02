import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'

const EASE = [0.16, 1, 0.3, 1] as const
const SANS = 'inherit' 
const isSnapshot = () =>
  typeof navigator !== 'undefined' && /\bChromatic\b/.test(navigator.userAgent)

const UP = 'var(--chart-up, #34c28a)'
const DOWN = 'var(--chart-candle-down, #D0625F)'

export interface Candle {
  o: number
  h: number
  l: number
  c: number
  v: number
  t: number
}

function mulberry32(seed: number) {
  let s = seed
  return () => {
    s |= 0
    s = (s + 0x6d2b79f5) | 0
    let t = Math.imul(s ^ (s >>> 15), 1 | s)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const ARC: Array<[number, number]> = [
  [0, 0.24], [0.1, 0.34], [0.22, 0.6], [0.3, 0.88], [0.36, 1],
  [0.44, 0.68], [0.5, 0.45], [0.56, 0.6], [0.62, 0.33], [0.68, 0.26],
  [0.74, 0.42], [0.8, 0.31], [0.86, 0.19], [0.92, 0.29], [1, 0.35],
]

const lerpArc = (f: number) => {
  const hi = ARC.findIndex(([x]) => x >= f)
  if (hi <= 0) return ARC[Math.max(0, hi)][1]
  const [x0, y0] = ARC[hi - 1]
  const [x1, y1] = ARC[hi]
  return y0 + ((f - x0) / (x1 - x0)) * (y1 - y0)
}

interface CandleSeries {
  candles: Candle[]
  min: number
  max: number
  maxVolume: number
}

function makeCandles(seed: number, count = 96, ceil = 3000): CandleSeries {
  const rand = mulberry32(seed)
  const floor = ceil * 0.12
  const span = ceil - floor
  const start = Date.UTC(2025, 4, 12) 
  const step = 6 * 36e5

  const candles: Candle[] = []
  let prev = floor + lerpArc(0) * span
  for (let i = 0; i < count; i++) {
    const o = prev
    const base = floor + lerpArc(i / (count - 1)) * span
    const c = Math.max(floor * 0.6, base * (1 + (rand() - 0.5) * 0.1))
    const h = Math.max(o, c) * (1 + rand() * 0.03)
    const l = Math.min(o, c) * (1 - rand() * 0.03)
    candles.push({ o, h, l, c, v: Math.abs(c - o) * 0.05 + rand() * 12, t: start + i * step })
    prev = c
  }

  return {
    candles,
    min: Math.min(...candles.map((k) => k.l)),
    max: Math.max(...candles.map((k) => k.h)),
    maxVolume: Math.max(...candles.map((k) => k.v)),
  }
}

const fmtUsd = (v: number) =>
  `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

const fmtAxis = (v: number) => (v === 0 ? '$0' : `$${Math.round(v).toLocaleString('en-US')}`)

const fmtDay = (t: number) =>
  new Date(t).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', timeZone: 'UTC' })

const fmtStamp = (t: number) =>
  new Date(t)
    .toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'UTC',
    })
    .replace(',', '') + ' UTC'

const BAL_TIMEFRAMES = ['1H', '24H', '1W', '1M', '1Y', 'All'] as const
type BalTimeframe = (typeof BAL_TIMEFRAMES)[number]

const N = 90

function balanceSeries(base: number, tf: BalTimeframe = '24H', changePct?: number, seed?: number): number[] {
  const rand = mulberry32(seed ?? 11 + BAL_TIMEFRAMES.indexOf(tf) * 97)
  const drift = tf === '1W' ? -0.12 : 0.35
  const vals: number[] = []
  let v = base * 0.94
  for (let i = 0; i < N; i++) {
    v += (rand() - 0.42) * base * 0.006 + drift * base * 0.0008
    vals.push(v)
  }
  const end = vals[N - 1]
  if (end !== 0) {
    const k = base / end
    for (let i = 0; i < N; i++) vals[i] *= k
  }
  if (changePct !== undefined && vals[0] !== 0) {
    const open = base / (1 + changePct / 100)
    const ramp = open / vals[0]
    for (let i = 0; i < N; i++) vals[i] *= Math.pow(ramp, 1 - i / (N - 1))
  }
  return vals
}

const VB_W = 560
const VB_H = 300
const AXIS_W = 64
const VOL_H = 46
const GAP = 8

const MIN_W = 340
const MAX_W = 920
const MIN_VOL = 20
const MAX_VOL = 120

export const TIMEFRAMES = ['1D', '5D', '1M', '6M', '1Y'] as const
const TF_COUNT: Record<(typeof TIMEFRAMES)[number], number> = { '1D': 24, '5D': 40, '1M': 60, '6M': 80, '1Y': 96 }
const MIN_VISIBLE = 12
const MAX_VISIBLE = 400
const Y_SCALE_MIN = 0.4
const Y_SCALE_MAX = 1.6

export type CandleChartProps = {
  seed?: number
  symbol?: string
  className?: string
  exchange?: string | null
  ceil?: number
  mid?: number
  kind?: 'candles' | 'line' | 'bars'
  priceFmt?: (n: number) => string
  axisFmt?: (n: number) => string
  chrome?: boolean
  fill?: boolean
  data?: Candle[]
  timeframe?: (typeof TIMEFRAMES)[number]
  onTimeframeChange?: (tf: (typeof TIMEFRAMES)[number]) => void
  dayFmt?: (t: number) => string
  stampFmt?: (t: number) => string
}

export default function CandleChart({
  seed = 51,
  symbol = 'NOVX',
  className,
  exchange = 'MERIDIAN',
  ceil = 3000,
  priceFmt = fmtUsd,
  axisFmt = fmtAxis,
  chrome = true,
  mid,
  kind = 'candles',
  fill = false,
  data,
  timeframe: timeframeProp,
  onTimeframeChange,
  dayFmt = fmtDay,
  stampFmt = fmtStamp,
}: CandleChartProps) {
  const reduced = useReducedMotion() || isSnapshot()
  const [timeframeState, setTimeframe] = useState<(typeof TIMEFRAMES)[number]>('6M')
  const timeframe = timeframeProp ?? timeframeState
  const [hover, setHover] = useState<number | null>(null)
  const [zone, setZone] = useState<'price' | 'volume'>('price')
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const [width, setWidth] = useState<number | null>(null)
  const [volH, setVolH] = useState(VOL_H)
  const widthDrag = useRef<{ startX: number; startW: number; max: number } | null>(null)
  const volDrag = useRef(false)

  const plotRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)
  useEffect(() => {
    const el = plotRef.current
    if (!fill || !el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect
      setBox({ w: Math.round(r.width), h: Math.round(r.height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [fill])

  const VW = fill && box ? Math.max(240, box.w) : VB_W
  const VH = fill && box ? Math.max(160, box.h) : VB_H
  const plotH = VH - volH - GAP

  const { candles, maxVolume } = useMemo(() => {
    if (data && data.length >= 2) {
      return { candles: data, maxVolume: Math.max(...data.map((k) => k.v), 1e-9) }
    }
    if (mid == null) return makeCandles(seed, 96, ceil)
    const walk = balanceSeries(mid, '24H')
    let s2 = (seed * 2654435761) >>> 0
    const rnd = () => {
      s2 = (s2 * 1103515245 + 12345) & 0x7fffffff
      return s2 / 0x7fffffff
    }
    const start = Date.UTC(2025, 4, 12)
    const candles: Candle[] = walk.map((c, i) => {
      const o = i === 0 ? c : walk[i - 1]
      const h = Math.max(o, c) * (1 + rnd() * 0.0011)
      const l = Math.min(o, c) * (1 - rnd() * 0.0011)
      return { o, h, l, c, v: Math.abs(c - o) * 0.4 + rnd() * 14, t: start + i * 6 * 36e5 }
    })
    return { candles, maxVolume: Math.max(...candles.map((k) => k.v)) }
  }, [seed, ceil, mid, data])
  const n = candles.length

  const [visible, setVisible] = useState(TF_COUNT['6M'])
  useEffect(() => {
    if (data) setVisible(data.length)
  }, [data?.length]) 
  const [yScale, setYScale] = useState(1)
  const axisZoneRef = useRef<HTMLDivElement>(null)
  const dateAxisRef = useRef<HTMLDivElement>(null)
  const yDrag = useRef<{ startY: number; startS: number } | null>(null)

  const view = useMemo(() => candles.slice(n - Math.min(visible, n)), [candles, n, visible])
  const vn = view.length

  const active: Candle = view[Math.min(hover ?? vn - 1, vn - 1)]
  const change = active.c - active.o
  const changePct = (change / active.o) * 100
  const up = change >= 0
  const totalPct = ((view[vn - 1].c - view[0].o) / view[0].o) * 100
  const totalUp = totalPct >= 0

  const plotW = VW - AXIS_W
  const slot = plotW / vn
  const bodyW = slot * 0.58
  const xMid = (i: number) => i * slot + slot / 2
  const maxHigh = useMemo(() => Math.max(...view.map((k) => k.h)), [view])
  const minLow = useMemo(() => Math.min(...view.map((k) => k.l)), [view])
  const banded = mid != null || (data != null && data.length >= 2)
  const mid0 = (maxHigh + minLow) / 2
  const half = ((maxHigh - minLow) / 2) * 1.06 * (banded ? yScale : 1)
  const effCeil = banded ? mid0 + half : Math.max(ceil * yScale, maxHigh * 1.02)
  const effFloor = banded ? mid0 - half : 0
  const yPrice = (v: number) => (1 - (v - effFloor) / (effCeil - effFloor || 1)) * plotH

  const ticks = banded
    ? [effCeil, mid0 + half / 3, mid0 - half / 3, effFloor]
    : [effCeil, (effCeil * 2) / 3, effCeil / 3, 0]
  const dateLabels = useMemo(
    () => Array.from({ length: 6 }, (_, i) => view[Math.min(vn - 1, Math.floor((i * vn) / 6))]),
    [view, vn],
  )

  useEffect(() => {
    const axis = axisZoneRef.current
    const dates = dateAxisRef.current
    const onAxisWheel = (e: WheelEvent) => {
      e.preventDefault()
      setYScale((s) => Math.max(Y_SCALE_MIN, Math.min(Y_SCALE_MAX, s * Math.exp(e.deltaY * 0.0016))))
    }
    const onDateWheel = (e: WheelEvent) => {
      e.preventDefault()
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY
      setHover(null)
      setVisible((v) => Math.round(Math.max(MIN_VISIBLE, Math.min(MAX_VISIBLE, v + d * 0.12))))
    }
    axis?.addEventListener('wheel', onAxisWheel, { passive: false })
    dates?.addEventListener('wheel', onDateWheel, { passive: false })
    return () => {
      axis?.removeEventListener('wheel', onAxisWheel)
      dates?.removeEventListener('wheel', onDateWheel)
    }
  }, [])

  const onMove = (e: React.PointerEvent) => {
    const el = svgRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * VW
    const py = ((e.clientY - r.top) / r.height) * VH
    setCursor({ x: px, y: py })
    setHover(Math.max(0, Math.min(vn - 1, Math.floor(px / slot))))
    setZone(py > plotH + GAP / 2 ? 'volume' : 'price')
  }

  const inPrice = cursor !== null && zone === 'price' && cursor.y >= 0 && cursor.y <= plotH
  const cursorPrice = cursor ? effFloor + (1 - cursor.y / plotH) * (effCeil - effFloor) : 0
  const lastBar = view[vn - 1]
  const lastUp = lastBar.c >= lastBar.o
  const lastY = Math.max(9, Math.min(plotH - 9, yPrice(lastBar.c)))
  const LINE = 'color-mix(in srgb, hsl(var(--foreground)) 38%, transparent)'

  return (
    <div
      ref={rootRef}
      className={`${fill ? 'flex h-full w-full flex-col' : 'w-full max-w-[600px]'} ${className ?? ''}`}
      style={!fill && width !== null ? { width, maxWidth: width } : undefined}
    >
      {chrome && (
      <div className="flex shrink-0 items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-[0.1em] text-foreground/40">{symbol}</span>
            {exchange && <span className="text-[9px] uppercase tracking-[0.1em] text-foreground/25">· {exchange}</span>}
          </div>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="tabular-nums text-foreground/90" style={{ fontFamily: SANS, fontSize: 24, lineHeight: 1 }}>
              {priceFmt(view[vn - 1].c)}
            </span>
            <span className="tabular-nums text-[12px]" style={{ fontFamily: SANS, color: totalUp ? UP : DOWN }}>
              {totalUp ? '+' : '−'}
              {Math.abs(totalPct).toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="flex items-center gap-0.5 rounded-full border border-foreground/[0.04] p-0.5">
          {TIMEFRAMES.map((tf) => {
            const on = tf === timeframe
            return (
              <button
                key={tf}
                type="button"
                aria-pressed={on}
                onClick={() => { setTimeframe(tf); onTimeframeChange?.(tf); if (!data) setVisible(TF_COUNT[tf]); setHover(null) }}
                className={`relative rounded-full px-2.5 py-1 text-[10px] tracking-[0.06em] transition-colors duration-200 ${
                  on ? 'text-foreground' : 'text-foreground/40 hover:text-foreground/70'
                }`}
                style={{ fontFamily: SANS }}
              >
                {on && (
                  <motion.span
                    layoutId={`cc-tf-${seed}`}
                    className="absolute inset-0 rounded-full bg-foreground/[0.08]"
                    style={{ boxShadow: 'inset 0 1px 0 0 color-mix(in srgb, hsl(var(--foreground)) 6%, transparent)' }}
                    transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 38 }}
                  />
                )}
                <span className="relative">{tf}</span>
              </button>
            )
          })}
        </div>
      </div>
      )}

      <div ref={plotRef} className={`relative mt-3 ${fill ? 'min-h-0 flex-1' : ''}`}>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VW} ${VH}`}
          className={`touch-none ${fill ? 'h-full w-full' : 'w-full'}`}
          onPointerMove={onMove}
          onPointerLeave={() => { setHover(null); setCursor(null) }}
          role="img"
          aria-label={`${symbol} candlestick chart`}
        >
          {/* price gridlines + right-hand scale */}
          {ticks.map((t) => (
            <g key={t}>
              <line x1={0} x2={plotW} y1={yPrice(t)} y2={yPrice(t)} stroke="color-mix(in srgb, hsl(var(--foreground)) 5%, transparent)" strokeWidth="1" />
              <text
                x={VW - 4}
                y={Math.max(9, Math.min(plotH - 2, yPrice(t) + 3))}
                textAnchor="end"
                fill="color-mix(in srgb, hsl(var(--foreground)) 28%, transparent)"
                style={{ fontFamily: SANS, fontSize: 8.5 }}
              >
                {axisFmt(t)}
              </text>
            </g>
          ))}

          {/* live price: guide line + tag on the axis, follows the newest close in real time */}
          <line
            x1={0}
            x2={plotW}
            y1={yPrice(lastBar.c)}
            y2={yPrice(lastBar.c)}
            stroke={lastUp ? UP : DOWN}
            strokeOpacity="0.55"
            strokeDasharray="2 4"
            strokeWidth="1"
          />
          <g transform={`translate(${plotW}, ${lastY - 9})`} pointerEvents="none">
            <rect x={0} y={0} width={AXIS_W - 2} height={18} rx={4} fill="hsl(var(--foreground))" />
            <text x={(AXIS_W - 2) / 2} y={12.5} textAnchor="middle" fontSize={9} fontWeight={600} fill="hsl(var(--card))" style={{ fontFamily: SANS }} className="tabular-nums">
              {axisFmt(lastBar.c)}
            </text>
          </g>

          {/* candles — wick + body, direction is the only hue */}
          <motion.g
            initial={reduced ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={reduced ? { duration: 0 } : { duration: 0.6, ease: EASE }}
          >
            {kind === 'line' ? (
              <>
                <path
                  d={view.map((k, i) => `${i ? 'L' : 'M'}${xMid(i).toFixed(1)} ${yPrice(k.c).toFixed(1)}`).join(' ')}
                  fill="none"
                  stroke={totalUp ? UP : DOWN}
                  strokeWidth={1.6}
                  vectorEffect="non-scaling-stroke"
                />
                <path
                  d={`${view.map((k, i) => `${i ? 'L' : 'M'}${xMid(i).toFixed(1)} ${yPrice(k.c).toFixed(1)}`).join(' ')} L${xMid(vn - 1).toFixed(1)} ${plotH} L${xMid(0).toFixed(1)} ${plotH} Z`}
                  fill={totalUp ? UP : DOWN}
                  opacity={0.07}
                />
              </>
            ) : (
              view.map((k, i) => {
                const color = k.c >= k.o ? UP : DOWN
                const top = yPrice(Math.max(k.o, k.c))
                const bottom = yPrice(Math.min(k.o, k.c))
                return (
                  <g key={i}>
                    <line
                      x1={xMid(i)}
                      x2={xMid(i)}
                      y1={yPrice(k.h)}
                      y2={yPrice(k.l)}
                      stroke={color}
                      strokeWidth="1"
                      vectorEffect="non-scaling-stroke"
                    />
                    {kind === 'bars' ? (
                      <>
                        {/* OHLC ticks: open to the left, close to the right */}
                        <line x1={xMid(i) - bodyW / 2} x2={xMid(i)} y1={yPrice(k.o)} y2={yPrice(k.o)} stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                        <line x1={xMid(i)} x2={xMid(i) + bodyW / 2} y1={yPrice(k.c)} y2={yPrice(k.c)} stroke={color} strokeWidth="1" vectorEffect="non-scaling-stroke" />
                      </>
                    ) : (
                      <rect x={xMid(i) - bodyW / 2} y={top} width={bodyW} height={Math.max(1, bottom - top)} fill={color} />
                    )}
                  </g>
                )
              })
            )}
          </motion.g>

          {/* volume strip */}
          <g transform={`translate(0 ${plotH + GAP})`}>
            {view.map((k, i) => {
              const h = (k.v / maxVolume) * volH
              return (
                <rect
                  key={i}
                  x={xMid(i) - bodyW / 2}
                  y={volH - h}
                  width={bodyW}
                  height={h}
                  fill={k.c >= k.o ? UP : DOWN}
                  fillOpacity={0.6}
                />
              )
            })}
          </g>

          {/* crosshair: dotted vertical line on the hovered candle, dotted horizontal line at the
              pointer with its price on the right axis (the time is shown on the date axis below) */}
          {hover !== null && cursor && (
            <g pointerEvents="none">
              <line x1={xMid(hover)} x2={xMid(hover)} y1={0} y2={VH} stroke={LINE} strokeDasharray="2 3" strokeWidth="1" vectorEffect="non-scaling-stroke" />
              {inPrice && (
                <>
                  <line x1={0} x2={plotW} y1={cursor.y} y2={cursor.y} stroke={LINE} strokeDasharray="2 3" strokeWidth="1" />
                  <g transform={`translate(${plotW}, ${Math.max(9, Math.min(plotH - 9, cursor.y)) - 9})`}>
                    <rect x={0} y={0} width={AXIS_W - 2} height={18} rx={4} fill="hsl(var(--card))" stroke={LINE} />
                    <path d="M6 9h6M9 6v6" stroke="hsl(var(--foreground))" strokeWidth={1.2} strokeLinecap="round" fill="none" />
                    <text x={17} y={12.5} fontSize={9} fontWeight={600} fill="hsl(var(--foreground))" style={{ fontFamily: SANS }} className="tabular-nums">
                      {axisFmt(cursorPrice)}
                    </text>
                  </g>
                </>
              )}
            </g>
          )}
        </svg>

        {/* price-axis zone — scroll OR drag vertically over the numbers to zoom
            the price scale (pointer-captured, like the other handles) */}
        <div
          ref={axisZoneRef}
          aria-hidden
          className="absolute inset-y-0 right-0 z-[5] cursor-ns-resize touch-none select-none"
          style={{ width: `${(AXIS_W / VW) * 100}%` }}
          onPointerDown={(e) => {
            yDrag.current = { startY: e.clientY, startS: yScale }
            e.currentTarget.setPointerCapture?.(e.pointerId)
          }}
          onPointerMove={(e) => {
            const d = yDrag.current
            if (!d) return
            const h = svgRef.current?.getBoundingClientRect().height || 300
            /* drag down = zoom out (higher ceiling), drag up = zoom in — matches the wheel */
            setYScale(Math.max(Y_SCALE_MIN, Math.min(Y_SCALE_MAX, d.startS * Math.exp(((e.clientY - d.startY) / h) * 2.2))))
          }}
          onPointerUp={() => (yDrag.current = null)}
          onPointerCancel={() => (yDrag.current = null)}
        />

        {/* left-edge width handle — drag left to grow, right to shrink.
            fill mode has no card to widen: the pane owns the width. */}
        {!fill && (
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize chart width"
          aria-valuenow={Math.round(width ?? 600)}
          aria-valuemin={MIN_W}
          aria-valuemax={MAX_W}
          tabIndex={0}
          className="group absolute -left-2 inset-y-0 z-10 flex w-3 cursor-ew-resize touch-none select-none items-center justify-center outline-none focus-visible:ring-1 focus-visible:ring-foreground/30"
          onPointerDown={(e) => {
            const el = rootRef.current
            widthDrag.current = {
              startX: e.clientX,
              startW: el?.getBoundingClientRect().width ?? 600,
              max: Math.min(MAX_W, el?.parentElement?.clientWidth || MAX_W),
            }
            e.currentTarget.setPointerCapture?.(e.pointerId)
          }}
          onPointerMove={(e) => {
            const d = widthDrag.current
            if (!d) return
            setWidth(Math.round(Math.max(MIN_W, Math.min(d.max, d.startW + (d.startX - e.clientX)))))
          }}
          onPointerUp={() => (widthDrag.current = null)}
          onPointerCancel={() => (widthDrag.current = null)}
          onKeyDown={(e) => {
            const step = e.key === 'ArrowLeft' ? 16 : e.key === 'ArrowRight' ? -16 : 0
            if (!step) return
            e.preventDefault()
            setWidth((w) => {
              const cur = w ?? rootRef.current?.getBoundingClientRect().width ?? 600
              return Math.round(Math.max(MIN_W, Math.min(MAX_W, cur + step)))
            })
          }}
        >
          <span className="h-9 w-[3px] rounded-full bg-foreground/[0.14] transition-colors duration-200 group-hover:bg-foreground/35" />
        </div>
        )}

        {/* price/volume divider — drag up for a taller volume pane */}
        <div
          role="separator"
          aria-orientation="horizontal"
          aria-label="Resize volume pane"
          aria-valuenow={Math.round(volH)}
          aria-valuemin={MIN_VOL}
          aria-valuemax={MAX_VOL}
          tabIndex={0}
          className="group absolute inset-x-0 z-10 flex h-3 -translate-y-1/2 cursor-ns-resize touch-none select-none items-center justify-center outline-none focus-visible:ring-1 focus-visible:ring-foreground/30"
          style={{ top: `${((plotH + GAP / 2) / VH) * 100}%` }}
          onPointerDown={(e) => {
            volDrag.current = true
            e.currentTarget.setPointerCapture?.(e.pointerId)
          }}
          onPointerMove={(e) => {
            if (!volDrag.current) return
            const r = svgRef.current?.getBoundingClientRect()
            if (!r) return
            const vy = ((e.clientY - r.top) / r.height) * VH
            setVolH(Math.max(MIN_VOL, Math.min(MAX_VOL, VH - vy - GAP / 2)))
          }}
          onPointerUp={() => (volDrag.current = false)}
          onPointerCancel={() => (volDrag.current = false)}
          onKeyDown={(e) => {
            if (e.key === 'ArrowUp') { e.preventDefault(); setVolH((v) => Math.min(MAX_VOL, v + 8)) }
            if (e.key === 'ArrowDown') { e.preventDefault(); setVolH((v) => Math.max(MIN_VOL, v - 8)) }
          }}
        >
          {/* thumb hidden until the divider is hovered / keyboard-focused */}
          <span className="h-[3px] w-8 rounded-full bg-foreground/35 opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100" />
        </div>

        {/* live open / high / low / close: the newest candle (it moves with every tick),
            or the candle under the pointer while hovering */}
        <div
          className="pointer-events-none absolute left-2 top-2 z-10 rounded-md bg-card/70 px-2.5 py-1.5 backdrop-blur-sm"
          role="status"
          aria-label="Open, high, low and close"
        >
          <div className="grid grid-cols-[auto_auto] gap-x-3 gap-y-0.5 text-[11px] leading-4" style={{ fontFamily: SANS }}>
            {(['o', 'h', 'l', 'c'] as const).map((key, idx) => (
              <div key={key} className="contents">
                <span className="text-foreground/40">{['open', 'high', 'low', 'close'][idx]}</span>
                <span className="tabular-nums text-right text-foreground/90" style={key === 'c' ? { color: up ? UP : DOWN } : undefined}>
                  {priceFmt(active[key])}
                </span>
              </div>
            ))}
            {zone === 'volume' && hover !== null && (
              <div className="contents">
                <span className="text-foreground/40">vol</span>
                <span className="tabular-nums text-right text-foreground/90">{active.v.toFixed(2)}M</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* date axis — scroll sideways (or vertically) here to change how much chart is visible */}
      <div ref={dateAxisRef} className="relative mt-2 flex shrink-0 cursor-ew-resize touch-none select-none justify-between border-t border-foreground/[0.04] pt-2" style={{ paddingRight: AXIS_W }}>
        {dateLabels.map((k, i) => (
          <span key={i} className="tabular-nums text-[9px] text-foreground/30" style={{ fontFamily: SANS }}>
            {dayFmt(k.t)}
          </span>
        ))}
        {/* time of the hovered candle, sitting on the date axis under the vertical line */}
        {hover !== null && (
          <div
            className="pointer-events-none absolute top-1/2 z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-md border border-foreground/10 bg-card px-2 py-0.5 text-[10px] tabular-nums text-foreground"
            style={{ left: `clamp(48px, ${(xMid(hover) / VW) * 100}%, calc(100% - ${AXIS_W + 48}px))`, fontFamily: SANS }}
          >
            {stampFmt(active.t)}
          </div>
        )}
      </div>
    </div>
  )
}

export function Demo() {
  return (
    <div className="flex min-h-[420px] w-full items-center justify-center p-6">
      <CandleChart />
    </div>
  )
}

export { CandleChart as Component }
