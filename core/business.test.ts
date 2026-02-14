import { computeBlockKey, calcTotals, computeDeposit } from './business'

describe('business logic', () => {
  test('computeBlockKey', () => {
    const date = new Date('2026-02-13T10:30:00Z')
    expect(computeBlockKey(date)).toBe('2026-02-13_10:00')
  })

  test('calcTotals infantil', () => {
    expect(calcTotals('infantil1', 10, 5, '')).toBe(14.5 * 10 + 5 * 3)
  })

  test('computeDeposit', () => {
    expect(computeDeposit(100)).toBe(40)
  })
})