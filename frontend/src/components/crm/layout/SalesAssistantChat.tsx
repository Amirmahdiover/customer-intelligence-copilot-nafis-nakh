import { Bot, LoaderCircle, Send, Sparkles, X } from 'lucide-react'
import { FormEvent, useEffect, useRef, useState } from 'react'

import { apiUrl } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ChatMessage = {
  role: 'assistant' | 'user'
  content: string
  sources?: string[]
}

const START_MESSAGE: ChatMessage = {
  role: 'assistant',
  content: 'سلام، من دستیار فروش هوشمند هستم. می‌توانم درباره مشتریان، ریسک ریزش، فرصت‌های رشد و اولویت‌های فروش به شما کمک کنم.',
}

const QUICK_ACTIONS = [
  { label: 'مشتری‌های در معرض ریزش', question: 'کدام مشتری‌ها در معرض ریزش هستند؟' },
  { label: 'بهترین فرصت رشد', question: 'بهترین مشتری برای رشد کیست؟' },
  { label: 'اقدام امروز فروش', question: 'تیم فروش امروز چه کاری انجام دهد؟' },
  { label: 'تحلیل مشتری خاص', question: 'برای تحلیل مشتری، چه اطلاعاتی لازم است؟' },
  { label: 'وضعیت مشتری C_691869', question: 'وضعیت مشتری C_691869 چیست؟' },
] as const

const SECTION_HEADINGS = new Set(['وضعیت فعلی', 'چرا مهم است', 'شواهد', 'شواهد از CRM', 'اقدام پیشنهادی'])

export function SalesAssistantChat() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([START_MESSAGE])
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID())
  const [isLoading, setIsLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  async function sendMessage(message: string) {
    if (!message || isLoading) return

    const assistantMessageIndex = messages.length + 1
    setMessages((current) => [...current, { role: 'user', content: message }, { role: 'assistant', content: '' }])
    setInput('')
    setIsLoading(true)
    try {
      const response = await fetch(apiUrl('/chat/stream'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ message, session_id: sessionId }),
      })
      if (!response.ok || !response.body) throw new Error('Streaming response is unavailable')

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let streamedAnswer = ''
      let sources: string[] | undefined
      let lastUiUpdate = 0
      const updateAssistant = () => setMessages((current) => current.map((item, index) => (
        index === assistantMessageIndex ? { ...item, content: streamedAnswer, sources } : item
      )))

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const events = buffer.split('\n\n')
        buffer = events.pop() ?? ''
        for (const eventChunk of events) {
          // JSON.parse accepts the protocol's optional leading space.  Keeping
          // it here ensures a streamed delta is never trimmed or normalized.
          const data = eventChunk.split('\n').find((line) => line.startsWith('data:'))?.slice(5)
          if (!data) continue
          const payload = JSON.parse(data) as { type: string; delta?: string; sources?: string[]; session_id?: string }
          if (payload.type === 'meta') {
            if (payload.session_id) setSessionId(payload.session_id)
            sources = payload.sources
          }
          if (payload.type === 'delta' && payload.delta) {
            streamedAnswer += payload.delta
            if (performance.now() - lastUiUpdate >= 50) {
              lastUiUpdate = performance.now()
              updateAssistant()
            }
          }
          if (payload.type === 'done') {
            sources = payload.sources ?? sources
            updateAssistant()
          }
        }
      }
      updateAssistant()
    } catch {
      setMessages((current) => current.map((item, index) => index === assistantMessageIndex ? {
        ...item,
        content: '\u067e\u0627\u0633\u062e\u200c\u06af\u0648\u06cc\u06cc \u062f\u0631 \u062d\u0627\u0644 \u062d\u0627\u0636\u0631 \u062f\u0631 \u062f\u0633\u062a\u0631\u0633 \u0646\u06cc\u0633\u062a. \u0644\u0637\u0641\u0627\u064b \u062f\u0648\u0628\u0627\u0631\u0647 \u062a\u0644\u0627\u0634 \u06a9\u0646\u06cc\u062f.',
      } : item))
      return
      setMessages((current) => [...current, {
        role: 'assistant',
        content: 'پاسخ‌گویی در حال حاضر در دسترس نیست. لطفاً دوباره تلاش کنید.',
      }])
    } finally {
      setIsLoading(false)
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendMessage(input.trim())
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

          <div className="flex flex-wrap gap-1.5 border-b bg-muted/20 px-3 py-2" aria-label="سؤال‌های پیشنهادی">
            {QUICK_ACTIONS.map((action) => (
              <Button
                key={action.label}
                type="button"
                variant="outline"
                size="sm"
                disabled={isLoading}
                className="h-7 rounded-full px-2 text-xs"
                onClick={() => void sendMessage(action.question)}
              >
                {action.label}
              </Button>
            ))}
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-background p-3">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={cn('flex', message.role === 'user' ? 'justify-start' : 'justify-end')}>
                <div className={cn(
                  'max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-6',
                  message.role === 'user' ? 'rounded-tr-sm bg-primary text-primary-foreground' : 'rounded-tl-sm bg-muted text-foreground',
                )}
                dir={message.role === 'assistant' ? 'rtl' : undefined}
                style={message.role === 'assistant' ? {
                  direction: 'rtl',
                  textAlign: 'right',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'normal',
                  overflowWrap: 'break-word',
                  fontFamily: 'Tanha, Vazirmatn, IRANSans, Tahoma, sans-serif',
                } : undefined}>
                  {message.role === 'assistant' ? <AssistantMessageContent content={message.content} /> : message.content}
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

function AssistantMessageContent({ content }: { content: string }) {
  const sections: Array<{ title?: string; body: string[] }> = []
  let current: { title?: string; body: string[] } = { body: [] }

  for (const line of content.split('\n')) {
    const heading = line.match(/^(وضعیت فعلی|چرا مهم است|شواهد(?: از CRM)?|اقدام پیشنهادی)\s*:/)
    if (heading && SECTION_HEADINGS.has(heading[1])) {
      if (current.title || current.body.length > 0) sections.push(current)
      current = { title: heading[1], body: [line.slice(heading[0].length)] }
    } else {
      current.body.push(line)
    }
  }
  if (current.title || current.body.length > 0) sections.push(current)

  if (!sections.some((section) => section.title)) return <>{content}</>

  return (
    <div className="space-y-3">
      {sections.map((section, index) => section.title ? (
        <section key={`${section.title}-${index}`} className={cn(index > 0 && 'border-t border-border/70 pt-3')}>
          <h3 className="mb-1 font-semibold text-card-foreground">{section.title}:</h3>
          <p>{section.body.join('\n')}</p>
        </section>
      ) : section.body.join('\n') ? <p key={`text-${index}`}>{section.body.join('\n')}</p> : null)}
    </div>
  )
}
