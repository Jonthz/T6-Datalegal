import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, SelectHTMLAttributes } from 'react'
import { useId } from 'react'
import { cn } from '../../lib/cn'

const baseField =
  'w-full rounded-lg bg-white/[0.04] border border-white/10 text-ink-50 placeholder:text-ink-400 ' +
  'focus:bg-white/[0.06] focus:border-brand-400/60 disabled:opacity-50 disabled:cursor-not-allowed'

interface FieldShellProps {
  label?: string
  hint?: string
  error?: string
  required?: boolean
  htmlFor?: string
  children: ReactNode
}

export function FieldShell({ label, hint, error, required, htmlFor, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={htmlFor} className="block text-xs font-medium text-ink-200">
          {label}
          {required && <span className="text-rose-400 ml-1" aria-hidden>*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-rose-300" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-ink-400">{hint}</p>
      ) : null}
    </div>
  )
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  hint?: string
  error?: string
}

export function Input({ label, hint, error, required, className, id, ...rest }: InputProps) {
  const generatedId = useId()
  const inputId = id ?? generatedId
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={inputId}>
      <input
        {...rest}
        id={inputId}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        className={cn(baseField, 'h-10 px-3 text-sm', error && 'border-rose-400/60', className)}
      />
    </FieldShell>
  )
}

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  hint?: string
  error?: string
}

export function Textarea({
  label,
  hint,
  error,
  required,
  className,
  id,
  rows = 4,
  ...rest
}: TextareaProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={fieldId}>
      <textarea
        {...rest}
        id={fieldId}
        rows={rows}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        className={cn(baseField, 'px-3 py-2 text-sm leading-6 scrollbar-thin', error && 'border-rose-400/60', className)}
      />
    </FieldShell>
  )
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  hint?: string
  error?: string
  options: Array<{ value: string; label: string }>
  placeholder?: string
}

export function Select({
  label,
  hint,
  error,
  required,
  options,
  placeholder,
  className,
  id,
  ...rest
}: SelectProps) {
  const generatedId = useId()
  const fieldId = id ?? generatedId
  return (
    <FieldShell label={label} hint={hint} error={error} required={required} htmlFor={fieldId}>
      <select
        {...rest}
        id={fieldId}
        required={required}
        aria-invalid={error ? 'true' : undefined}
        className={cn(
          baseField,
          'h-10 px-3 text-sm appearance-none bg-ink-900/60',
          error && 'border-rose-400/60',
          className
        )}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-ink-900 text-ink-50">
            {opt.label}
          </option>
        ))}
      </select>
    </FieldShell>
  )
}
