import { useState } from 'react'
import { Alert, FlatList, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Markdown from 'react-native-markdown-display'
import { apiClient } from '../../../lib/api'
import { useAuth } from '../../../lib/auth/auth-context'
import { colors, radius, spacing } from '../../../lib/theme'

export default function PostDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const queryClient = useQueryClient()
  const router = useRouter()
  const { user: currentUser } = useAuth()
  const [draft, setDraft] = useState('')
  const [offerError, setOfferError] = useState<string | null>(null)

  const postQuery = useQuery({
    queryKey: ['community-post', id],
    queryFn: () => apiClient.getCommunityPost(id),
    enabled: !!id,
  })

  const commentsQuery = useQuery({
    queryKey: ['community-comments', id],
    queryFn: () => apiClient.getComments(id),
    enabled: !!id,
  })

  const offersQuery = useQuery({
    queryKey: ['community-offers', id],
    queryFn: () => apiClient.getOffers(id),
    enabled: !!id && postQuery.data?.channel === 'reader_sos',
  })

  const addCommentMutation = useMutation({
    mutationFn: (content: string) => apiClient.addComment(id, content),
    onSuccess: () => {
      setDraft('')
      queryClient.invalidateQueries({ queryKey: ['community-comments', id] })
      // The feed's PostCard renders commentsCount, so its cache needs invalidating too
      // or the comment count stays stale after navigating back (same pattern as
      // confirmReaderMutation/deleteMutation below).
      queryClient.invalidateQueries({ queryKey: ['community-posts'] })
    },
  })

  const offerMutation = useMutation({
    mutationFn: () => apiClient.offerToRead(id),
    onSuccess: () => {
      setOfferError(null)
      queryClient.invalidateQueries({ queryKey: ['community-offers', id] })
    },
    onError: (err) => setOfferError(err instanceof Error ? err.message : 'Something went wrong.'),
  })

  const confirmReaderMutation = useMutation({
    mutationFn: (readerId: string) => apiClient.confirmReader(id, readerId),
    onSuccess: () => {
      // readerStatus is also shown on the feed's post cards (post-card.tsx), so the feed's
      // cache needs invalidating too or it'll keep showing the stale status after navigating back.
      queryClient.invalidateQueries({ queryKey: ['community-post', id] })
      queryClient.invalidateQueries({ queryKey: ['community-offers', id] })
      queryClient.invalidateQueries({ queryKey: ['community-posts'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: () => apiClient.deleteCommunityPost(id),
    onSuccess: () => {
      // The post no longer exists, so the feed's cache (which lists it) must be invalidated
      // before navigating away or the deleted post lingers in the feed until a manual refresh.
      queryClient.invalidateQueries({ queryKey: ['community-posts'] })
      // This post's own cached detail/comments are now stale (the post is gone), so remove
      // them outright rather than leaving them to flash if the user navigates back to this URL.
      queryClient.removeQueries({ queryKey: ['community-post', id] })
      queryClient.removeQueries({ queryKey: ['community-comments', id] })
      router.replace('/community')
    },
  })

  function confirmDeletePost() {
    Alert.alert('Delete this post?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteMutation.mutate() },
    ])
  }

  if (postQuery.isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Loading…</Text>
      </View>
    )
  }
  if (postQuery.error || !postQuery.data) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Could not load this post.</Text>
      </View>
    )
  }

  const post = postQuery.data

  return (
    <View style={styles.container}>
      <FlatList
        data={commentsQuery.data ?? []}
        keyExtractor={(comment) => comment.id}
        ListHeaderComponent={
          <View>
            <Text style={styles.channel}>#{post.channel.replace('_', '-')}</Text>
            <Text style={styles.title}>{post.title}</Text>
            <Text style={styles.author}>{post.authorName ?? 'Unknown'}</Text>
            {currentUser && post.authorId === currentUser.id ? (
              <Pressable onPress={confirmDeletePost}>
                <Text style={styles.deleteLink}>Delete post</Text>
              </Pressable>
            ) : null}
            <View style={styles.body}>
              <Markdown style={markdownStyles}>{post.content}</Markdown>
            </View>

            {post.attachments.length > 0 ? (
              <View style={styles.attachments}>
                {post.attachments.map((attachment) => (
                  <Image key={attachment.id} source={{ uri: attachment.url }} style={styles.attachmentImage} />
                ))}
              </View>
            ) : null}

            {post.channel === 'reader_sos' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Reader request</Text>
                <Text style={styles.meta}>Status: {post.readerStatus ?? 'seeking'}</Text>
                {post.rehearsalAt ? <Text style={styles.meta}>{new Date(post.rehearsalAt).toLocaleString()}</Text> : null}
                {post.rehearsalFormat ? <Text style={styles.meta}>{post.rehearsalFormat}</Text> : null}
                {post.sceneDetails ? <Text style={styles.meta}>{post.sceneDetails}</Text> : null}
                {offersQuery.data ? (
                  offersQuery.data.offers.length > 0 ? (
                    <View>
                      <Text style={styles.meta}>Offered to read:</Text>
                      {offersQuery.data.offers.map((offer) => (
                        <Pressable key={offer.id} onPress={() => confirmReaderMutation.mutate(offer.userId)}>
                          <Text style={styles.offerLink}>{offer.userName ?? 'Someone'} — confirm as reader</Text>
                        </Pressable>
                      ))}
                    </View>
                  ) : offersQuery.data.hasOffered ? (
                    <Text style={styles.meta}>You've offered to read.</Text>
                  ) : currentUser && post.authorId !== currentUser.id ? (
                    <Pressable onPress={() => offerMutation.mutate()} disabled={offerMutation.isPending}>
                      <Text style={styles.offerLink}>Offer to read this</Text>
                    </Pressable>
                  ) : null
                ) : null}
                {offerError ? <Text style={styles.error}>{offerError}</Text> : null}
              </View>
            ) : null}

            {post.channel === 'callboard' ? (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Casting details</Text>
                {post.castingType ? <Text style={styles.meta}>{post.castingType}</Text> : null}
                {post.deadlineAt ? <Text style={styles.meta}>Due {new Date(post.deadlineAt).toLocaleDateString()}</Text> : null}
              </View>
            ) : null}

            <Text style={styles.sectionTitle}>Comments</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.comment}>
            <Text style={styles.commentAuthor}>{item.authorName ?? 'Unknown'}</Text>
            <Text style={styles.commentContent}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.message}>No comments yet.</Text>}
      />
      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Write a comment…"
          placeholderTextColor={colors.parchmentMuted}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable
          style={styles.sendButton}
          disabled={!draft.trim() || addCommentMutation.isPending}
          onPress={() => addCommentMutation.mutate(draft.trim())}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </Pressable>
      </View>
    </View>
  )
}

