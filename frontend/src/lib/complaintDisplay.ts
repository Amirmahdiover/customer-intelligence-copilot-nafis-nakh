export const COMPLAINT_COLUMN_LABELS = {
  Product_id: 'شناسه محصول',
  complaint_text: 'متن شکایت',
  severity: 'شدت شکایت',
  created_at: 'تاریخ ثبت',
  complaint_status: 'وضعیت شکایت',
  text_resolution: 'نتیجه رسیدگی',
} as const

const SEVERITY_LABELS: Record<string, string> = {
  کم: 'کم',
  متوسط: 'متوسط',
  زیاد: 'زیاد',
  بحرانی: 'بحرانی',
  Low: 'کم',
  Medium: 'متوسط',
  High: 'زیاد',
  Critical: 'بحرانی',
}

const STATUS_LABELS: Record<string, string> = {
  'پذیرفته‌شده': 'پذیرفته‌شده',
  'پذیرفته\u200cشده': 'پذیرفته‌شده',
  ردشده: 'ردشده',
  'نیازمند بررسی': 'نیازمند بررسی',
  'درحال بررسی': 'در حال بررسی',
  'بسته‌شده': 'بسته‌شده',
  'بسته\u200cشده': 'بسته‌شده',
  Open: 'باز',
  'In Progress': 'در حال بررسی',
  Resolved: 'حل‌شده',
  Closed: 'بسته‌شده',
}

export function formatComplaintSeverity(value: string): string {
  const trimmed = value.trim()
  return SEVERITY_LABELS[trimmed] ?? (trimmed || '—')
}

export function formatComplaintStatus(value: string): string {
  const trimmed = value.trim()
  return STATUS_LABELS[trimmed] ?? (trimmed || '—')
}
