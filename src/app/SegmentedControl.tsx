import { useId } from 'react'
import type { ReactNode } from 'react'

interface Segment<Value extends string> {
  value: Value
  label: string
  content: ReactNode
  lang?: string
}

interface SegmentedControlProps<Value extends string> {
  label: string
  options: readonly Segment<Value>[]
  value: Value
  onChange: (value: Value) => void
}

export function SegmentedControl<Value extends string>({
  label,
  options,
  value,
  onChange,
}: SegmentedControlProps<Value>) {
  const id = useId()

  return (
    <div role="radiogroup" aria-label={label} className="inline-flex shrink-0 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-950">
      {options.map((option) => (
        <label key={option.value} title={option.label} className="relative cursor-pointer">
          <input
            className="peer sr-only"
            type="radio"
            name={id}
            value={option.value}
            aria-label={option.label}
            lang={option.lang}
            checked={option.value === value}
            onChange={() => onChange(option.value)}
          />
          <span aria-hidden="true" className="grid h-9 w-10 place-items-center rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-200 peer-checked:bg-teal-800 peer-checked:text-white peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-teal-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:peer-checked:bg-teal-300 dark:peer-checked:text-slate-950 dark:peer-focus-visible:outline-teal-300">
            {option.content}
          </span>
        </label>
      ))}
    </div>
  )
}