const markdownStyles = {
  body: { color: colors.parchment },
  link: { color: colors.accent },
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  message: { padding: spacing.lg, textAlign: 'center', color: colors.parchmentMuted },
  channel: { fontSize: 11, color: colors.parchmentMuted, textTransform: 'uppercase', margin: spacing.md, marginBottom: 0 },
  title: { fontSize: 20, fontWeight: '700', color: colors.parchment, marginHorizontal: spacing.md, marginTop: spacing.xs },
  author: { color: colors.parchmentMuted, marginHorizontal: spacing.md, marginTop: spacing.xs, marginBottom: spacing.sm },
  body: { marginHorizontal: spacing.md },
  attachments: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  attachmentImage: { width: 100, height: 100, borderRadius: radius, backgroundColor: colors.inkCard },
  error: { color: colors.accent, fontSize: 13, marginTop: 2 },
  section: { marginHorizontal: spacing.md, marginTop: spacing.sm, gap: 2 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.parchment,
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  meta: { color: colors.parchmentMuted, fontSize: 13 },
  offerLink: { color: colors.accent, fontSize: 13, fontWeight: '600', marginTop: 2 },
  deleteLink: { color: colors.accent, fontSize: 12, marginHorizontal: spacing.md, marginBottom: spacing.xs },
  comment: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, borderTopWidth: 1, borderColor: colors.hairline },
  commentAuthor: { fontWeight: '600', color: colors.parchment, marginBottom: 2 },
  commentContent: { color: colors.parchment },
  composer: { flexDirection: 'row', gap: spacing.sm, padding: spacing.sm + spacing.xs, borderTopWidth: 1, borderColor: colors.hairline },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    padding: 10,
    maxHeight: 100,
    backgroundColor: colors.inkCard,
    color: colors.parchment,
  },
  sendButton: { backgroundColor: colors.primary, borderRadius: radius, paddingHorizontal: spacing.md, justifyContent: 'center' },
  sendButtonText: { color: colors.primaryForeground, fontWeight: '600' },
})
