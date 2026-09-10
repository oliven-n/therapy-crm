import type { Stage } from '@/lib/types'

// Full class strings so Tailwind's scanner sees every variant.
const STYLES: Record<Stage, string> = {
  'New Lead': 'bg-slate-100 text-slate-700 ring-slate-200',
  Contacted: 'bg-sky-50 text-sky-700 ring-sky-200',
  Verified: 'bg-violet-50 text-violet-700 ring-violet-200',
  Booked: 'bg-amber-50 text-amber-800 ring-amber-200',
  Active: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STYLES[stage] ?? STYLES['New Lead']}`}
    >
      {stage}
    </span>
  )
}
