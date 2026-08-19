import { Phone, Package, MoreHorizontal, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { CustomerHeaderSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { useCustomer } from '@/hooks/crm/useCrmQueries'
import { CUSTOMER_STATUS_LABELS } from '@/lib/constants'
import { formatRelativeDate, getInitials } from '@/lib/formatters'
import { useToast } from '@/components/crm/shared/Toast'

interface CustomerHeaderProps {
  customerId: string
}

export function CustomerHeader({ customerId }: CustomerHeaderProps) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { data: customer, isLoading, isError, refetch } = useCustomer(customerId)

  if (isLoading) return <CustomerHeaderSkeleton />
  if (isError || !customer) {
    return <ErrorState message="مشتری یافت نشد." onRetry={() => refetch()} />
  }

  return (
    <header className="customer-header card">
      <button
        type="button"
        className="back-link"
        onClick={() => navigate('/crm')}
      >
        <ArrowRight size={16} />
        بازگشت به لیست
      </button>

      <div className="customer-header__main">
        <div className="customer-header__info">
          <div className="customer-cell__avatar customer-cell__avatar--lg">
            {getInitials(customer.name)}
          </div>
          <div>
            <h1 className="customer-header__name">{customer.name}</h1>
            <p className="customer-header__meta">
              کد مشتری: {customer.code}
            </p>
            <div className="customer-header__badges">
              <StatusBadge
                label={CUSTOMER_STATUS_LABELS[customer.status]}
                variantKey={customer.status}
              />
              <span className="customer-header__activity">
                آخرین فعالیت: {formatRelativeDate(customer.lastActivityDate)}
              </span>
            </div>
          </div>
        </div>

        <div className="customer-header__actions">
          <button
            type="button"
            className="btn btn--primary"
            onClick={() => showToast('تماس با مشتری ثبت شد.')}
          >
            <Phone size={16} />
            تماس با مشتری
          </button>
          <button type="button" className="btn btn--secondary">
            <Package size={16} />
            مشاهده سفارشات
          </button>
          <button type="button" className="btn btn--ghost">
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>
    </header>
  )
}
