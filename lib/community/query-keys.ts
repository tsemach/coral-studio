import type { CommunityChannel, ReaderStatus } from './types'

export const communityKeys = {
  all: ['community'] as const,
  posts: () => [...communityKeys.all, 'posts'] as const,
  postsList: (channel?: CommunityChannel, status?: ReaderStatus) =>
    [...communityKeys.posts(), 'list', { channel: channel ?? null, status: status ?? null }] as const,
  postDetail: (postId: string) => [...communityKeys.all, 'post', postId] as const,
  comments: (postId: string) => [...communityKeys.all, 'comments', postId] as const,
  offers: (postId: string) => [...communityKeys.all, 'offers', postId] as const,
}
