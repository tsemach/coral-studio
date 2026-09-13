import { StyleSheet } from 'react-native'
import { colors, radius, spacing } from '../../lib/theme'

export const liveVideoStyles = StyleSheet.create({
  grid: { flex: 1 },
  tile: { backgroundColor: colors.inkCard, overflow: 'hidden' },
  tileName: {
    position: 'absolute',
    left: 6,
    bottom: 6,
    color: colors.parchment,
    fontSize: 12,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  mediaErrorBanner: { backgroundColor: colors.inkCard, borderBottomWidth: 1, borderColor: colors.hairline, padding: spacing.sm },
  mediaErrorText: { color: colors.accent, fontSize: 12, textAlign: 'center' },
  controls: { flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderTopWidth: 1, borderColor: colors.hairline },
  controlButton: { flex: 1, borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  controlButtonText: { color: colors.parchment, fontWeight: '600', fontSize: 13 },
  leaveButton: { flex: 1, backgroundColor: colors.primary, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  leaveButtonText: { color: colors.primaryForeground, fontWeight: '600', fontSize: 13 },
})
