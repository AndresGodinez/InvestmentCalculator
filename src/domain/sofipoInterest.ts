export type SofipoCompoundInput = {
  totalInvestment: number
  limitBlockA: number
  rateA: number
  rateB: number
  days: number
}

export type SofipoCompoundOutput = {
  principalA: number
  principalB: number
  gainA: number
  gainB: number
  gainTotal: number
  endA: number
  endB: number
  endTotal: number
}

function roundMoney(value: number): number {
  return Math.round((value + 1e-9) * 100) / 100
}

function compoundEndAmount(principal: number, annualRatePercent: number, days: number): number {
  const n = 365
  const r = annualRatePercent / 100

  if (days < 0) throw new Error('days must be >= 0')
  if (principal < 0) throw new Error('principal must be >= 0')

  // A = P(1 + r/n)^(nt) ; with t = days/n => exponent = n * (days/n) = days
  // Use exp(log1p) for better floating point stability.
  return principal * Math.exp(days * Math.log1p(r / n))
}

export function calculateSofipoCompoundInterest(input: SofipoCompoundInput): SofipoCompoundOutput {
  const totalInvestment = Number.isFinite(input.totalInvestment) ? input.totalInvestment : 0
  const limitBlockA = Number.isFinite(input.limitBlockA) ? input.limitBlockA : 0

  const principalA = Math.min(totalInvestment, limitBlockA)
  const principalB = Math.max(0, totalInvestment - limitBlockA)

  const endA = compoundEndAmount(principalA, input.rateA, input.days)
  const endB = compoundEndAmount(principalB, input.rateB, input.days)

  const gainA = endA - principalA
  const gainB = endB - principalB

  const endTotal = endA + endB
  const gainTotal = gainA + gainB

  return {
    principalA: roundMoney(principalA),
    principalB: roundMoney(principalB),
    gainA: roundMoney(gainA),
    gainB: roundMoney(gainB),
    gainTotal: roundMoney(gainTotal),
    endA: roundMoney(endA),
    endB: roundMoney(endB),
    endTotal: roundMoney(endTotal),
  }
}
