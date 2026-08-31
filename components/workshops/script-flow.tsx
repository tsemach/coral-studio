import { assignCharacterColors } from '@/lib/workshops/script-colors'
import type { Script } from '@/lib/workshops/scripts'

export function ScriptFlow({ script }: { script: Script }) {
  const characters = script.script_flow
    .filter((entry) => entry.type === 'dialogue')
    .map((entry) => entry.character)
  const colors = assignCharacterColors(characters)

  return (
    <div className="flex flex-col gap-3 text-[13.5px] leading-relaxed">
      {script.script_flow.map((entry, index) =>
        entry.type === 'action' ? (
          <p key={index} className="italic text-ink-foreground/55">
            {entry.text}
          </p>
        ) : (
          <p key={index}>
            <span className="mr-1.5 text-[12.5px] font-bold tracking-[0.04em]" style={{ color: colors[entry.character] }}>
              {entry.character}
            </span>
            {entry.line}
          </p>
        )
      )}
    </div>
  )
}
