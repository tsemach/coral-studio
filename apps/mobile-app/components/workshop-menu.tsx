import { useRef, useState } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, pillRadius, spacing } from '../lib/theme'

const MENU_WIDTH = 200

type MenuPosition = { top: number; left: number }

// Workshop detail screen's kebab (⋮) dropdown -- consolidates what used to
// be separate inline links (Reschedule/Cancel rehearsal/Add member/Leave)
// into one menu, matching studio-web's WorkshopCardMenu but rendered as
// individually rounded buttons (per the mobile mockup) rather than web's
// flat menu rows.
export function WorkshopMenu({
  hasRehearsal,
  onReschedule,
  onAddMember,
  onCancelRehearsal,
  onLeave,
}: {
  hasRehearsal: boolean
  onReschedule: () => void
  onAddMember: () => void
  onCancelRehearsal: () => void
  onLeave: () => void
}) {
  const triggerRef = useRef<View>(null)
  const [position, setPosition] = useState<MenuPosition | null>(null)

  function open() {
    // Measured rather than hardcoded so this stays correct regardless of
    // status bar height or where the header ends up on a given device.
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setPosition({ top: y + height + 4, left: x + width - MENU_WIDTH })
    })
  }

  function select(action: () => void) {
    setPosition(null)
    action()
  }

  return (
    <>
      <Pressable ref={triggerRef} style={styles.trigger} onPress={open} hitSlop={8}>
        <Text style={styles.triggerDots}>⋮</Text>
      </Pressable>
      <Modal visible={position !== null} transparent animationType="fade" onRequestClose={() => setPosition(null)}>
        <Pressable style={styles.backdrop} onPress={() => setPosition(null)}>
          {position ? (
            <View style={[styles.menu, { top: position.top, left: position.left }]}>
              <Pressable style={styles.item} onPress={() => select(onReschedule)}>
                <Text style={styles.itemText}>{hasRehearsal ? 'Reschedule' : 'Schedule rehearsal'}</Text>
              </Pressable>
              <Pressable style={styles.item} onPress={() => select(onAddMember)}>
                <Text style={styles.itemText}>Add member</Text>
              </Pressable>
              {hasRehearsal ? (
                <Pressable style={styles.item} onPress={() => select(onCancelRehearsal)}>
                  <Text style={styles.itemText}>Cancel rehearsal</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.item} onPress={() => select(onLeave)}>
                <Text style={styles.itemTextDanger}>Leave workgroup</Text>
              </Pressable>
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  trigger: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  triggerDots: { color: colors.parchmentMuted, fontSize: 18, fontWeight: '700' },
  backdrop: { flex: 1 },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    gap: spacing.xs,
    padding: spacing.xs,
    backgroundColor: colors.inkCard,
    borderRadius: pillRadius,
    borderWidth: 1,
    borderColor: colors.hairline,
  },
  item: { borderRadius: pillRadius, paddingVertical: 10, paddingHorizontal: spacing.md, backgroundColor: colors.ink },
  itemText: { color: colors.accent, fontWeight: '600', fontSize: 14, textAlign: 'center' },
  itemTextDanger: { color: colors.danger, fontWeight: '600', fontSize: 14, textAlign: 'center' },
})
