import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { EmptyState } from '@/components/crm/shared/EmptyState'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useCustomerComplaints } from '@/hooks/crm/useCrmQueries'
import {
  COMPLAINT_PRIORITY_LABELS,
  COMPLAINT_STATUS_LABELS,
} from '@/lib/constants'
import { formatDate } from '@/lib/formatters'

interface ComplaintsProps {
  customerId: string
}

export function Complaints({ customerId }: ComplaintsProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const { data: complaints, isLoading, isError, refetch } =
    useCustomerComplaints(customerId)

  if (isLoading) return <SectionSkeleton />
  if (isError) return <ErrorState onRetry={() => refetch()} />

  const openCount = complaints?.filter((c) => c.status === 'open').length ?? 0
  const resolvedCount = complaints?.filter((c) => c.status === 'resolved').length ?? 0
  const last3Months = complaints?.length ?? 0

  if (!complaints || complaints.length === 0) {
    return (
      <Card className="mb-5">
        <CardHeader>
          <CardTitle>شکایت‌ها</CardTitle>
        </CardHeader>
        <CardContent>
          <EmptyState
            title="شکایتی ثبت نشده"
            description="این مشتری تاکنون شکایتی ثبت نکرده است."
          />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>شکایت‌ها</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
          <div className="rounded-md bg-muted p-2.5 text-center">
            <span className="block text-xs text-muted-foreground">کل</span>
            <strong className="text-xl text-card-foreground">{complaints.length}</strong>
          </div>
          <div className="rounded-md bg-muted p-2.5 text-center">
            <span className="block text-xs text-muted-foreground">۳ ماه اخیر</span>
            <strong className="text-xl text-card-foreground">{last3Months}</strong>
          </div>
          <div className="rounded-md bg-muted p-2.5 text-center">
            <span className="block text-xs text-muted-foreground">باز</span>
            <strong className="text-xl text-card-foreground">{openCount}</strong>
          </div>
          <div className="rounded-md bg-muted p-2.5 text-center">
            <span className="block text-xs text-muted-foreground">حل‌شده</span>
            <strong className="text-xl text-card-foreground">{resolvedCount}</strong>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {complaints.map((complaint) => {
            const isExpanded = expandedId === complaint.id
            return (
              <div key={complaint.id} className="overflow-hidden rounded-md border">
                <button
                  type="button"
                  className="flex w-full items-center justify-between bg-card p-3 text-right"
                  onClick={() => setExpandedId(isExpanded ? null : complaint.id)}
                >
                  <div className="flex flex-wrap items-center gap-2.5 text-sm">
                    <span className="font-bold text-card-foreground" dir="ltr">
                      {complaint.complaintNumber}
                    </span>
                    <span>{complaint.type}</span>
                    <StatusBadge
                      label={COMPLAINT_STATUS_LABELS[complaint.status]}
                      variantKey={
                        complaint.status === 'open' ? 'pending' : 'healthy'
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      {formatDate(complaint.date)}
                    </span>
                  </div>
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {isExpanded && (
                  <div className="flex flex-col gap-2 border-t bg-muted p-3 text-sm">
                    <p>{complaint.description}</p>
                    <StatusBadge
                      label={`اولویت: ${COMPLAINT_PRIORITY_LABELS[complaint.priority]}`}
                      variantKey={complaint.priority}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
