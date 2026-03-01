'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import Link from 'next/link'

interface Conversation {
  phone: string
  name: string
  lastMessage: string
  lastDirection: 'inbound' | 'outbound'
  lastAt: string
  totalMessages: number
  activeStep: string | null
}

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  body: string
  created_at: string
}

export default function WhatsAppDashboardPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null)
  const [selectedName, setSelectedName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sendingMessage, setSendingMessage] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [search, setSearch] = useState('')
  const [waConnected, setWaConnected] = useState<boolean | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadConversations()
    checkConnection()
    const interval = setInterval(loadConversations, 15000) // Refresh every 15s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const checkConnection = async () => {
    try {
      const res = await fetch('/api/settings/whatsapp-test', { method: 'POST' })
      const data = await res.json()
      setWaConnected(data.ok)
    } catch {
      setWaConnected(false)
    }
  }

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/conversations')
      const data = await res.json()
      if (data.ok) {
        setConversations(data.conversations || [])
      }
    } catch { /* ignore */ }
    setLoading(false)
  }

  const selectConversation = useCallback(async (phone: string, name: string) => {
    setSelectedPhone(phone)
    setSelectedName(name)
    setLoadingMessages(true)
    setMessages([])

    try {
      const res = await fetch(`/api/conversations/messages?phone=${encodeURIComponent(phone)}`)
      const data = await res.json()
      if (data.ok) {
        setMessages(data.messages || [])
      }
    } catch { /* ignore */ }
    setLoadingMessages(false)
    setTimeout(() => inputRef.current?.focus(), 100)
  }, [])

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedPhone || sendingMessage) return
    const msg = newMessage.trim()
    setNewMessage('')
    setSendingMessage(true)

    // Optimistic add
    const tempMsg: Message = {
      id: 'temp-' + Date.now(),
      direction: 'outbound',
      body: msg,
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, tempMsg])

    try {
      await fetch('/api/conversations/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: selectedPhone, message: msg }),
      })
    } catch { /* ignore */ }
    setSendingMessage(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (d.toDateString() === today.toDateString()) return 'Hoy'
    if (d.toDateString() === yesterday.toDateString()) return 'Ayer'
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const formatPhoneDisplay = (phone: string) => {
    if (phone.startsWith('34') && phone.length === 11) {
      return `+34 ${phone.slice(2, 5)} ${phone.slice(5, 8)} ${phone.slice(8)}`
    }
    return `+${phone}`
  }

  const filtered = conversations.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  )

  return (
    <DashboardLayout>
      <div className="wa-dashboard">
        {/* ── Sidebar: Conversation List ── */}
        <div className="wa-sidebar">
          {/* Header */}
          <div className="wa-sidebar__header">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-slate-900">WhatsApp</h2>
              <div className="flex items-center gap-2">
                {waConnected === true && (
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" title="Conectado" />
                )}
                {waConnected === false && (
                  <Link href="/settings/whatsapp" className="text-xs text-red-500 hover:underline">
                    ⚠️ Configurar
                  </Link>
                )}
                <Link
                  href="/settings/whatsapp"
                  className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                  title="Configurar WhatsApp"
                >
                  ⚙️
                </Link>
              </div>
            </div>
            <input
              type="text"
              placeholder="🔍 Buscar conversación..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-300 transition-colors"
              style={{ background: '#faf9f6' }}
            />
          </div>

          {/* Conversation List */}
          <div className="wa-sidebar__list">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-3xl mb-2">💬</p>
                <p className="text-slate-500 text-sm">No hay conversaciones</p>
                <p className="text-slate-400 text-xs mt-1">Los mensajes de WhatsApp aparecerán aquí</p>
              </div>
            ) : (
              filtered.map(c => (
                <button
                  key={c.phone}
                  onClick={() => selectConversation(c.phone, c.name)}
                  className={`wa-sidebar__item ${selectedPhone === c.phone ? 'wa-sidebar__item--active' : ''}`}
                >
                  {/* Avatar */}
                  <div className="wa-sidebar__avatar">
                    {c.name.charAt(0).toUpperCase()}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm text-slate-900 truncate">{c.name}</span>
                      <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">{formatDate(c.lastAt)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-slate-500 truncate">
                        {c.lastDirection === 'outbound' && <span className="text-emerald-500">✓ </span>}
                        {c.lastMessage.substring(0, 50)}
                      </p>
                      {c.activeStep && (
                        <span className="ml-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-700 flex-shrink-0">
                          BOT
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Chat Area ── */}
        <div className="wa-chat">
          {!selectedPhone ? (
            /* Empty state */
            <div className="wa-chat__empty">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-xl font-semibold text-slate-700 mb-2">WhatsApp Business</h3>
              <p className="text-slate-400 text-sm max-w-sm">
                Selecciona una conversación de la lista para ver los mensajes y responder a tus clientes.
              </p>
              {waConnected === false && (
                <Link
                  href="/settings/whatsapp"
                  className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-xl text-white text-sm font-medium"
                  style={{ background: 'linear-gradient(135deg, #25D366, #128C7E)' }}
                >
                  ⚙️ Configurar WhatsApp
                </Link>
              )}
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="wa-chat__header">
                <button
                  onClick={() => setSelectedPhone(null)}
                  className="wa-chat__back"
                >
                  ←
                </button>
                <div className="wa-sidebar__avatar wa-sidebar__avatar--sm">
                  {selectedName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-900 truncate">{selectedName}</p>
                  <p className="text-xs text-slate-400">{formatPhoneDisplay(selectedPhone)}</p>
                </div>
              </div>

              {/* Messages */}
              <div className="wa-chat__messages">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                    Cargando mensajes...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                    No hay mensajes con este contacto
                  </div>
                ) : (
                  <div className="wa-chat__messages-inner">
                    {messages.map((msg, i) => {
                      const showDate = i === 0 || formatDate(messages[i - 1].created_at) !== formatDate(msg.created_at)
                      return (
                        <div key={msg.id}>
                          {showDate && (
                            <div className="wa-chat__date-divider">
                              <span>{formatDate(msg.created_at)}</span>
                            </div>
                          )}
                          <div className={`wa-chat__bubble ${msg.direction === 'outbound' ? 'wa-chat__bubble--out' : 'wa-chat__bubble--in'}`}>
                            <p className="wa-chat__bubble-text">{msg.body}</p>
                            <span className="wa-chat__bubble-time">
                              {formatTime(msg.created_at)}
                              {msg.direction === 'outbound' && ' ✓'}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="wa-chat__input">
                <input
                  ref={inputRef}
                  type="text"
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Escribe un mensaje..."
                  className="wa-chat__input-field"
                  disabled={waConnected === false}
                />
                <button
                  onClick={handleSend}
                  disabled={!newMessage.trim() || sendingMessage || waConnected === false}
                  className="wa-chat__send-btn"
                >
                  {sendingMessage ? '⏳' : '➤'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
