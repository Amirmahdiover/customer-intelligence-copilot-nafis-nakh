const MONTHS_FA = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
]

export function formatCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  }
  if (value >= 1_000_000) {
    return `${Math.round(value / 1_000_000)}M`
  }
  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}K`
  }
  return value.toLocaleString('fa-IR')
}

export function formatNumber(value: number): string {
  return value.toLocaleString('fa-IR')
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date('2026-08-19')
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'امروز'
  if (diffDays === 1) return 'دیروز'
  if (diffDays < 30) return `${diffDays} روز پیش`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} ماه پیش`
  return `${Math.floor(diffDays / 365)} سال پیش`
}

export function daysSince(dateStr: string): number {
  const date = new Date(dateStr)
  const now = new Date('2026-08-19')
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getDate()
  const month = MONTHS_FA[date.getMonth()]
  return `${day} ${month}`
}

export function getInitials(name: string): string {
  const words = name.replace('شرکت ', '').split(' ')
  if (words.length >= 2) {
    return words[0].charAt(0) + words[1].charAt(0)
  }
  return name.charAt(0)
}

export function simulateDelay(min = 300, max = 600): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise((resolve) => setTimeout(resolve, ms))
}
