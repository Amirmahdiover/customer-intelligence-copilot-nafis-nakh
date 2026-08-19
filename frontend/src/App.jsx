import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="app">
      <header className="header">
        <h1>کاپیلوت هوش مشتری</h1>
        <p>به پنل فرانت‌اند خوش آمدید</p>
      </header>

      <main className="main">
        <section className="card">
          <h2>شروع کار</h2>
          <p>
            این یک پروژه ساده React است. فایل{' '}
            <code>src/App.jsx</code> را ویرایش کنید.
          </p>
          <button type="button" onClick={() => setCount((c) => c + 1)}>
            تعداد کلیک: {count}
          </button>
        </section>
      </main>

      <footer className="footer">
        <span>نسخه اولیه — در حال توسعه</span>
      </footer>
    </div>
  )
}

export default App
