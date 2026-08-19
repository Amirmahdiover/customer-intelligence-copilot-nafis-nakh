import { Plus, Download } from 'lucide-react'

export function CrmHeader() {
  return (
    <header className="crm-page-header">
      <div>
        <h1 className="crm-page-header__title">CRM — مدیریت مشتری</h1>
        <p className="crm-page-header__desc">
          نمای ۳۶۰ درجه مشتریان، ریسک‌ها و اقدامات پیشنهادی
        </p>
      </div>
      <div className="crm-page-header__actions">
        <button type="button" className="btn btn--secondary">
          <Download size={16} />
          خروجی
        </button>
        <button type="button" className="btn btn--primary">
          <Plus size={16} />
          مشتری جدید
        </button>
      </div>
    </header>
  )
}
