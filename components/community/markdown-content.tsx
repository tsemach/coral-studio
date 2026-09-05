import ReactMarkdown from 'react-markdown'

// Same arbitrary-variant approach as components/scripts/prompt-panel.tsx --
// this repo has no tailwind.config.* and doesn't register
// @tailwindcss/typography, so markdown children are styled directly via
// `[&_tag]:` selectors on the wrapping element instead of `prose` classes.
const MARKDOWN_CLASSNAME =
  '[&_h1]:mb-2 [&_h1]:mt-3 [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-ink-foreground [&_h1]:first:mt-0 [&_h2]:mb-2 [&_h2]:mt-3 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:text-ink-foreground [&_h2]:first:mt-0 [&_p]:mb-2.5 [&_p]:last:mb-0 [&_strong]:font-semibold [&_strong]:text-ink-foreground [&_em]:italic [&_ul]:mb-2.5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-2.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:mb-1 [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-ink [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em] [&_code]:text-ink-foreground'

export function MarkdownContent({ content, className }: { content: string; className?: string }) {
  return (
    <div className={className ? `${MARKDOWN_CLASSNAME} ${className}` : MARKDOWN_CLASSNAME}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  )
}
