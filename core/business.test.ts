import { computeBlockKey, calcTotals, computeDeposit, validateRules } from './business'
import { calculateQuote, PAYMENT_DEADLINE_DAYS, isPaymentExpired, canCancel } from './menus'

describe('business logic', () => {
  test('computeBlockKey', () => {
    const date = new Date('2026-02-13T10:30:00Z')
    expect(computeBlockKey(date)).toBe('2026-02-13_10:00')
  })

  test('calcTotals infantil', () => {
    expect(calcTotals('infantil1', 10, 5, '')).toBe(14.5 * 10 + 5 * 3)
  })

  test('calcTotals with drink tickets', () => {
    expect(calcTotals('grupo29', 4, 10, '')).toBe(29 * 4 + 10 * 3)
  })

  test('calcTotals with extra hours', () => {
    expect(calcTotals('grupo34', 10, 0, '02:00')).toBe(34 * 10 + 100)
    expect(calcTotals('grupo34', 10, 0, '03:00')).toBe(34 * 10 + 300)
  })

  test('computeDeposit', () => {
    expect(computeDeposit(100)).toBe(40)
    expect(computeDeposit(1000)).toBe(400)
    expect(computeDeposit(0)).toBe(0)
  })
})

describe('validateRules', () => {
  test('infantil allowed at 18:00', () => {
    const result = validateRules({
      event_type: 'infantil',
      start_datetime: new Date('2026-06-15T16:00:00Z'), // 17:00 Madrid winter = 18:00 summer
      guests_estimated: 10,
      total_amount: 200,
    })
    expect(result.valid).toBe(true)
  })

  test('infantil blocked after 20:30', () => {
    const result = validateRules({
      event_type: 'infantil',
      start_datetime: new Date('2026-06-15T20:00:00Z'), // 21:00 Madrid
      guests_estimated: 10,
      total_amount: 200,
    })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('20:30')
  })

  test('nocturna blocked before 21:30', () => {
    const result = validateRules({
      event_type: 'nocturna',
      start_datetime: new Date('2026-06-15T18:00:00Z'), // 19:00 Madrid
      guests_estimated: 30,
      total_amount: 1200,
    })
    expect(result.valid).toBe(false)
    expect(result.errors[0]).toContain('21:30')
  })

  test('nocturna requires min 1000€', () => {
    const result = validateRules({
      event_type: 'nocturna',
      start_datetime: new Date('2026-06-15T21:00:00Z'), // 22:00 Madrid
      guests_estimated: 10,
      total_amount: 500,
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Nocturna requiere mínimo 1000€')
  })

  test('nocturna valid with 1000€+', () => {
    const result = validateRules({
      event_type: 'nocturna',
      start_datetime: new Date('2026-01-15T21:00:00'), // local 21:00 + 1h approx = 22:00
      guests_estimated: 30,
      total_amount: 1020,
    })
    expect(result.valid).toBe(true)
  })

  test('guests must be > 0', () => {
    const result = validateRules({
      event_type: 'grupo',
      start_datetime: new Date('2026-06-15T12:00:00Z'),
      guests_estimated: 0,
      total_amount: 500,
    })
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Debe haber al menos 1 invitado')
  })
})

describe('calculateQuote', () => {
  test('basic menu quote', () => {
    const result = calculateQuote('menu_grupo_29', 10)
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.total).toBe(290)
      expect(result.deposit).toBe(116)
      expect(result.drink_tickets).toBe(0)
    }
  })

  test('quote with drink tickets', () => {
    const result = calculateQuote('menu_grupo_29', 10, undefined, 5)
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.subtotal_drink_tickets).toBe(15)
      expect(result.total).toBe(305) // 290 + 15
      expect(result.deposit).toBe(122) // 305 * 0.4 = 122
    }
  })

  test('quote with extras horarios', () => {
    const result = calculateQuote('menu_grupo_34', 10, ['01:00-02:00'])
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.subtotal_extras).toBe(100)
      expect(result.total).toBe(440) // 340 + 100
    }
  })

  test('invalid menu returns error', () => {
    const result = calculateQuote('menu_inexistente', 10)
    expect('error' in result).toBe(true)
  })

  test('infantil menu quote', () => {
    const result = calculateQuote('menu_infantil', 15)
    expect('error' in result).toBe(false)
    if (!('error' in result)) {
      expect(result.total).toBe(217.5) // 14.50 * 15
      expect(result.deposit).toBe(87)   // 217.5 * 0.4 = 87
    }
  })
})

describe('PAYMENT_DEADLINE_DAYS', () => {
  test('is 5 days (120h)', () => {
    expect(PAYMENT_DEADLINE_DAYS).toBe(5)
  })
})

describe('isPaymentExpired', () => {
  test('not expired within 5 days', () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
    expect(isPaymentExpired(twoDaysAgo)).toBe(false)
  })

  test('expired after 5 days', () => {
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString()
    expect(isPaymentExpired(sixDaysAgo)).toBe(true)
  })
})

describe('canCancel', () => {
  test('can cancel if more than 72h before event', () => {
    const futureDate = new Date()
    futureDate.setDate(futureDate.getDate() + 5)
    const fecha = futureDate.toISOString().split('T')[0]
    expect(canCancel(fecha, '14:00').ok).toBe(true)
  })

  test('cannot cancel if less than 72h before event', () => {
    const soonDate = new Date()
    soonDate.setDate(soonDate.getDate() + 1)
    const fecha = soonDate.toISOString().split('T')[0]
    expect(canCancel(fecha, '14:00').ok).toBe(false)
  })
})