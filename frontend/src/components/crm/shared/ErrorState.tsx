interface ErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function ErrorState({
  message = 'بارگذاری داده‌ها با خطا مواجه شد.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="error-state">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn--secondary" onClick={onRetry}>
          تلاش مجدد
        </button>
      )}
    </div>
  )
}
