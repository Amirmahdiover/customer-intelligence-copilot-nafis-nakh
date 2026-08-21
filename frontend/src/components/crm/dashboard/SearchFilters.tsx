import { Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { CustomerFilters } from '@/types/crm'
import {
  ACCOUNT_STATUS_LABELS,
  CUSTOMER_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  RISK_LABELS,
  VALUE_TIER_LABELS,
} from '@/lib/constants'

interface SearchFiltersProps {
  filters: CustomerFilters
  onChange: (filters: CustomerFilters) => void
}

export function SearchFilters({ filters, onChange }: SearchFiltersProps) {
  const update = (partial: Partial<CustomerFilters>) => {
    onChange({ ...filters, ...partial, page: 1 })
  }

  const hasFilters =
    filters.search ||
    (filters.status && filters.status !== 'all') ||
    (filters.accountStatus && filters.accountStatus !== 'all') ||
    (filters.risk && filters.risk !== 'all') ||
    (filters.valueTier && filters.valueTier !== 'all') ||
    (filters.paymentStatus && filters.paymentStatus !== 'all') ||
    (filters.orderStatus && filters.orderStatus !== 'all')

  const clearFilters = () => {
    onChange({
      page: 1,
      limit: filters.limit,
      sortField: filters.sortField,
      sortDirection: filters.sortDirection,
    })
  }

  return (
    <div className="mb-5">
      <div className="relative mb-3">
        <Search
          size={18}
          className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          type="text"
          placeholder="جستجو: کد مشتری، نماینده فروش، موقعیت..."
          value={filters.search ?? ''}
          onChange={(e) => update({ search: e.target.value })}
          className="pr-10"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={filters.accountStatus ?? 'all'}
          onValueChange={(value) =>
            update({ accountStatus: value as CustomerFilters['accountStatus'] })
          }
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="وضعیت حساب" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">وضعیت حساب</SelectItem>
            {Object.entries(ACCOUNT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status ?? 'all'}
          onValueChange={(value) =>
            update({ status: value as CustomerFilters['status'] })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="وضعیت مشتری" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">وضعیت مشتری</SelectItem>
            {Object.entries(CUSTOMER_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.risk ?? 'all'}
          onValueChange={(value) =>
            update({ risk: value as CustomerFilters['risk'] })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="ریسک" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ریسک</SelectItem>
            {Object.entries(RISK_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.valueTier ?? 'all'}
          onValueChange={(value) =>
            update({ valueTier: value as CustomerFilters['valueTier'] })
          }
        >
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="گروه مشتری" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">گروه مشتری</SelectItem>
            {Object.entries(VALUE_TIER_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.paymentStatus ?? 'all'}
          onValueChange={(value) =>
            update({
              paymentStatus: value as CustomerFilters['paymentStatus'],
            })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="وضعیت پرداخت" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">وضعیت پرداخت</SelectItem>
            {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.orderStatus ?? 'all'}
          onValueChange={(value) =>
            update({
              orderStatus: value as CustomerFilters['orderStatus'],
            })
          }
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="وضعیت سفارش" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">وضعیت سفارش</SelectItem>
            {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {hasFilters && (
          <Button type="button" variant="ghost" onClick={clearFilters}>
            <X />
            پاک کردن فیلترها
          </Button>
        )}
      </div>
    </div>
  )
}
