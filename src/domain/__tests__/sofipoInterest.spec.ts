import { describe, expect, it } from 'vitest'

import { calculateSofipoCompoundInterest } from '../sofipoInterest'

function parseMoney(input: string): number {
  // Accept values like "$1,434.31" or "1,434.31" or "1434.31"
  const normalized = input.replace(/\$/g, '').replace(/,/g, '').trim()
  return Number(normalized)
}

describe('calculateSofipoCompoundInterest', () => {
  const base = {
    limitBlockA: 10000,
    rateA: 16,
    rateB: 7.25,
    days: 30,
  }

  const TOLERANCE = 0.061

  it('matches expected gains for integer totals', () => {
    const cases: Array<[string, string, string, string]> = [
      ['15,000', '132.35', '29.88', '162.23'],
      ['25,000', '132.35', '89.64', '221.99'],
      ['50,000', '132.35', '239.05', '371.40'],
    ]

    for (const [total, gainA, gainB, gainTotal] of cases) {
      const res = calculateSofipoCompoundInterest({
        ...base,
        totalInvestment: parseMoney(total),
      })

      expect(Math.abs(res.gainA - parseMoney(gainA))).toBeLessThanOrEqual(TOLERANCE)
      expect(Math.abs(res.gainB - parseMoney(gainB))).toBeLessThanOrEqual(TOLERANCE)
      expect(Math.abs(res.gainTotal - parseMoney(gainTotal))).toBeLessThanOrEqual(TOLERANCE)
    }
  })

  it('matches expected gains for decimal totals', () => {
    const cases: Array<[string, string, string, string]> = [
      ['12,500.50', '132.35', '14.93', '147.28'],
      ['18,750.75', '132.35', '52.26', '184.61'],
      ['33,333.33', '132.35', '139.38', '271.73'],
    ]

    for (const [total, gainA, gainB, gainTotal] of cases) {
      const res = calculateSofipoCompoundInterest({
        ...base,
        totalInvestment: parseMoney(total),
      })

      expect(Math.abs(res.gainA - parseMoney(gainA))).toBeLessThanOrEqual(TOLERANCE)
      expect(Math.abs(res.gainB - parseMoney(gainB))).toBeLessThanOrEqual(TOLERANCE)
      expect(Math.abs(res.gainTotal - parseMoney(gainTotal))).toBeLessThanOrEqual(TOLERANCE)
    }
  })
})
