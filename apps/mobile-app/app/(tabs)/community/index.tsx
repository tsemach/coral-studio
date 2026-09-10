import { useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import type { CommunityChannel } from '@coral-studio/types'
import { apiClient } from '../../../lib/api'
import { ChannelTabs, type CommunityChannelId } from '../../../components/channel-tabs'
import { PostCard } from '../../../components/post-card'
import { TapeCard } from '../../../components/tape-card'
import { colors, radius, spacing } from '../../../lib/theme'

export default function CommunityFeedScreen() {
  const router = useRouter()
  const [activeChannel, setActiveChannel] = useState<CommunityChannelId>('all')
  const isTapeRoom = activeChannel === 'tape_room'
  const channel = isTapeRoom || activeChannel === 'all' ? undefined : (activeChannel as CommunityChannel)

  const postsQuery = useInfiniteQuery({
    queryKey: ['community-posts', channel],
    queryFn: ({ pageParam }) => apiClient.getCommunityPosts({ channel, cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !isTapeRoom,
  })

  const tapesQuery = useQuery({
    queryKey: ['tapes'],
    queryFn: () => apiClient.getTapes(),
    enabled: isTapeRoom,
  })

  if (isTapeRoom) {
    return (
      <View style={styles.container}>
        <Pressable style={styles.newButton} onPress={() => router.push('/community/new')}>
          <Text style={styles.newButtonText}>New post</Text>
        </Pressable>
        <ChannelTabs active={activeChannel} onChange={setActiveChannel} />
        {tapesQuery.isLoading ? (
          <Text style={styles.message}>Loading…</Text>
        ) : tapesQuery.error ? (
          <Text style={styles.message}>Could not load tapes.</Text>
        ) : (
          <FlatList
            data={tapesQuery.data ?? []}
            keyExtractor={(tape) => tape.id}
            renderItem={({ item }) => <TapeCard tape={item} onPress={() => router.push(`/community/tapes/${item.id}`)} />}
            ListEmptyComponent={<Text style={styles.message}>No tapes yet.</Text>}
          />
        )}
      </View>
    )
  }

  const posts = postsQuery.data?.pages.flatMap((page) => page.items) ?? []

  return (
    <View style={styles.container}>
      <Pressable style={styles.newButton} onPress={() => router.push('/community/new')}>
        <Text style={styles.newButtonText}>New post</Text>
      </Pressable>
      <ChannelTabs active={activeChannel} onChange={setActiveChannel} />
      {postsQuery.isLoading ? (
        <Text style={styles.message}>Loading…</Text>
      ) : postsQuery.error ? (
        <Text style={styles.message}>Could not load posts.</Text>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(post) => post.id}
          renderItem={({ item }) => <PostCard post={item} onPress={() => router.push(`/community/${item.id}`)} />}
          onEndReached={() => {
            if (postsQuery.hasNextPage && !postsQuery.isFetchingNextPage) postsQuery.fetchNextPage()
          }}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Text style={styles.message}>No posts yet.</Text>}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  message: { padding: spacing.lg, textAlign: 'center', color: colors.parchmentMuted },
  newButton: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingVertical: 12,
    alignItems: 'center',
  },
  newButtonText: { color: colors.primaryForeground, fontWeight: '600', fontSize: 15 },
})
