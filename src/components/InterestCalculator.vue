<script setup lang="ts">
import { computed, ref } from 'vue'
import { calculateSofipoCompoundInterest } from '../domain/sofipoInterest'

type SeriesPoint = {
  day: number
  endA: number
  endB: number
  endTotal: number
  gainA: number
  gainB: number
  gainTotal: number
}

const props = withDefaults(
  defineProps<{
    totalInvestment?: number
    limitBlockA?: number
    rateA?: number
    rateB?: number
    days?: number
  }>(),
  {
    totalInvestment: 20000,
    limitBlockA: 10000,
    rateA: 16,
    rateB: 7.25,
    days: 30,
  },
)

const totalInvestment = ref<number>(props.totalInvestment)
const limitBlockA = ref<number>(props.limitBlockA)
const rateA = ref<number>(props.rateA)
const rateB = ref<number>(props.rateB)
const days = ref<number>(props.days)

const series = computed<SeriesPoint[]>(() => {
  const maxDays = Math.max(0, Math.floor(days.value))
  const out: SeriesPoint[] = []

  for (let d = 0; d <= maxDays; d++) {
    const res = calculateSofipoCompoundInterest({
      totalInvestment: totalInvestment.value,
      limitBlockA: limitBlockA.value,
      rateA: rateA.value,
      rateB: rateB.value,
      days: d,
    })

    out.push({
      day: d,
      endA: res.endA,
      endB: res.endB,
      endTotal: res.endTotal,
      gainA: res.gainA,
      gainB: res.gainB,
      gainTotal: res.gainTotal,
    })
  }

  return out
})

const finalPoint = computed(() => series.value[series.value.length - 1])

type ChartMode = 'balance' | 'gain' | 'blocks'
const chartMode = ref<ChartMode>('balance')

const hoveredDay = ref<number | null>(null)
const pinnedDay = ref<number | null>(null)
const activeDay = computed(() => pinnedDay.value ?? hoveredDay.value)

