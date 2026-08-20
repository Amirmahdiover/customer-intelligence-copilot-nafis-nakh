import { Phone, Package, MoreHorizontal, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { CustomerHeaderSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useCustomer } from '@/hooks/crm/useCrmQueries'
import { ACCOUNT_STATUS_LABELS, CUSTOMER_STATUS_LABELS } from '@/lib/constants'
import { formatCustomerIdWithStatus } from '@/lib/customerInfo'
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
    <Card className="mb-5">
      <CardContent>
        <Button
          type="button"
          variant="ghost"
          className="mb-4 h-auto px-0 text-primary"
          onClick={() => navigate('/crm')}
        >
          <ArrowRight />
          بازگشت به لیست
        </Button>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <Avatar className="size-14 text-base">
              <AvatarFallback>{getInitials(customer.code)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-[1.35rem] font-bold text-card-foreground" dir="ltr">
                {formatCustomerIdWithStatus(customer.code, customer.accountStatus)}
              </h1>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {customer.email !== '—' && customer.email}
                {customer.email !== '—' && customer.phone !== '—' && ' · '}
                {customer.phone !== '—' && customer.phone}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                {customer.accountStatus && (
                  <StatusBadge
                    label={ACCOUNT_STATUS_LABELS[customer.accountStatus]}
                    variantKey={
                      customer.accountStatus === 'فعال' ? 'healthy' : 'high-risk'
                    }
                  />
                )}
                <StatusBadge
                  label={CUSTOMER_STATUS_LABELS[customer.status]}
                  variantKey={customer.status}
                />
                <span className="text-xs text-muted-foreground">
                  آخرین فعالیت: {formatRelativeDate(customer.lastActivityDate)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() => showToast('تماس با مشتری ثبت شد.')}
            >
              <Phone />
              تماس با مشتری
            </Button>
            <Button type="button" variant="outline">
              <Package />
              مشاهده سفارشات
            </Button>
            <Button type="button" variant="ghost" size="icon">
              <MoreHorizontal />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
