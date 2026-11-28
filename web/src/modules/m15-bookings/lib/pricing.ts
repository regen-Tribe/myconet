/**
 * What a stay costs: each place's rates (`booking_items.stay_prices`) and the community's rules on top
 * (instance config "stays" → NEXT_PUBLIC_STAY_RULES). The total is always an estimate: whoever approves
 * the stay confirms it. All the arithmetic is in `estimateStay`, so a community that charges differently
 * changes one function and its config, not the screens.
 */

export interface StayRates { night?: number; week?: number; month?: number }
/** `two`: the rates when two people share the place. */
export interface StayPrices extends StayRates { two?: StayRates }

export interface StayRules {
  /** ISO code, e.g. "USD" */
  currency: string
  /** Tax added on top of every price, in percent; 0 = prices are final */
  vatPercent: number
  /** Percent off the whole stay from this many whole months, e.g. [{ months: 2, percent: 10 }] */
  longStay: { months: number; percent: number }[]
  /** Plain lines shown under the prices: deposit, other discounts, what's included */
  notes: string[]
}

const DEFAULT_RULES: StayRules = { currency: 'USD', vatPercent: 0, longStay: [], notes: [] }

function readRules(): StayRules {
  try {
    const raw = JSON.parse(process.env.NEXT_PUBLIC_STAY_RULES || '{}') as Partial<StayRules>
    return {
      currency: typeof raw.currency === 'string' && raw.currency ? raw.currency : DEFAULT_RULES.currency,
      vatPercent: Number(raw.vatPercent) > 0 ? Number(raw.vatPercent) : 0,
      longStay: Array.isArray(raw.longStay)
        ? raw.longStay.filter(t => Number(t?.months) > 0 && Number(t?.percent) > 0).map(t => ({ months: Number(t.months), percent: Number(t.percent) }))
        : [],
      notes: Array.isArray(raw.notes) ? raw.notes.filter((n): n is string => typeof n === 'string' && !!n.trim()) : [],
    }
  } catch {
    return DEFAULT_RULES
  }
}

export const STAY_RULES: StayRules = readRules()

const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : undefined)
const rates = (v: unknown): StayRates => {
  const o = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>
  return { night: num(o.night), week: num(o.week), month: num(o.month) }
}
const hasAny = (r: StayRates | undefined) => !!r && (r.night !== undefined || r.week !== undefined || r.month !== undefined)

/** The column as stored → prices, or null when nothing usable is set. */
export function toStayPrices(v: unknown): StayPrices | null {
  if (!v || typeof v !== 'object') return null
  const one = rates(v)
  const two = rates((v as { two?: unknown }).two)
  if (!hasAny(one) && !hasAny(two)) return null
  return { ...one, ...(hasAny(two) ? { two } : {}) }
}

/** The rates that apply to this many people: the "for two" set when it exists and two or more stay. */
export function ratesFor(prices: StayPrices | null | undefined, guests: number): StayRates | null {
  if (!prices) return null
  if (guests >= 2 && hasAny(prices.two)) return prices.two!
  return hasAny(prices) ? { night: prices.night, week: prices.week, month: prices.month } : null
}

export function fmtMoney(amount: number, currency = STAY_RULES.currency): string {
  const whole = Math.abs(amount - Math.round(amount)) < 0.005
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: whole ? 0 : 2 }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(whole ? 0 : 2)}`
  }
}

/** "from $50 a night" for a card: the shortest rate the place has. */
export function fromPrice(prices: StayPrices | null | undefined): string | null {
  if (!prices) return null
  if (prices.night !== undefined) return `${fmtMoney(prices.night)} a night`
  if (prices.week !== undefined) return `${fmtMoney(prices.week)} a week`
  if (prices.month !== undefined) return `${fmtMoney(prices.month)} a month`
  return null
}

function addMonths(d: Date, n: number): Date {
  const first = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const last = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate()
  first.setDate(Math.min(d.getDate(), last))
  return first
}
/** Whole calendar days between two local dates (a clock change can't make it 0.96 of a day). */
export function nightsBetween(a: Date, b: Date): number {
  return Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 86400000)
}

export interface StayEstimate {
  nights: number
  lines: { label: string; amount: number }[]
  subtotal: number
  discount: { percent: number; amount: number; months: number } | null
  vat: { percent: number; amount: number } | null
  total: number
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/**
 * Whole months at the monthly rate, then whole weeks at the weekly rate, then single nights.
 * A few nights never cost more than the week they'd fill, nor the rest of a stay more than a month.
 * The long-stay discount counts whole months and comes off everything; tax goes on last.
 */
export function estimateStay(r: StayRates | null, checkIn: Date, checkOut: Date, rules: StayRules = STAY_RULES): StayEstimate | null {
  if (!r) return null
  const nights = nightsBetween(checkIn, checkOut)
  if (nights < 1) return null
  // A place with only one kind of rate is charged in that unit, pro rata
  const night = r.night ?? (r.week !== undefined ? r.week / 7 : r.month !== undefined ? r.month / 30 : undefined)
  if (night === undefined) return null

  let months = 0
  if (r.month !== undefined) while (addMonths(checkIn, months + 1) <= checkOut) months++
  const rest = nightsBetween(addMonths(checkIn, months), checkOut)
  const weeks = r.week !== undefined ? Math.floor(rest / 7) : 0
  const days = rest - weeks * 7

  const lines: StayEstimate['lines'] = []
  if (months) lines.push({ label: `${plural(months, 'month')} × ${fmtMoney(r.month!, rules.currency)}`, amount: months * r.month! })
  const weeksCost = weeks * (r.week ?? 0)
  const daysCost = r.week !== undefined ? Math.min(days * night, r.week) : days * night
  if (r.month !== undefined && rest > 0 && weeksCost + daysCost >= r.month) {
    lines.push({ label: `${plural(rest, months ? 'more night' : 'night')}, at the monthly rate`, amount: r.month })
  } else {
    if (weeks) lines.push({ label: `${plural(weeks, 'week')} × ${fmtMoney(r.week!, rules.currency)}`, amount: weeksCost })
    if (days) {
      lines.push(r.week !== undefined && days * night >= r.week
        ? { label: `${plural(days, 'night')}, at the weekly rate`, amount: r.week }
        : { label: `${plural(days, 'night')} × ${fmtMoney(night, rules.currency)}`, amount: days * night })
    }
  }
  const subtotal = lines.reduce((s, l) => s + l.amount, 0)

  const tier = rules.longStay.filter(t => months >= t.months).sort((a, b) => b.percent - a.percent)[0]
  const discount = tier ? { percent: tier.percent, months: tier.months, amount: subtotal * tier.percent / 100 } : null
  const afterDiscount = subtotal - (discount?.amount ?? 0)
  const vat = rules.vatPercent > 0 ? { percent: rules.vatPercent, amount: afterDiscount * rules.vatPercent / 100 } : null
  return { nights, lines, subtotal, discount, vat, total: afterDiscount + (vat?.amount ?? 0) }
}
