import { Pressable, ScrollView, StyleSheet, Text } from 'react-native'
import { colors, radius, spacing } from '../lib/theme'

export type CommunityChannelId = 'all' | 'reader_sos' | 'callboard' | 'craft_chat' | 'general' | 'tape_room'

const CHANNELS: { id: CommunityChannelId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'reader_sos', label: '#reader-sos' },
  { id: 'callboard', label: '#the-callboard' },
  { id: 'craft_chat', label: '#craft-chat' },
  { id: 'general', label: '#general' },
  { id: 'tape_room', label: 'Tape Room' },
]

export function ChannelTabs({ active, onChange }: { active: CommunityChannelId; onChange: (id: CommunityChannelId) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.content}>
      {CHANNELS.map((channel) => {
        const isActive = channel.id === active
        return (
          <Pressable key={channel.id} style={[styles.tab, isActive && styles.tabActive]} onPress={() => onChange(channel.id)}>
            <Text style={[styles.label, isActive && styles.labelActive]}>{channel.label}</Text>
          </Pressable>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { borderBottomWidth: 1, borderColor: colors.hairline, backgroundColor: colors.ink },
  content: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius,
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabActive: { backgroundColor: colors.inkCard, borderColor: colors.accent },
  label: { fontSize: 13, color: colors.parchmentMuted },
  labelActive: { color: colors.accent, fontWeight: '600' },
})
