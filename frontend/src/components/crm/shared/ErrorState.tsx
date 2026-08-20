import { Button } from '@/components/ui/button'

interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  message = 'بارگذاری داده‌ها با خطا مواجه شد.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="px-4 py-8 text-center text-destructive">
      <p className="mb-4">{message}</p>
      {onRetry && (
        <Button type="button" variant="outline" onClick={onRetry}>
          تلاش مجدد
        </Button>
      )}
    </div>
  )
}
