import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle2, ClipboardList, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useComplaints } from '@/hooks/crm/useCrmQueries'
import { formatComplaintSeverity, formatComplaintStatus } from '@/lib/complaintDisplay'
import { formatNumber } from '@/lib/formatters'
import type { Complaint } from '@/types/crm'

const OPEN_STATUSES = new Set(['نیازمند بررسی', 'درحال بررسی', 'در حال بررسی', 'Open', 'In Progress'])

function isOpen(complaint: Complaint) {
  return OPEN_STATUSES.has(complaint.complaint_status.trim())
}

function severityClass(severity: string) {
  if (severity === 'بحرانی' || severity === 'Critical') return 'border-red-200 bg-red-50 text-red-700'
  if (severity === 'زیاد' || severity === 'High') return 'border-orange-200 bg-orange-50 text-orange-700'
  if (severity === 'متوسط' || severity === 'Medium') return 'border-amber-200 bg-amber-50 text-amber-700'
  return 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

function statusClass(complaint: Complaint) {
  return isOpen(complaint)
    ? 'border-amber-200 bg-amber-50 text-amber-700'
    : 'border-emerald-200 bg-emerald-50 text-emerald-700'
}

function StatCard({ label, value, icon: Icon, tone }: { label: string; value: number; icon: typeof ClipboardList; tone: string }) {
  return (
    <Card className="gap-2 p-4">
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs">{label}</span>
        <span className={`flex size-8 items-center justify-center rounded-md ${tone}`}><Icon size={17} /></span>
      </div>
      <strong className="text-2xl font-bold tracking-tight">{formatNumber(value)}</strong>
    </Card>
  )
}

export function ComplaintsPage() {
  const { data: complaints = [], isLoading, isError, refetch } = useComplaints()
  const [search, setSearch] = useState('')
  const [severity, setSeverity] = useState('all')
  const [status, setStatus] = useState('all')

  const filteredComplaints = useMemo(() => {
    const query = search.trim().toLowerCase()
    return [...complaints]
      .filter((complaint) => severity === 'all' || complaint.severity === severity)
      .filter((complaint) => status === 'all' || (status === 'open' ? isOpen(complaint) : !isOpen(complaint)))
      .filter((complaint) => !query || [complaint.customerId, complaint.Product_id, complaint.complaint_text].some((value) => value.toLowerCase().includes(query)))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
  }, [complaints, search, severity, status])

  const openCount = complaints.filter(isOpen).length
  const criticalCount = complaints.filter((complaint) => complaint.severity === 'بحرانی' || complaint.severity === 'Critical').length
  const resolvedCount = complaints.length - openCount

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 pt-14 lg:px-8 lg:pt-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-wide text-primary">مرکز پیگیری تجربه مشتری</p>
          <h1 className="text-[1.5rem] font-bold text-card-foreground">شکایت‌ها</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">دید یکپارچه برای اولویت‌بندی، رسیدگی و بستن شکایت‌های مشتریان</p>
        </div>
        <div className="rounded-md border bg-card px-3 py-2 text-left text-xs text-muted-foreground">مبنای داده: snapshot 2022-06-30</div>
      </header>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="کل شکایت‌ها" value={complaints.length} icon={ClipboardList} tone="bg-sky-50 text-sky-700" />
        <StatCard label="در انتظار رسیدگی" value={openCount} icon={AlertCircle} tone="bg-amber-50 text-amber-700" />
        <StatCard label="حل‌شده یا بسته" value={resolvedCount} icon={CheckCircle2} tone="bg-emerald-50 text-emerald-700" />
        <StatCard label="موارد بحرانی" value={criticalCount} icon={AlertCircle} tone="bg-red-50 text-red-700" />
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-[0.95rem]">فهرست شکایت‌ها</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">{formatNumber(filteredComplaints.length)} مورد مطابق فیلتر فعلی</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { setSearch(''); setSeverity('all'); setStatus('all') }}>پاک‌کردن فیلترها</Button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="mb-4 grid gap-2 md:grid-cols-[minmax(0,1fr)_11rem_11rem]">
            <div className="relative">
              <Search className="absolute right-2.5 top-2 text-muted-foreground" size={16} />
              <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جستجو در مشتری، محصول یا متن شکایت" className="h-9 pr-9" />
            </div>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="h-9 w-full"><SelectValue placeholder="شدت" /></SelectTrigger>
              <SelectContent><SelectItem value="all">همه شدت‌ها</SelectItem><SelectItem value="بحرانی">بحرانی</SelectItem><SelectItem value="زیاد">زیاد</SelectItem><SelectItem value="متوسط">متوسط</SelectItem><SelectItem value="کم">کم</SelectItem></SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-full"><SelectValue placeholder="وضعیت" /></SelectTrigger>
              <SelectContent><SelectItem value="all">همه وضعیت‌ها</SelectItem><SelectItem value="open">باز و در حال بررسی</SelectItem><SelectItem value="resolved">حل‌شده یا بسته</SelectItem></SelectContent>
            </Select>
          </div>

          {isLoading && <p className="py-12 text-center text-sm text-muted-foreground">در حال دریافت فهرست شکایت‌ها...</p>}
          {isError && <div className="py-10 text-center"><p className="mb-3 text-sm text-destructive">دریافت اطلاعات شکایت‌ها ناموفق بود.</p><Button size="sm" onClick={() => refetch()}>تلاش دوباره</Button></div>}
          {!isLoading && !isError && filteredComplaints.length === 0 && <p className="py-12 text-center text-sm text-muted-foreground">موردی با این فیلتر پیدا نشد.</p>}
          {!isLoading && !isError && filteredComplaints.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-right text-sm">
                <thead><tr className="border-b text-xs text-muted-foreground"><th className="pb-3 pr-2 font-medium">مشتری</th><th className="pb-3 font-medium">شرح شکایت</th><th className="pb-3 font-medium">شدت</th><th className="pb-3 font-medium">وضعیت</th><th className="pb-3 font-medium">تاریخ ثبت</th><th className="pb-3 font-medium">رسیدگی</th></tr></thead>
                <tbody>
                  {filteredComplaints.map((complaint) => (
                    <tr key={complaint.id} className="border-b last:border-0 hover:bg-muted/35">
                      <td className="py-3 pr-2 align-top"><Link to={`/crm/customers/${complaint.customerId}`} className="font-semibold text-primary hover:underline">{complaint.customerId}</Link><div className="mt-1 text-xs text-muted-foreground">{complaint.Product_id}</div></td>
                      <td className="max-w-[22rem] py-3 align-top"><p className="line-clamp-2 leading-6">{complaint.complaint_text || 'بدون توضیح'}</p></td>
                      <td className="py-3 align-top"><Badge variant="outline" className={severityClass(complaint.severity)}>{formatComplaintSeverity(complaint.severity)}</Badge></td>
                      <td className="py-3 align-top"><Badge variant="outline" className={statusClass(complaint)}>{formatComplaintStatus(complaint.complaint_status)}</Badge></td>
                      <td className="py-3 align-top text-xs text-muted-foreground" dir="ltr">{complaint.created_at || '—'}</td>
                      <td className="max-w-[16rem] py-3 align-top text-xs leading-5 text-muted-foreground">{complaint.text_resolution || 'هنوز نتیجه‌ای ثبت نشده'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
        </CardContent>
      </Card>
    </div>
  )
}
