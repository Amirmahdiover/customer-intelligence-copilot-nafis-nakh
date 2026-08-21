import { Bot, LoaderCircle, Send, Sparkles, X } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'

import { apiPost } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ChatMessage = {
  role: 'assistant' | 'user'
  content: string
  sources?: string[]
}

type ChatResponse = { answer: string; sources: string[] }

const START_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: 'سلام، من دستیار فروش هوشمند هستم. می‌توانم درباره مشتریان، ریسک ریزش، فرصت‌های رشد و اولویت‌های فروش به شما کمک کنم.',
}

export function SalesAssistantChat() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([START_MESSAGE])
  const [isLoading, setIsLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const message = input.trim()
    if (!message || isLoading) return

    setMessages((current) => [...current, { role: 'user', content: message }])
    setInput('')
    setIsLoading(true)
    try {
      const response = await apiPost<ChatResponse>('/chat', { message })
      setMessages((current) => [...current, { role: 'assistant', content: response.answer, sources: response.sources }])
    } catch {
      setMessages((current) => [...current, {
        role: 'assistant',
        content: 'پاسخ‌گویی در حال حاضر در دسترس نیست. لطفاً دوباره تلاش کنید.',
      }])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div dir="rtl" className="fixed bottom-4 right-4 z-[60] lg:right-20">
      {open && (
        <section className="mb-3 flex h-[min(34rem,calc(100vh-7rem))] w-[min(24rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border bg-card shadow-2xl">
          <header className="flex items-center justify-between border-b bg-muted/40 px-4 py-3">
            <div className="flex items-center gap-2 text-card-foreground">
              <span className="flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground"><Sparkles size={16} /></span>
              <div>
                <h2 className="text-sm font-bold">دستیار فروش AI</h2>
                <p className="text-xs text-muted-foreground">پاسخ بر پایه داده‌های CRM</p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="بستن دستیار فروش"><X size={17} /></Button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-background p-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={cn('flex', message.role === 'user' ? 'justify-start' : 'justify-end')}>
                <div className={cn(
                  'max-w-[88%] whitespace-pre-line rounded-2xl px-3 py-2.5 text-sm leading-6',
                  message.role === 'user' ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm bg-muted text-foreground',
                )}>
                  {message.content}
                  {message.sources && message.sources.length > 0 && (
                    <p className="mt-2 border-t border-border/70 pt-1.5 text-[0.68rem] text-muted-foreground">
                      منابع: {message.sources.join('، ')}
                    </p>
                  )}
                </div>
              </div>
            ))}
            {isLoading && <div className="flex justify-end"><div className="flex items-center gap-2 rounded-2xl rounded-tl-sm bg-muted px-3 py-2 text-sm text-muted-foreground"><LoaderCircle className="animate-spin" size={16} />در حال بررسی داده‌ها…</div></div>}
            <div ref={endRef} />
          </div>

          <form onSubmit={submit} className="flex gap-2 border-t bg-card p-3">
            <input value={input} onChange={(event) => setInput(event.target.value)} placeholder="سؤال خود را بنویسید…" disabled={isLoading} className="min-w-0 flex-1 rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring/50" />
            <Button type="submit" size="icon" disabled={!input.trim() || isLoading} aria-label="ارسال پیام"><Send size={16} /></Button>
          </form>
        </section>
      )}
      <Button type="button" size="icon-lg" onClick={() => setOpen((value) => !value)} aria-label={open ? 'بستن دستیار فروش' : 'باز کردن دستیار فروش'} className="size-12 rounded-full shadow-lg">
        {open ? <X size={20} /> : <Bot size={22} />}
      </Button>
    </div>
  )
}
