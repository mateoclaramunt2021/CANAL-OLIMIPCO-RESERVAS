'use client'

import { useState, useRef, useEffect } from 'react'

type FieldType = 'text' | 'email' | 'tel' | 'number' | 'date' | 'time' | 'select'

interface SelectOption {
  value: string
  label: string
}

interface EditableFieldProps {
  label: string
  value: string
  type?: FieldType
  highlight?: boolean
  options?: SelectOption[]
  min?: number
  max?: number
  onSave: (newValue: string) => Promise<boolean>
  disabled?: boolean
  placeholder?: string
}

export default function EditableField({
  label,
  value,
  type = 'text',
  highlight = false,
  options = [],
  min,
  max,
  onSave,
  disabled = false,
  placeholder,
}: EditableFieldProps) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement | HTMLSelectElement>(null)

  useEffect(() => {
    setEditValue(value)
  }, [value])

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select()
      }
    }
  }, [editing])

  const handleSave = async () => {
    if (editValue === value) {
      setEditing(false)
      return
    }

    // Basic validation
    if (type === 'email' && editValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editValue)) {
      setError('Email inválido')
      return
    }
    if (type === 'tel' && editValue && !/^[+\d\s()-]{6,20}$/.test(editValue)) {
      setError('Teléfono inválido')
      return
    }
    if (type === 'number') {
      const num = parseInt(editValue)
      if (isNaN(num) || num < (min ?? 1)) {
        setError(`Mínimo ${min ?? 1}`)
        return
      }
      if (max && num > max) {
        setError(`Máximo ${max}`)
        return
      }
    }

    setSaving(true)
    setError('')
    const ok = await onSave(editValue)
    setSaving(false)

    if (ok) {
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } else {
      setError('Error al guardar')
    }
  }

  const handleCancel = () => {
    setEditValue(value)
    setEditing(false)
    setError('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      handleCancel()
    }
  }

  if (editing) {
    return (
      <div className="p-3 bg-white rounded-xl border-2 border-[#B08D57] shadow-md transition-all">
        <p className="text-[10px] font-semibold text-[#B08D57] uppercase tracking-wider mb-1.5">{label}</p>
        <div className="flex items-center gap-2">
          {type === 'select' ? (
            <select
              ref={inputRef as React.RefObject<HTMLSelectElement>}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]/30"
            >
              {options.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={type === 'number' ? 'number' : type === 'date' ? 'date' : type === 'time' ? 'time' : 'text'}
              value={editValue}
              onChange={(e) => { setEditValue(e.target.value); setError('') }}
              onKeyDown={handleKeyDown}
              min={min}
              max={max}
              placeholder={placeholder}
              className="flex-1 px-2.5 py-1.5 text-sm border border-slate-200 rounded-lg bg-slate-50 outline-none focus:border-[#B08D57] focus:ring-1 focus:ring-[#B08D57]/30 min-w-0"
            />
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 flex-shrink-0 text-sm font-bold shadow-sm"
            title="Guardar"
          >
            {saving ? (
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : '✓'}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors disabled:opacity-50 flex-shrink-0 text-sm"
            title="Cancelar (Esc)"
          >
            ✕
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-1.5 font-medium">{error}</p>}
        <p className="text-[10px] text-slate-400 mt-1">Enter para guardar · Esc para cancelar</p>
      </div>
    )
  }

  // Display mode
  const displayValue = type === 'select'
    ? (options.find(o => o.value === value)?.label || value || 'N/A')
    : (value || 'N/A')

  return (
    <div
      className={`p-3 rounded-xl transition-all group relative ${
        disabled
          ? 'bg-slate-50/80'
          : 'bg-slate-50/80 hover:bg-[#fdf6e8] hover:border-[#e8d5b2] cursor-pointer border border-transparent'
      } ${saved ? 'ring-2 ring-emerald-300 bg-emerald-50' : ''}`}
      onClick={() => !disabled && setEditing(true)}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{label}</p>
        {!disabled && (
          <span className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">
            ✏️
          </span>
        )}
        {saved && (
          <span className="text-emerald-500 text-xs font-semibold animate-pulse">✓ Guardado</span>
        )}
      </div>
      <p className={`text-sm font-semibold mt-1 ${highlight ? 'text-[#B08D57]' : 'text-slate-900'} ${!value ? 'text-slate-400 italic' : ''}`}>
        {displayValue}
      </p>
    </div>
  )
}
