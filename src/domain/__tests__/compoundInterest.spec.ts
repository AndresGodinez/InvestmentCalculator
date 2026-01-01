import { describe, expect, it } from 'vitest'

import { dailyGrowthFactor, projectCompoundInterest } from '../compoundInterest'

describe('compoundInterest', () => {
  it('dailyGrowthFactor matches annual rate over 360 days (approximately)', () => {
    const annualRate = 0.15

    const factor = dailyGrowthFactor(annualRate, 360)
    const compounded = Math.pow(factor, 360)

    expect(compounded).toBeCloseTo(1 + annualRate, 10)
  })

  it('projects series from day 0..N inclusive', () => {
    const points = projectCompoundInterest({
      principal: 1000,
      annualRate: 0.15,
      days: 2,
      dayCountBasis: 360,
    })

    expect(points.map((p) => p.day)).toEqual([0, 1, 2])
  })

  it('day 0 is the principal and interestEarned is 0', () => {
    const [p0] = projectCompoundInterest({
      principal: 1000,
      annualRate: 0.15,
      days: 0,
      dayCountBasis: 360,
    })

    expect(p0!.balance).toBeCloseTo(1000, 12)
    expect(p0!.interestEarned).toBeCloseTo(0, 12)
  })

  it('balances are monotonic increasing for positive rate', () => {
    const points = projectCompoundInterest({
      principal: 20000,
      annualRate: 0.15,
      days: 30,
      dayCountBasis: 360,
    })

    for (let i = 1; i < points.length; i++) {
      expect(points[i]!.balance).toBeGreaterThan(points[i - 1]!.balance)
    }
  })

  it('throws on negative days', () => {
    expect(() =>
      projectCompoundInterest({
        principal: 100,
        annualRate: 0.15,
        days: -1,
        dayCountBasis: 360,
      }),
    ).toThrow(/days must be >= 0/i)
  })

  it('allows missing principal (defaults to 0)', () => {
    const points = projectCompoundInterest({
      annualRate: 0.15,
      days: 10,
      dayCountBasis: 360,
    })

    expect(points[0]!.balance).toBe(0)
    expect(points[10]!.balance).toBe(0)
  })
})
