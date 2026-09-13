import { Pressable, StyleSheet, Text } from 'react-native'
import type { CommunityPostItemDTO } from '@coral-studio/types'
import { colors, spacing } from '../lib/theme'

// Matches studio-web's getChannelLabel() in components/community/post-card.tsx
// exactly -- "callboard" has its own #the-callboard label, everything else
// maps directly to its own #channel-name.
function getChannelLabel(channel: string): string {
  switch (channel) {
    case 'reader_sos':
      return '#reader-sos'
    case 'callboard':
      return '#the-callboard'
    case 'craft_chat':
      return '#craft-chat'
    default:
      return '#general'
  }
}

export function PostCard({ post, onPress }: { post: CommunityPostItemDTO; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <Text style={styles.channel}>{getChannelLabel(post.channel)}</Text>
      <Text style={styles.title}>{post.title}</Text>
      <Text style={styles.author}>{post.authorName ?? 'Unknown'}</Text>
      {post.channel === 'reader_sos' && post.readerStatus ? <Text style={styles.meta}>Status: {post.readerStatus}</Text> : null}
      {post.channel === 'callboard' && post.castingType ? (
        <Text style={styles.meta}>
          {post.castingType}
          {post.deadlineAt ? ` · due ${new Date(post.deadlineAt).toLocaleDateString()}` : ''}
        </Text>
      ) : null}
      <Text style={styles.meta}>
        {post.commentsCount} comment{post.commentsCount === 1 ? '' : 's'}
      </Text>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.hairline, backgroundColor: colors.inkCard },
  cardPressed: { opacity: 0.8 },
  channel: { fontSize: 12, color: colors.communityBlueLight, fontWeight: '600', marginBottom: 2 },
  title: { fontSize: 16, fontWeight: '600', color: colors.parchment },
  author: { color: colors.parchmentMuted, marginTop: 2 },
  meta: { color: colors.parchmentMuted, marginTop: spacing.xs, fontSize: 13 },
})
