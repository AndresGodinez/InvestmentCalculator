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

const dailyRows = computed(() => series.value)

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
  if (data.length === 0) return { width: 900, height: 260, points: '' }

  const width = 900
  const height = 260
  const padding = 24

  const minX = data[0]!.day
  const maxX = data[data.length - 1]!.day
  const minY = Math.min(...data.map((d) => d.endTotal))
  const maxY = Math.max(...data.map((d) => d.endTotal))

  const xSpan = Math.max(1, maxX - minX)
  const ySpan = Math.max(1e-9, maxY - minY)

  const toX = (day: number) => padding + ((day - minX) / xSpan) * (width - padding * 2)
  const toY = (balance: number) => padding + (1 - (balance - minY) / ySpan) * (height - padding * 2)

  const pointsAttr = data
    .map((d) => `${toX(d.day).toFixed(2)},${toY(d.endTotal).toFixed(2)}`)
    .join(' ')

  return { width, height, points: pointsAttr }
})
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

      <div class="chartWrap">
        <svg :width="chart.width" :height="chart.height" viewBox="0 0 900 260" role="img">
          <polyline :points="chart.points" fill="none" stroke="currentColor" stroke-width="2" />
        </svg>
      </div>
    </div>

    <div class="panel">
      <h2>Proyección diaria</h2>

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
            <tr v-for="row in dailyRows" :key="`d-${row.day}`">
              <td>{{ row.day }}</td>
              <td>{{ formatMoney(row.endTotal) }}</td>
              <td>{{ formatMoney(row.gainTotal) }}</td>
            </tr>
          </tbody>
        </table>
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

@media (max-width: 980px) {
  .grid {
    grid-template-columns: 1fr;
  }

  .summary {
    grid-template-columns: 1fr;
  }
}
</style>
