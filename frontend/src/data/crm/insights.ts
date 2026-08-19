import type { Insight } from '@/types/crm'

export const mockInsights: Insight[] = [
  {
    id: 'ins-001',
    customerId: 'c-1045',
    title: 'کاهش فرکانس خرید',
    message:
      'خرید مشتری نسبت به الگوی معمول کاهش پیدا کرده است. مشتری معمولاً هر ۳۰ روز سفارش می‌دهد، اما اکنون ۴۲ روز از آخرین سفارش گذشته است.',
    severity: 'warning',
  },
  {
    id: 'ins-002',
    customerId: 'c-1045',
    title: 'شکایت باز',
    message:
      'مشتری یک شکایت باز درباره کیفیت دارد که هنوز حل نشده است. این می‌تواند بر رضایت و سفارشات بعدی تأثیر بگذارد.',
    severity: 'critical',
  },
  {
    id: 'ins-003',
    customerId: 'c-1045',
    title: 'تأخیر سفارش فعلی',
    message:
      'سفارش فعلی ORD-2048 با ۳ روز تأخیر در مرحله تولید است. مشتری VIP نیازمند پیگیری فوری.',
    severity: 'warning',
    isGlobal: true,
  },
  {
    id: 'ins-004',
    customerId: 'c-1002',
    title: 'درآمد بالا، سود پایین',
    message:
      'درآمد مشتری بسیار بالاست اما حاشیه سود تنها ۸٪ است. تخفیف‌های بالا احتمالاً علت اصلی است.',
    severity: 'warning',
    isGlobal: true,
  },
  {
    id: 'ins-005',
    customerId: 'c-1003',
    title: 'ریسک ریزش مشتری',
    message:
      'مشتری ۶۰ روز است سفارش نداده (معمول: ۳۰ روز). دو شکایت در ۳ ماه اخیر. احتمال ریزش بالا.',
    severity: 'critical',
    isGlobal: true,
  },
  {
    id: 'ins-006',
    customerId: 'c-1004',
    title: 'تأخیر سفارش VIP',
    message:
      'سفارش VIP مشتری با ارزش بالا ۴ روز تأخیر دارد. تماس با تولید توصیه می‌شود.',
    severity: 'warning',
    isGlobal: true,
  },
  {
    id: 'ins-007',
    customerId: 'c-1009',
    title: 'بدهی معوق',
    message:
      'مشتری ۱۲۰ میلیون تومان بدهی معوق با ۲۵ روز تأخیر دارد. پیگیری پرداخت فوری لازم است.',
    severity: 'critical',
    isGlobal: true,
  },
  {
    id: 'ins-008',
    customerId: 'c-1015',
    title: 'ریسک مالی و تجاری',
    message:
      'مشتری ۷۰ روز بدون سفارش، ۱۶۰ میلیون بدهی معوق و روند نزولی درآمد دارد.',
    severity: 'critical',
    isGlobal: true,
  },
  {
    id: 'ins-009',
    customerId: 'c-1007',
    title: 'کاهش حجم سفارش',
    message:
      'حجم سفارشات مشتری در ۳ ماه اخیر ۳۵٪ کاهش یافته است.',
    severity: 'warning',
  },
  {
    id: 'ins-010',
    customerId: 'c-1011',
    title: 'فاصله سفارش بیش از حد',
    message:
      '۳۰ روز از آخرین سفارش گذشته (معمول: ۲۸ روز). پیگیری پیشگیرانه توصیه می‌شود.',
    severity: 'info',
  },
  {
    id: 'ins-011',
    customerId: 'c-1013',
    title: 'حاشیه سود پایین',
    message:
      'با وجود درآمد ۶۷۰ میلیون، سود فقط ۸۰ میلیون (۱۲٪) است.',
    severity: 'info',
  },
  {
    id: 'ins-012',
    customerId: 'c-1001',
    title: 'مشتری وفادار',
    message:
      'مشتری ۲۲ سفارش با پرداخت به‌موقع. فرصت Upsell وجود دارد.',
    severity: 'info',
  },
]
