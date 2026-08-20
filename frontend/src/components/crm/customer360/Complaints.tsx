import { useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { SectionSkeleton } from '@/components/crm/shared/skeletons/CrmSkeletons'
import { ErrorState } from '@/components/crm/shared/ErrorState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  useCustomerComplaints,
  useCustomerComplaintsCount,
} from '@/hooks/crm/useCrmQueries'
import {
  COMPLAINT_COLUMN_LABELS,
  formatComplaintSeverity,
  formatComplaintStatus,
} from '@/lib/complaintDisplay'
import { formatDate, formatNumber } from '@/lib/formatters'

interface ComplaintsProps {
  customerId: string
}

export function Complaints({ customerId }: ComplaintsProps) {
  const [expanded, setExpanded] = useState(false)
  const {
    data: count,
    isLoading: countLoading,
    isError: countError,
    refetch: refetchCount,
  } = useCustomerComplaintsCount(customerId)
  const {
    data: complaints,
    isLoading: detailsLoading,
    isError: detailsError,
    refetch: refetchDetails,
  } = useCustomerComplaints(customerId, expanded)

  if (countLoading) return <SectionSkeleton />
  if (countError) return <ErrorState onRetry={() => refetchCount()} />

  const complaintsCount = count ?? 0

  return (
    <Card className="mb-5">
      <CardHeader>
        <CardTitle>شکایات</CardTitle>
      </CardHeader>
      <CardContent>
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-md border bg-muted/40 p-4 text-right transition-colors hover:bg-muted/70"
          onClick={() => setExpanded((prev) => !prev)}
        >
          <div>
            <span className="block text-sm text-muted-foreground">شکایات</span>
            <strong className="text-2xl text-card-foreground">
              {formatNumber(complaintsCount)} مورد
            </strong>
          </div>
          {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {expanded && (
          <div className="mt-4">
            {detailsLoading && <SectionSkeleton />}
            {detailsError && (
              <ErrorState onRetry={() => refetchDetails()} />
            )}
            {!detailsLoading && !detailsError && complaintsCount === 0 && (
              <p className="text-sm text-muted-foreground">
                این مشتری شکایتی ثبت نکرده است.
              </p>
            )}
            {!detailsLoading && !detailsError && complaints && complaints.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{COMPLAINT_COLUMN_LABELS.Product_id}</TableHead>
                    <TableHead>{COMPLAINT_COLUMN_LABELS.complaint_text}</TableHead>
                    <TableHead>{COMPLAINT_COLUMN_LABELS.severity}</TableHead>
                    <TableHead>{COMPLAINT_COLUMN_LABELS.created_at}</TableHead>
                    <TableHead>{COMPLAINT_COLUMN_LABELS.complaint_status}</TableHead>
                    <TableHead>{COMPLAINT_COLUMN_LABELS.text_resolution}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {complaints.map((complaint) => (
                    <TableRow key={complaint.id}>
                      <TableCell dir="ltr">{complaint.Product_id}</TableCell>
                      <TableCell className="max-w-xs whitespace-normal text-sm leading-relaxed">
                        {complaint.complaint_text}
                      </TableCell>
                      <TableCell>{formatComplaintSeverity(complaint.severity)}</TableCell>
                      <TableCell>{formatDate(complaint.created_at)}</TableCell>
                      <TableCell>{formatComplaintStatus(complaint.complaint_status)}</TableCell>
                      <TableCell className="max-w-xs whitespace-normal text-sm leading-relaxed">
                        {complaint.text_resolution ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
