import { Pressable, StyleSheet, Text } from 'react-native'
import type { CommunityPostItemDTO } from '@coral-studio/types'
import { colors, spacing } from '../lib/theme'

export function PostCard({ post, onPress }: { post: CommunityPostItemDTO; onPress: () => void }) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]} onPress={onPress}>
      <Text style={styles.channel}>#{post.channel.replace('_', '-')}</Text>
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
  card: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.hairline, backgroundColor: colors.ink },
  cardPressed: { opacity: 0.8 },
  channel: { fontSize: 11, color: colors.parchmentMuted, textTransform: 'uppercase', marginBottom: 2 },
  title: { fontSize: 16, fontWeight: '600', color: colors.parchment },
  author: { color: colors.parchmentMuted, marginTop: 2 },
  meta: { color: colors.parchmentMuted, marginTop: spacing.xs, fontSize: 13 },
})
