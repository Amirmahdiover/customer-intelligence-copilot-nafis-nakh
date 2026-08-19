import { Search, X } from 'lucide-react'
import type { CustomerFilters } from '@/types/crm'
import {
  CUSTOMER_STATUS_LABELS,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  RISK_LABELS,
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
    (filters.risk && filters.risk !== 'all') ||
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
    <div className="search-filters">
      <div className="search-filters__search">
        <Search size={18} className="search-filters__search-icon" />
        <input
          type="text"
          placeholder="جستجو: نام شرکت، کد مشتری، تلفن، ایمیل..."
          value={filters.search ?? ''}
          onChange={(e) => update({ search: e.target.value })}
          className="search-filters__input"
        />
      </div>

      <div className="search-filters__row">
        <select
          value={filters.status ?? 'all'}
          onChange={(e) =>
            update({
              status: e.target.value as CustomerFilters['status'],
            })
          }
          className="search-filters__select"
        >
          <option value="all">وضعیت مشتری</option>
          {Object.entries(CUSTOMER_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <select
          value={filters.risk ?? 'all'}
          onChange={(e) =>
            update({ risk: e.target.value as CustomerFilters['risk'] })
          }
          className="search-filters__select"
        >
          <option value="all">ریسک</option>
          {Object.entries(RISK_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <select
          value={filters.paymentStatus ?? 'all'}
          onChange={(e) =>
            update({
              paymentStatus: e.target.value as CustomerFilters['paymentStatus'],
            })
          }
          className="search-filters__select"
        >
          <option value="all">وضعیت پرداخت</option>
          {Object.entries(PAYMENT_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        <select
          value={filters.orderStatus ?? 'all'}
          onChange={(e) =>
            update({
              orderStatus: e.target.value as CustomerFilters['orderStatus'],
            })
          }
          className="search-filters__select"
        >
          <option value="all">وضعیت سفارش</option>
          {Object.entries(ORDER_STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>

        {hasFilters && (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={clearFilters}
          >
            <X size={16} />
            پاک کردن فیلترها
          </button>
        )}
      </div>
    </div>
  )
}
