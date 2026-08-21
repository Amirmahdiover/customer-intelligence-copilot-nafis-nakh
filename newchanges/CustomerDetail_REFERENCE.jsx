// CustomerDetail.jsx
// نمونهٔ ساختار کامپوننت برای صفحهٔ جزئیات مشتری

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';

const CustomerDetail = () => {
  const { customerId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8000/score/${customerId}`)
      .then(res => res.json())
      .then(data => {
        setData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [customerId]);

  if (loading) return <div className="loading">در حال بارگذاری...</div>;
  if (error) return <div className="error">خطا: {error}</div>;
  if (!data) return <div>داده‌ای یافت نشد</div>;

  return (
    <div className="customer-detail-page rtl">
      {/* Breadcrumb */}
      <nav className="breadcrumb">
        مشتریان / <strong>{data.customer_info?.location_id}</strong>
      </nav>

      {/* Header */}
      <header className="customer-header">
        <div className="header-title">
          <h1>{data.customer_id}</h1>
          <button className="copy-btn" title="کپی شناسه">📋</button>
        </div>
        
        <div className="quick-metrics">
          <MetricCard icon="📊" value="560" label="میلیون تومان سود تحقق‌یافته" />
          <MetricCard icon="📈" value="4.2" label="میلیارد تومان (۱۲ ماه)" />
          <MetricCard icon="📅" value="۷۰" label="روز پیش" />
          <MetricCard icon="👤" value="مریم احمدی" label="مدیر حساب" />
        </div>

        {/* Status Tags */}
        <div className="status-tags">
          <Tag status="inactive" text="غیرفعال" />
          <Tag status="danger" text="سلامت رابطه: ۲۸ از ۱۰۰ در بحرانی" />
          <Tag status="warning" text="ریسک وصول: بالا" />
        </div>
      </header>

      {/* Recommendation Box */}
      <section className="recommendation-box">
        <div className="rec-header">
          <span className="icon">🤖</span>
          <h2>پیشنهاد هوش مصنوعی</h2>
        </div>
        <h3 className="rec-title">{data.recommendation}</h3>
        <p className="rec-text">{data.pillars?.retention?.note}</p>
        
        <div className="rec-action">
          <div className="condition">
            شرط پیشنهادی: فروش نقدی یا سقف اعتبار محدود
          </div>
        </div>

        <div className="rec-buttons">
          <button className="btn-secondary">ایجاد وظیفه</button>
          <button className="btn-primary">شروع تماس</button>
        </div>

        {/* Collapsible Formula */}
        <Collapsible title="❓ چرا این پیشنهاد؟">
          <div className="formula-details">
            <p>فرمول: امتیاز = (سلامت وصول × 0.25) + (حفظ × 0.25) + (وفاداری × 0.25) + (نقدینگی × 0.25)</p>
            <ul>
              <li>سلامت وصول: {Math.round(data.pillars?.collection?.score * 100)}%</li>
              <li>حفظ مشتری: {Math.round(data.pillars?.retention?.score * 100)}%</li>
              <li>وفاداری: {Math.round(data.pillars?.loyalty?.score * 100)}%</li>
              <li>نقدینگی: {Math.round(data.pillars?.cash?.score * 100)}%</li>
            </ul>
          </div>
        </Collapsible>
      </section>

      {/* Three Main Pillar Cards */}
      <div className="pillars-grid">
        <PillarCard
          title="سلامت رابطه"
          icon="❤️"
          score={data.pillars?.collection?.score}
          maxScore={1}
          metrics={[
            { label: "خوش‌قولی پرداخت", status: "good" },
            { label: "تعاملات کم", status: "warning" },
            { label: "شکایات: متوسط", status: "warning" },
          ]}
          details={[
            "تعداد شکایات: ۲ (۱ حل‌شده، ۱ باز)",
            "میانگین تأخیر پرداخت: ۲۳ روز",
            "نسبت به‌موقع: ۶۰٪",
            "چک برگشتی: ۰",
          ]}
        />

        <PillarCard
          title="ریسک و احتمال"
          icon="⚠️"
          score={data.pillars?.retention?.score}
          maxScore={1}
          displayPercent={true}
          metrics={[
            { label: "اطمینان مدل: بالا", status: "good" },
            { label: "آخرین خرید: ۷۰ روز پیش", status: "danger" },
            { label: "روند خریدهای: کاهش ۱۵٪", status: "warning" },
          ]}
        />

        <PillarCard
          title="ارزش اقتصادی"
          icon="📈"
          score={data.pillars?.cash?.score}
          maxScore={1}
          metrics={[
            { label: "حاشیهٔ سود: ۲۸٪", status: "good" },
            { label: "نسبت نقدی: ۷۰٪", status: "good" },
            { label: "محدودیت اعتباری: ۱.۲ میلیارد", status: "warning" },
          ]}
        />
      </div>

      {/* Key Drivers & Conditions */}
      <section className="drivers-conditions">
        <div className="drivers-col">
          <h3>💡 دلایل کلیدی و شروط معامله</h3>
          <ol>
            {data.key_drivers?.map((driver, idx) => (
              <li key={idx}>{driver}</li>
            ))}
          </ol>
        </div>

        <div className="activities-col">
          <h3>🔔 آخرین فعالیت‌ها</h3>
          <ul>
            <li>پیشنهاد سیستمی: فعال‌سازی محدود — ۱ سال پیش</li>
            <li>جلسهٔ قیمت — ۱ سال پیش</li>
            <li>پیگیری تلفنی — ۱ سال پیش</li>
          </ul>
        </div>
      </section>

      {/* Warning Box */}
      {data.warnings?.length > 0 && (
        <div className="warning-box">
          <span className="warning-icon">⚠️</span>
          {data.warnings.map((w, i) => (
            <p key={i}>{w}</p>
          ))}
        </div>
      )}

      {/* Left Sidebar */}
      <aside className="sidebar-left">
        <div className="quick-actions">
          <h4>اقدامات فوری</h4>
          <button>📞 تماس</button>
          <button>📧 ایمیل</button>
          <button>📋 وظیفه جدید</button>
          <button>📤 ارسال پیشنهاد</button>
        </div>

        <div className="customer-info">
          <h4>جزئیات مشتری</h4>
          <p><strong>نام:</strong> {data.customer_id}</p>
          <p><strong>سگمنت:</strong> {data.customer_info?.segment}</p>
          <p><strong>موقعیت:</strong> {data.customer_info?.location_id}</p>
          <p><strong>نماینده:</strong> {data.customer_info?.sales_rep_id}</p>
        </div>
      </aside>
    </div>
  );
};

// Helper Components

const MetricCard = ({ icon, value, label }) => (
  <div className="metric-card">
    <span className="icon">{icon}</span>
    <div className="metric-content">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  </div>
);

const Tag = ({ status, text }) => (
  <span className={`tag tag-${status}`}>{text}</span>
);

const PillarCard = ({ title, icon, score, maxScore, displayPercent, metrics, details }) => (
  <div className="pillar-card">
    <h3 className="pillar-title">{icon} {title}</h3>
    <div className="pillar-score">
      <div className="gauge">
        {displayPercent ? `${Math.round(score * 100)}%` : `${Math.round(score * 100)} / 100`}
      </div>
    </div>
    {metrics && (
      <div className="pillar-metrics">
        {metrics.map((m, i) => (
          <div key={i} className={`metric metric-${m.status}`}>
            {m.label}
          </div>
        ))}
      </div>
    )}
    {details && (
      <ul className="pillar-details">
        {details.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>
    )}
  </div>
);

const Collapsible = ({ title, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="collapsible">
      <button onClick={() => setOpen(!open)} className="collapsible-btn">
        {title} {open ? '▲' : '▼'}
      </button>
      {open && <div className="collapsible-content">{children}</div>}
    </div>
  );
};

export default CustomerDetail;

// ============================================
// STYLING (CSS-in-JS یا CSS خارجی)
// ============================================

const styles = `
.customer-detail-page {
  direction: rtl;
  padding: 24px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.customer-header {
  margin-bottom: 32px;
  border-bottom: 1px solid #E5E7EB;
  padding-bottom: 20px;
}

.header-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.header-title h1 {
  font-size: 32px;
  font-weight: 700;
  margin: 0;
  color: #000;
}

.quick-metrics {
  display: flex;
  gap: 16px;
  margin: 16px 0;
  overflow-x: auto;
}

.metric-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #F9FAFB;
  border-radius: 6px;
  flex-shrink: 0;
}

.metric-card .icon {
  font-size: 20px;
}

.metric-card .value {
  font-weight: 600;
  font-size: 14px;
  color: #1F2937;
}

.metric-card .label {
  font-size: 12px;
  color: #6B7280;
}

.status-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
}

.tag {
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.tag-inactive {
  background: #F3F3F3;
  color: #666;
}

.tag-danger {
  background: #FEE2E2;
  color: #DC2626;
}

.tag-warning {
  background: #FED7AA;
  color: #D97706;
}

.recommendation-box {
  background: #FFF7ED;
  border: 1px solid #FDBA74;
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 32px;
}

.rec-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.rec-header .icon {
  font-size: 20px;
}

.rec-header h2 {
  font-size: 16px;
  margin: 0;
  color: #1F2937;
}

.rec-title {
  font-size: 18px;
  font-weight: 600;
  color: #000;
  margin: 0 0 12px 0;
}

.rec-text {
  color: #4B5563;
  line-height: 1.6;
}

.rec-buttons {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.btn-primary, .btn-secondary {
  padding: 10px 20px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
}

.btn-primary {
  background: #000;
  color: #FFF;
}

.btn-secondary {
  background: #F3F3F3;
  color: #000;
  border: 1px solid #E5E7EB;
}

.pillars-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.pillar-card {
  border: 1px solid #E5E7EB;
  border-radius: 8px;
  padding: 20px;
  background: #FFF;
}

.pillar-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
  color: #1F2937;
}

.pillar-score {
  font-size: 32px;
  font-weight: 700;
  color: #DC2626;
  margin-bottom: 12px;
}

.pillar-metrics {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.metric {
  padding: 8px 12px;
  border-radius: 4px;
  font-size: 13px;
}

.metric-good {
  background: #DCFCE7;
  color: #166534;
}

.metric-warning {
  background: #FEF08A;
  color: #854D0E;
}

.metric-danger {
  background: #FEE2E2;
  color: #991B1B;
}

.drivers-conditions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  margin-bottom: 32px;
}

.warning-box {
  background: #FFFACD;
  border-right: 4px solid #FBBF24;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 24px;
}

.warning-box .warning-icon {
  font-size: 18px;
  margin-right: 8px;
}

.sidebar-left {
  position: fixed;
  left: 24px;
  top: 120px;
  width: 200px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.quick-actions, .customer-info {
  background: #F9FAFB;
  padding: 16px;
  border-radius: 6px;
}

.quick-actions h4, .customer-info h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
}

.quick-actions button {
  display: block;
  width: 100%;
  padding: 8px 12px;
  margin-bottom: 8px;
  background: #FFF;
  border: 1px solid #E5E7EB;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
}

.quick-actions button:hover {
  background: #E5E7EB;
}

.customer-info p {
  margin: 6px 0;
  font-size: 13px;
}

@media (max-width: 768px) {
  .pillars-grid {
    grid-template-columns: 1fr;
  }
  
  .drivers-conditions {
    grid-template-columns: 1fr;
  }
  
  .sidebar-left {
    position: static;
    width: 100%;
  }
}
`;
