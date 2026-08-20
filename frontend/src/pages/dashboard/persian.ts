const TEXT_MAP: Record<string, string> = {
  'Customer requires management attention based on the existing rule-based score.':
    'وضعیت فعلی مشتری نیازمند توجه و پیگیری مدیریتی است.',
  'Review the customer with the sales manager.':
    'بررسی وضعیت مشتری با مدیر فروش.',
  'Review customer issues with the quality team.':
    'بررسی مسائل مشتری با تیم کیفیت و هماهنگی اقدام اصلاحی.',
  'Review payment status before the next order.':
    'بررسی وضعیت پرداخت پیش از ثبت سفارش بعدی.',
  'Schedule a sales follow-up.':
    'برنامه‌ریزی پیگیری فروش با مشتری.',
  'Check the next-order plan with the customer.':
    'بررسی برنامه سفارش بعدی با مشتری.',
  'Collections behavior presents a material financial risk.':
    'وضعیت وصول مطالبات، ریسک مالی قابل‌توجهی ایجاد کرده است.',
  'Collections behavior should be monitored.':
    'وضعیت وصول مطالبات این مشتری باید پایش شود.',
  'Complaint history should be considered in the next customer conversation.':
    'سوابق شکایت باید در گفت‌وگوی بعدی با مشتری بررسی شود.',
  'Customer complaint history is available and should be reviewed before outreach.':
    'سوابق شکایت مشتری موجود است و پیش از تماس باید بررسی شود.',
  'Repeated recent complaints indicate customer service or quality risk.':
    'تکرار شکایت‌های اخیر، نشانه ریسک در خدمات مشتری یا کیفیت است.',
  'The customer has had a prolonged period without an order in the analytics snapshot.':
    'در داده‌های تحلیلی، مشتری برای مدت طولانی سفارشی ثبت نکرده است.',
  'The expected next order was overdue in the analytics snapshot.':
    'در داده‌های تحلیلی، زمان مورد انتظار ثبت سفارش بعدی گذشته است.',
  'Purchase activity is becoming stale relative to the analytics snapshot.':
    'فعالیت خرید مشتری نسبت به دوره‌های گذشته کاهش یافته است.',
  'The latest recorded CRM interaction identifies a pending customer follow-up.':
    'یک پیگیری ثبت‌شده با مشتری هنوز نیازمند اقدام است.',
  'All findings are derived from the historical analytics snapshot and explicit rules.':
    'این جمع‌بندی بر پایه آخرین تصویر داده‌های مشتریان تهیه شده است.',
  'High existing risk combined with customer value requires a retention decision.':
    'ریسک بالای موجود در کنار ارزش کسب‌وکار، نیاز به تصمیم برای حفظ مشتری را نشان می‌دهد.',
  'An active customer with acceptable risk has observable potential for account growth.':
    'این مشتری فعال با سطح ریسک قابل‌قبول، ظرفیت قابل مشاهده‌ای برای توسعه حساب دارد.',
  'A healthy, high-potential customer has an important or urgent CRM follow-up for near-term sales action.':
    'این مشتری پربازده، پیگیری مهم یا فوری برای اقدام فروش کوتاه‌مدت دارد.',
  'Current wallet share is low relative to estimated customer purchasing potential.':
    'سهم فعلی از خرید مشتری نسبت به ظرفیت برآوردشده پایین است.',
  'There may be room to grow wallet share.':
    'ظرفیت افزایش سهم از خرید مشتری وجود دارد.',
  'The customer has at least median portfolio sales value.':
    'ارزش فروش مشتری دست‌کم در سطح میانه سبد مشتریان است.',
  'The customer contributes at least median lifetime margin.':
    'حاشیه سود عمر مشتری دست‌کم در سطح میانه سبد است.',
  'The customer has at least median lifetime value.':
    'ارزش طول عمر مشتری دست‌کم در سطح میانه سبد است.',
  'The customer has an established ordering pattern.':
    'مشتری الگوی سفارش‌دهی تثبیت‌شده‌ای دارد.',
  'The relationship has a demonstrated commercial base for expansion.':
    'رابطه با مشتری پایه تجاری اثبات‌شده‌ای برای توسعه دارد.',
  'The customer has purchased relatively recently in the analytics snapshot.':
    'مشتری در داده‌های تحلیلی، خرید نسبتاً تازه‌ای داشته است.',
}

const RISK_LEVELS: Record<string, string> = {
  Critical: 'بحرانی',
  High: 'بالا',
  Medium: 'متوسط',
  Low: 'پایین',
  'Not Yet Active': 'هنوز فعال نشده',
}

const STATUS_LABELS: Record<string, string> = {
  risk: 'ریسک',
  opportunity: 'فرصت',
  attention: 'نیازمند پیگیری',
}

export function toPersianDashboardText(value: string): string {
  if (TEXT_MAP[value]) return TEXT_MAP[value]

  const headline = value.match(/^(\d+) customers require risk attention and (\d+) active, non-high-risk customers qualify as rule-based growth opportunities\.$/)
  if (headline) {
    return `${headline[1]} مشتری نیازمند رسیدگی هستند و ${headline[2]} مشتری فعال، ظرفیت رشد قابل توجهی دارند.`
  }

  const revenueAtRisk = value.match(/^Revenue at risk is (.+), calculated from annual sales for High and Critical risk customers\.$/)
  if (revenueAtRisk) {
    return `درآمد در معرض ریسک ${revenueAtRisk[1]} است که از فروش سالانه مشتریان با ریسک بالا و بحرانی محاسبه شده است.`
  }

  const categoryFocus = value.match(/^(customer_recovery|growth_opportunity|sales_opportunity) — ([^:]+): (.+)$/)
  if (categoryFocus) {
    const labels: Record<string, string> = {
      customer_recovery: 'بازیابی مشتری',
      growth_opportunity: 'فرصت رشد',
      sales_opportunity: 'فرصت فروش',
    }
    return `${labels[categoryFocus[1]]}: ${categoryFocus[2]}: ${toPersianDashboardText(categoryFocus[3])}`
  }

  const focus = value.match(/^([^:]+): Review the customer with the sales manager\.$/)
  if (focus) return `${focus[1]}: بررسی وضعیت مشتری با مدیر فروش.`

  const existingRisk = value.match(/^Existing risk level: (.+)$/)
  if (existingRisk) return `سطح ریسک فعلی: ${toPersianRiskLevel(existingRisk[1])}`

  const opportunityScore = value.match(/^Opportunity score: (.+)$/)
  if (opportunityScore) return `ظرفیت رشد: ${opportunityScore[1]}`

  const annualSales = value.match(/^Annual sales value: (.+)$/)
  if (annualSales) return `ارزش فروش سالانه: ${annualSales[1]}`

  const nextAction = value.match(/^CRM next action: (.+)$/)
  if (nextAction) return `پیگیری ثبت‌شده: ${nextAction[1]}`

  const urgency = value.match(/^CRM urgency: (.+)$/)
  if (urgency) return `فوریت پیگیری: ${urgency[1]}`

  return value
}

export function toPersianStatus(status: string): string {
  return STATUS_LABELS[status] ?? status
}

export function toPersianRiskLevel(riskLevel: string | null): string {
  return riskLevel ? (RISK_LEVELS[riskLevel] ?? riskLevel) : '—'
}
