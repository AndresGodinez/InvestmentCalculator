export type DayCountBasis = 360

export interface CompoundInterestInput {
  principal?: number
  annualRate: number
  days: number
  dayCountBasis?: DayCountBasis
}

export interface ProjectionPoint {
  day: number
  balance: number
  interestEarned: number
}

export function dailyGrowthFactor(annualRate: number, dayCountBasis: DayCountBasis = 360): number {
  return Math.pow(1 + annualRate, 1 / dayCountBasis)
}

export function projectCompoundInterest(input: CompoundInterestInput): ProjectionPoint[] {
  const principal = input.principal ?? 0
  const dayCountBasis = input.dayCountBasis ?? 360

  if (input.days < 0) {
    throw new Error('days must be >= 0')
  }

  if (principal < 0) {
    throw new Error('principal must be >= 0')
  }

  const factor = dailyGrowthFactor(input.annualRate, dayCountBasis)

  const points: ProjectionPoint[] = []
  let balance = principal

  for (let day = 0; day <= input.days; day++) {
    if (day > 0) {
      balance *= factor
    }

    points.push({
      day,
      balance,
      interestEarned: balance - principal,
    })
  }

  return points
}
