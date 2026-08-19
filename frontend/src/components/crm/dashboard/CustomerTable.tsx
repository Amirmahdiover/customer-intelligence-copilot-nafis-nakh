import { useNavigate } from 'react-router-dom'
import { Eye, ArrowUpDown } from 'lucide-react'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { CustomerTableSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { EmptyState } from '@/components/crm/shared/EmptyState'
import { useCustomers } from '@/hooks/crm/useCrmQueries'
import {
  CUSTOMER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  RISK_LABELS,
} from '@/lib/constants'
import { formatCurrency, formatRelativeDate, getInitials } from '@/lib/formatters'
import type { CustomerFilters, SortField } from '@/types/crm'

interface CustomerTableProps {
  filters: CustomerFilters
  onFiltersChange: (filters: CustomerFilters) => void
}

export function CustomerTable({ filters, onFiltersChange }: CustomerTableProps) {
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useCustomers(filters)

  const toggleSort = (field: SortField) => {
    const current = filters.sortField
    const dir = filters.sortDirection ?? 'asc'
    onFiltersChange({
      ...filters,
      sortField: field,
      sortDirection: current === field && dir === 'asc' ? 'desc' : 'asc',
      page: 1,
    })
  }

  if (isLoading) return <CustomerTableSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />
  if (!data || data.data.length === 0) {
    return (
      <EmptyState
        title="مشتری یافت نشد"
        description="فیلترها را تغییر دهید یا جستجوی دیگری انجام دهید."
      />
    )
  }

  return (
    <div className="customer-table-wrapper">
      <table className="customer-table">
        <thead>
          <tr>
            <th>مشتری</th>
            <th>وضعیت</th>
            <th>سفارشات</th>
            <th>
              <button
                type="button"
                className="sort-btn"
                onClick={() => toggleSort('revenue')}
              >
                درآمد <ArrowUpDown size={14} />
              </button>
            </th>
            <th>سود</th>
            <th>
              <button
                type="button"
                className="sort-btn"
                onClick={() => toggleSort('lastOrder')}
              >
                آخرین سفارش <ArrowUpDown size={14} />
              </button>
            </th>
            <th>پرداخت</th>
            <th>
              <button
                type="button"
                className="sort-btn"
                onClick={() => toggleSort('risk')}
              >
                ریسک <ArrowUpDown size={14} />
              </button>
            </th>
            <th>عملیات</th>
          </tr>
        </thead>
        <tbody>
          {data.data.map((customer) => (
            <tr key={customer.id}>
              <td>
                <div className="customer-cell">
                  <div className="customer-cell__avatar">
                    {getInitials(customer.name)}
                  </div>
                  <div>
                    <div className="customer-cell__name">{customer.name}</div>
                    <div className="customer-cell__code">{customer.code}</div>
                  </div>
                </div>
              </td>
              <td>
                <StatusBadge
                  label={CUSTOMER_STATUS_LABELS[customer.status]}
                  variantKey={customer.status}
                />
              </td>
              <td>{customer.orderCount} سفارش</td>
              <td className="num">{formatCurrency(customer.totalRevenue)}</td>
              <td className="num">{formatCurrency(customer.totalProfit)}</td>
              <td>{formatRelativeDate(customer.lastOrderDate)}</td>
              <td>
                <StatusBadge
                  label={PAYMENT_STATUS_LABELS[customer.paymentStatus]}
                  variantKey={customer.paymentStatus}
                />
              </td>
              <td>
                <StatusBadge
                  label={RISK_LABELS[customer.risk.overall]}
                  variantKey={customer.risk.overall}
                />
              </td>
              <td>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() => navigate(`/crm/customers/${customer.id}`)}
                >
                  <Eye size={16} />
                  مشاهده
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {data.totalPages > 1 && (
        <div className="pagination">
          <button
            type="button"
            className="btn btn--secondary"
            disabled={data.page <= 1}
            onClick={() =>
              onFiltersChange({ ...filters, page: (filters.page ?? 1) - 1 })
            }
          >
            قبلی
          </button>
          <span className="pagination__info">
            صفحه {data.page} از {data.totalPages} ({data.total} مشتری)
          </span>
          <button
            type="button"
            className="btn btn--secondary"
            disabled={data.page >= data.totalPages}
            onClick={() =>
              onFiltersChange({ ...filters, page: (filters.page ?? 1) + 1 })
            }
          >
            بعدی
          </button>
        </div>
      )}
    </div>
  )
}
