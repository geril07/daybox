import { tokenize } from '@/shared/utils/linkify'

export function LinkifiedText({ text }: { text: string }) {
  return tokenize(text).map((t, i) =>
    t.type === 'text' ? (
      <span key={i}>{t.value}</span>
    ) : (
      <a
        key={i}
        href={t.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="break-all text-blue-600 underline hover:text-blue-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
      >
        {t.display}
      </a>
    ),
  )
}
