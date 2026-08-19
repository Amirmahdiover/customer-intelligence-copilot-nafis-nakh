import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { StatusBadge } from '@/components/crm/shared/StatusBadge'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { EmptyState } from '@/components/crm/shared/EmptyState'
import { ErrorState } from '@/components/crm/shared/ErrorState'
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
      <section className="card">
        <h2 className="section-title">شکایت‌ها</h2>
        <EmptyState
          title="شکایتی ثبت نشده"
          description="این مشتری تاکنون شکایتی ثبت نکرده است."
        />
      </section>
    )
  }

  return (
    <section className="card">
      <h2 className="section-title">شکایت‌ها</h2>

      <div className="complaint-summary">
        <div className="complaint-summary__item">
          <span>کل</span>
          <strong>{complaints.length}</strong>
        </div>
        <div className="complaint-summary__item">
          <span>۳ ماه اخیر</span>
          <strong>{last3Months}</strong>
        </div>
        <div className="complaint-summary__item">
          <span>باز</span>
          <strong>{openCount}</strong>
        </div>
        <div className="complaint-summary__item">
          <span>حل‌شده</span>
          <strong>{resolvedCount}</strong>
        </div>
      </div>

      <div className="complaint-list">
        {complaints.map((complaint) => {
          const isExpanded = expandedId === complaint.id
          return (
            <div key={complaint.id} className="complaint-item">
              <button
                type="button"
                className="complaint-item__header"
                onClick={() =>
                  setExpandedId(isExpanded ? null : complaint.id)
                }
              >
                <div className="complaint-item__main">
                  <span className="complaint-item__number">
                    {complaint.complaintNumber}
                  </span>
                  <span>{complaint.type}</span>
                  <StatusBadge
                    label={COMPLAINT_STATUS_LABELS[complaint.status]}
                    variantKey={
                      complaint.status === 'open' ? 'pending' : 'healthy'
                    }
                  />
                  <span className="complaint-item__date">
                    {formatDate(complaint.date)}
                  </span>
                </div>
                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {isExpanded && (
                <div className="complaint-item__detail">
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
    </section>
  )
}