function clampInt(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function formatDayLabel(day: number): string {
  if (day === 1) return 'Día 1'
  if (day === 7) return 'Día 7'
  if (day === 30) return 'Día 30'
  return `Día ${day}`
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

type PeriodRow = {
  label: string
  days: number
  gainA: number
  gainB: number
  gainTotal: number
}

const sofipoPeriodRows = computed<PeriodRow[]>(() => {
  const rows = [
    { label: 'Día 1', days: 1 },
    { label: 'Semana 1', days: 7 },
    { label: 'Mes 1 (30 días)', days: 30 },
  ]

  return rows.map((r) => {
    const res = calculateSofipoCompoundInterest({
      totalInvestment: totalInvestment.value,
      limitBlockA: limitBlockA.value,
      rateA: rateA.value,
      rateB: rateB.value,
      days: r.days,
    })

    const gainA = res.gainA
    const gainB = res.gainB
    return {
      label: r.label,
      days: r.days,
      gainA,
      gainB,
      gainTotal: gainA + gainB,
    }
  })
})

const weeklyRows = computed(() => {
  const out: SeriesPoint[] = []
  const lastDay = series.value[series.value.length - 1]?.day
  for (const p of series.value) {
    if (p.day % 7 === 0 || p.day === lastDay) out.push(p)
  }
  return out
})

const monthlyRows = computed(() => {
  const out: SeriesPoint[] = []
  const lastDay = series.value[series.value.length - 1]?.day
  for (const p of series.value) {
    if (p.day % 30 === 0 || p.day === lastDay) out.push(p)
  }
  return out
})

const chart = computed(() => {
  const data = series.value
  if (data.length === 0) {
    return {
      width: 900,
      height: 300,
      padding: { top: 16, right: 16, bottom: 34, left: 68 },
      plot: { x0: 68, y0: 16, w: 900 - 68 - 16, h: 300 - 16 - 34 },
      x: { min: 0, max: 0, ticks: [0] as number[] },
      y: { min: 0, max: 0, ticks: [0] as number[] },
      paths: { total: '', a: '', b: '' },
      milestones: [] as number[],
      milestoneLines: [] as { x: number; day: number }[],
      active: null as null | {
        day: number
        x: number
        yTotal: number
        yA: number
        yB: number
        point: SeriesPoint
      },
      xFromClientX: () => 0,
      toX: () => 0,
      toY: () => 0,
    }
  }

  const width = 900
  const height = 300
  const padding = { top: 16, right: 16, bottom: 34, left: 68 }
  const plot = {
    x0: padding.left,
    y0: padding.top,
    w: width - padding.left - padding.right,
    h: height - padding.top - padding.bottom,
  }

  const minX = data[0]!.day
  const maxX = data[data.length - 1]!.day
  const xSpan = Math.max(1, maxX - minX)

  const yValuesTotal = chartMode.value === 'gain' ? data.map((d) => d.gainTotal) : data.map((d) => d.endTotal)
  const yValuesA = chartMode.value === 'gain' ? data.map((d) => d.gainA) : data.map((d) => d.endA)
  const yValuesB = chartMode.value === 'gain' ? data.map((d) => d.gainB) : data.map((d) => d.endB)

  const minY = Math.min(
    ...yValuesTotal,
    ...(chartMode.value === 'blocks' ? [...yValuesA, ...yValuesB] : []),
  )
  const maxY = Math.max(
    ...yValuesTotal,
    ...(chartMode.value === 'blocks' ? [...yValuesA, ...yValuesB] : []),
  )

  const ySpan = Math.max(1e-9, maxY - minY)

  const toX = (day: number) => plot.x0 + ((day - minX) / xSpan) * plot.w
  const toY = (value: number) => plot.y0 + (1 - (value - minY) / ySpan) * plot.h

  const xFromClientX = (clientX: number, rectLeft: number) => {
    const x = clientX - rectLeft
    const ratio = (x - plot.x0) / plot.w
    return minX + ratio * xSpan
  }

  const makePath = (values: number[]) =>
    data
      .map((d, i) => `${toX(d.day).toFixed(2)},${toY(values[i]!).toFixed(2)}`)
      .join(' ')

  const paths = {
    total: makePath(yValuesTotal),
    a: chartMode.value === 'blocks' ? makePath(yValuesA) : '',
    b: chartMode.value === 'blocks' ? makePath(yValuesB) : '',
  }

  const xTickStep = maxX <= 60 ? 7 : maxX <= 400 ? 30 : 90
  const xTicks: number[] = [minX]
  for (let t = Math.ceil(minX / xTickStep) * xTickStep; t < maxX; t += xTickStep) xTicks.push(t)
  if (xTicks[xTicks.length - 1] !== maxX) xTicks.push(maxX)

  const yTickCount = 5
  const yTicks: number[] = []
  for (let i = 0; i < yTickCount; i++) {
    const v = minY + (ySpan * i) / (yTickCount - 1)
    yTicks.push(v)
  }

  const milestones = Array.from(new Set([1, 7, 30, maxX].filter((d) => d >= minX && d <= maxX))).sort(
    (a, b) => a - b,
  )

  const milestoneLines = milestones.map((d) => ({ day: d, x: toX(d) }))

  const day = activeDay.value
  const active =
    day == null
      ? null
      : (() => {
          const clampedDay = clampInt(day, minX, maxX)
          const point = data[clampedDay - minX]!
          const yTotal = toY(chartMode.value === 'gain' ? point.gainTotal : point.endTotal)
          const yA = toY(chartMode.value === 'gain' ? point.gainA : point.endA)
          const yB = toY(chartMode.value === 'gain' ? point.gainB : point.endB)
          return { day: clampedDay, x: toX(clampedDay), yTotal, yA, yB, point }
        })()

  return {
    width,
    height,
    padding,
    plot,
    x: { min: minX, max: maxX, ticks: xTicks },
    y: { min: minY, max: maxY, ticks: yTicks },
    paths,
    milestones,
    milestoneLines,
    active,
    xFromClientX,
    toX,
    toY,
  }
})

function onChartMouseMove(evt: MouseEvent) {
  const target = evt.currentTarget as SVGElement | null
  if (!target) return
  const rect = target.getBoundingClientRect()
  const xValue = chart.value.xFromClientX(evt.clientX, rect.left)
  hoveredDay.value = clampInt(xValue, chart.value.x.min, chart.value.x.max)
}

function onChartMouseLeave() {
  hoveredDay.value = null
}

function onChartClick() {
  const d = hoveredDay.value
  if (d == null) return
  pinnedDay.value = pinnedDay.value === d ? null : d
}
</script>

<template>
  <div class="page">
    <div class="panel">
      <h1>Calculadora de Interés Compuesto</h1>

      <div class="grid">
        <div class="field">
          <label>Capital total</label>
          <input v-model.number="totalInvestment" type="number" min="0" step="0.01" />
        </div>

        <div class="field">
          <label>Días</label>
          <input v-model.number="days" type="number" min="0" step="1" />
        </div>
      </div>

      <h2>Bloques</h2>

      <div class="grid">
        <div class="field">
          <label>Límite Bloque A</label>
          <input v-model.number="limitBlockA" type="number" min="0" step="0.01" />
        </div>

        <div class="field">
          <label>Tasa anual Bloque A (%)</label>
          <input v-model.number="rateA" type="number" min="0" step="0.0001" />
        </div>

        <div class="field">
          <label>Tasa anual Bloque B (%)</label>
          <input v-model.number="rateB" type="number" min="0" step="0.0001" />
        </div>
      </div>

      <div class="summary">
        <div class="summaryItem">
          <div class="summaryLabel">Balance final</div>
          <div class="summaryValue">{{ formatMoney(finalPoint?.endTotal ?? 0) }}</div>
        </div>
        <div class="summaryItem">
          <div class="summaryLabel">Interés ganado</div>
          <div class="summaryValue">{{ formatMoney(finalPoint?.gainTotal ?? 0) }}</div>
        </div>
      </div>

      <h2>Ganancia por periodo (bloques A/B)</h2>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Periodo</th>
              <th>PeriodoDías</th>
              <th>Ganancia Bloque A</th>
              <th>Ganancia Bloque B</th>
              <th>Ganancia Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in sofipoPeriodRows" :key="row.label">
              <td>{{ row.label }}</td>
              <td>{{ row.days }}</td>
              <td>{{ formatMoney(row.gainA) }}</td>
              <td>{{ formatMoney(row.gainB) }}</td>
              <td>{{ formatMoney(row.gainTotal) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <h2>Gráfica (lineal)</h2>

      <div class="chartControls">
        <label>
          Mostrar
          <select v-model="chartMode">
            <option value="balance">Balance total</option>
            <option value="gain">Interés ganado</option>
            <option value="blocks">Bloque A vs B</option>
          </select>
        </label>
      </div>

      <div class="chartWrap">
        <div class="chartStage">
          <svg
            :width="chart.width"
            :height="chart.height"
            :viewBox="`0 0 ${chart.width} ${chart.height}`"
            role="img"
            @mousemove="onChartMouseMove"
            @mouseleave="onChartMouseLeave"
            @click="onChartClick"
          >
            <g>
              <line
                :x1="chart.plot.x0"
                :y1="chart.plot.y0 + chart.plot.h"
                :x2="chart.plot.x0 + chart.plot.w"
                :y2="chart.plot.y0 + chart.plot.h"
                stroke="currentColor"
                opacity="0.25"
              />
              <line
                :x1="chart.plot.x0"
                :y1="chart.plot.y0"
                :x2="chart.plot.x0"
                :y2="chart.plot.y0 + chart.plot.h"
                stroke="currentColor"
                opacity="0.25"
              />
            </g>

            <g>
              <g v-for="t in chart.y.ticks" :key="`y-${t}`">
                <line
                  :x1="chart.plot.x0"
                  :y1="chart.toY(t)"
                  :x2="chart.plot.x0 + chart.plot.w"
                  :y2="chart.toY(t)"
                  stroke="currentColor"
                  opacity="0.08"
                />
                <text
                  :x="chart.plot.x0 - 10"
                  :y="chart.toY(t)"
                  text-anchor="end"
                  dominant-baseline="middle"
                  fill="currentColor"
                  opacity="0.75"
                  style="font-size: 12px"
                >
                  {{ formatMoney(t) }}
                </text>
              </g>
            </g>

            <g>
              <g v-for="t in chart.x.ticks" :key="`x-${t}`">
                <line
                  :x1="chart.toX(t)"
                  :y1="chart.plot.y0 + chart.plot.h"
                  :x2="chart.toX(t)"
                  :y2="chart.plot.y0 + chart.plot.h + 6"
                  stroke="currentColor"
                  opacity="0.25"
                />
                <text
                  :x="chart.toX(t)"
                  :y="chart.plot.y0 + chart.plot.h + 18"
                  text-anchor="middle"
                  dominant-baseline="middle"
                  fill="currentColor"
                  opacity="0.75"
                  style="font-size: 12px"
                >
                  {{ t }}
                </text>
              </g>
            </g>

            <g>
              <line
                v-for="m in chart.milestoneLines"
                :key="`mline-${m.day}`"
                :x1="m.x"
                :y1="chart.plot.y0"
                :x2="m.x"
                :y2="chart.plot.y0 + chart.plot.h"
                stroke="currentColor"
                opacity="0.06"
              />
            </g>

            <g>
              <polyline
                :points="chart.paths.total"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                opacity="0.95"
              />
              <polyline
                v-if="chartMode === 'blocks'"
                :points="chart.paths.a"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                opacity="0.55"
                stroke-dasharray="4 4"
              />
              <polyline
                v-if="chartMode === 'blocks'"
                :points="chart.paths.b"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                opacity="0.35"
                stroke-dasharray="2 6"
              />
            </g>

            <g>
              <g v-for="d in chart.milestones" :key="`ms-${d}`">
                <circle
                  :cx="chart.toX(d)"
                  :cy="chart.toY(chartMode === 'gain' ? (series[d]?.gainTotal ?? 0) : (series[d]?.endTotal ?? 0))"
                  r="3"
                  fill="currentColor"
                  opacity="0.55"
                />
              </g>
            </g>

            <g v-if="chart.active">
              <line
                :x1="chart.active.x"
                :y1="chart.plot.y0"
                :x2="chart.active.x"
                :y2="chart.plot.y0 + chart.plot.h"
                stroke="currentColor"
                opacity="0.12"
              />
              <circle :cx="chart.active.x" :cy="chart.active.yTotal" r="4" fill="currentColor" />
              <circle
                v-if="chartMode === 'blocks'"
                :cx="chart.active.x"
                :cy="chart.active.yA"
                r="4"
                fill="currentColor"
                opacity="0.65"
              />
              <circle
                v-if="chartMode === 'blocks'"
                :cx="chart.active.x"
                :cy="chart.active.yB"
                r="4"
                fill="currentColor"
                opacity="0.45"
              />
            </g>
          </svg>

          <div v-if="chart.active" class="chartTooltip" :style="{ left: `${chart.active.x}px`, top: `${chart.plot.y0}px` }">
            <div class="chartTooltipTitle">
              {{ formatDayLabel(chart.active.day) }}
              <span v-if="pinnedDay != null" class="chartTooltipPinned">(fijo)</span>
            </div>

            <div class="chartTooltipRow">
              <span>Balance total</span>
              <strong>{{ formatMoney(chart.active.point.endTotal) }}</strong>
            </div>
            <div class="chartTooltipRow">
              <span>Ganancia total</span>
              <strong>{{ formatMoney(chart.active.point.gainTotal) }}</strong>
            </div>

            <div class="chartTooltipDivider"></div>

            <div class="chartTooltipRow">
              <span>Balance A</span>
              <strong>{{ formatMoney(chart.active.point.endA) }}</strong>
            </div>
            <div class="chartTooltipRow">
              <span>Ganancia A</span>
              <strong>{{ formatMoney(chart.active.point.gainA) }}</strong>
            </div>
            <div class="chartTooltipRow">
              <span>Balance B</span>
              <strong>{{ formatMoney(chart.active.point.endB) }}</strong>
            </div>
            <div class="chartTooltipRow">
              <span>Ganancia B</span>
              <strong>{{ formatMoney(chart.active.point.gainB) }}</strong>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="panel">
      <h2>Proyección semanal</h2>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Día</th>
              <th>Balance</th>
              <th>Interés</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in weeklyRows" :key="`w-${row.day}`">
              <td>{{ row.day }}</td>
              <td>{{ formatMoney(row.endTotal) }}</td>
              <td>{{ formatMoney(row.gainTotal) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel">
      <h2>Proyección mensual</h2>

      <div class="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Día</th>
              <th>Balance</th>
              <th>Interés</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in monthlyRows" :key="`m-${row.day}`">
              <td>{{ row.day }}</td>
              <td>{{ formatMoney(row.endTotal) }}</td>
              <td>{{ formatMoney(row.gainTotal) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page {
  width: 100%;
  display: grid;
  gap: 16px;
}

.panel {
  border: 1px solid var(--color-border);
  border-radius: 12px;
  padding: 16px;
  background: var(--color-background-soft);
}

h1 {
  font-size: 1.4rem;
  font-weight: 600;
  margin-bottom: 12px;
}

h2 {
  font-size: 1.1rem;
  font-weight: 600;
  margin-top: 16px;
  margin-bottom: 10px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

label {
  font-size: 0.9rem;
  opacity: 0.85;
}

input,
select {
  border: 1px solid var(--color-border);
  background: var(--color-background);
  color: var(--color-text);
  border-radius: 10px;
  padding: 10px 12px;
}

.summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.summaryItem {
  border: 1px solid var(--color-border);
  border-radius: 10px;
  padding: 12px;
  background: var(--color-background);
}

.summaryLabel {
  font-size: 0.9rem;
  opacity: 0.8;
}

.summaryValue {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 6px;
}

.tableWrap {
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background);
}

table {
  width: 100%;
  border-collapse: collapse;
}

th,
td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

thead th {
  background: var(--color-background-mute);
}

.chartWrap {
  overflow: auto;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background);
  padding: 12px;
}

.chartControls {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.chartControls label {
  display: flex;
  align-items: center;
  gap: 10px;
}

.chartStage {
  position: relative;
  width: fit-content;
}

.chartTooltip {
  position: absolute;
  transform: translateX(12px);
  min-width: 240px;
  max-width: 280px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background);
  padding: 10px 12px;
  pointer-events: none;
  box-shadow: 0 10px 22px rgba(0, 0, 0, 0.18);
}

.chartTooltipTitle {
  font-weight: 600;
  margin-bottom: 8px;
}

.chartTooltipPinned {
  opacity: 0.7;
  margin-left: 6px;
  font-weight: 500;
}

.chartTooltipRow {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin: 4px 0;
  font-size: 0.95rem;
}

.chartTooltipDivider {
  height: 1px;
  background: var(--color-border);
  margin: 8px 0;
  opacity: 0.8;
}

@media (max-width: 980px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .summary {
    grid-template-columns: 1fr;
  }
}
</style>
