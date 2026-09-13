import { Pressable, StyleSheet, Text, View } from 'react-native'
import { colors, radius, spacing } from '../lib/theme'

// Metro resolves this file (not rehearsal-video-room.tsx) for the web
// platform automatically -- @livekit/react-native-webrtc crashes on import
// under react-native-web (see lib/livekit-setup.web.ts), so live video has
// no web target at all. Android is the only supported platform per this
// branch's scope.
export function RehearsalVideoRoom({ onLeave }: { postId: string; onLeave: () => void }) {
  return (
    <View style={styles.message}>
      <Text style={styles.messageText}>Live video isn't available in the web preview — use the Android app.</Text>
      <Pressable style={styles.backButton} onPress={onLeave}>
        <Text style={styles.backButtonText}>Back to post</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  message: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, backgroundColor: colors.ink, padding: spacing.lg },
  messageText: { color: colors.parchmentMuted, fontSize: 14, textAlign: 'center' },
  backButton: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingHorizontal: spacing.md, paddingVertical: 10 },
  backButtonText: { color: colors.parchmentMuted, fontWeight: '600' },
})
