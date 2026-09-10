import { useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import type { CommunityChannel, CastingType, RehearsalFormat } from '@coral-studio/types'
import { apiClient } from '../../../lib/api'
import { colors, radius, spacing } from '../../../lib/theme'

const CHANNELS: { id: CommunityChannel; label: string }[] = [
  { id: 'reader_sos', label: 'Reader SOS' },
  { id: 'callboard', label: 'Callboard' },
  { id: 'craft_chat', label: 'Craft chat' },
  { id: 'general', label: 'General' },
]

const CASTING_TYPES: CastingType[] = ['student_film', 'theatre', 'feature', 'commercial', 'crew_rec']
const REHEARSAL_FORMATS: RehearsalFormat[] = ['studio', 'online']

type PickedImage = { uri: string; name: string; type: string }

export default function NewPostScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [channel, setChannel] = useState<CommunityChannel>('general')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [rehearsalAt, setRehearsalAt] = useState('')
  const [rehearsalFormat, setRehearsalFormat] = useState<RehearsalFormat | null>(null)
  const [sceneDetails, setSceneDetails] = useState('')
  const [castingType, setCastingType] = useState<CastingType | null>(null)
  const [deadlineAt, setDeadlineAt] = useState('')
  const [images, setImages] = useState<PickedImage[]>([])
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      apiClient.createCommunityPost({
        channel,
        title: title.trim(),
        content: content.trim(),
        rehearsalAt: channel === 'reader_sos' && rehearsalAt.trim() ? new Date(rehearsalAt.trim()).toISOString() : undefined,
        rehearsalFormat: channel === 'reader_sos' ? rehearsalFormat ?? undefined : undefined,
        sceneDetails: channel === 'reader_sos' && sceneDetails.trim() ? sceneDetails.trim() : undefined,
        castingType: channel === 'callboard' ? castingType ?? undefined : undefined,
        deadlineAt: channel === 'callboard' && deadlineAt.trim() ? new Date(deadlineAt.trim()).toISOString() : undefined,
        attachments: images,
      }),
    onSuccess: (post) => {
      // Invalidate the ['community-posts', channel] prefix (an infinite query) so the
      // feed screen refetches and shows this new post on return, no matter which
      // channel filter was active — matches every channel variant by default partial-key matching.
      queryClient.invalidateQueries({ queryKey: ['community-posts'] })
      router.replace(`/community/${post.id}`)
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Something went wrong.'),
  })

  async function pickImages() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setError('Photo library permission is required to attach images.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.8,
    })
    if (result.canceled) return
    setImages(
      result.assets.map((asset, index) => ({
        uri: asset.uri,
        name: asset.fileName ?? `photo-${index}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      }))
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.label}>Channel</Text>
      <View style={styles.channelRow}>
        {CHANNELS.map((c) => (
          <Pressable
            key={c.id}
            style={[styles.channelOption, channel === c.id && styles.channelOptionActive]}
            onPress={() => setChannel(c.id)}
          >
            <Text style={styles.channelOptionText}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Title"
        placeholderTextColor={colors.parchmentMuted}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Content</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="What's on your mind?"
        placeholderTextColor={colors.parchmentMuted}
        value={content}
        onChangeText={setContent}
        multiline
      />

      {channel === 'reader_sos' ? (
        <View style={styles.section}>
          <Text style={styles.label}>Rehearsal date/time (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-10-01T18:00"
            placeholderTextColor={colors.parchmentMuted}
            value={rehearsalAt}
            onChangeText={setRehearsalAt}
          />
          <Text style={styles.label}>Format</Text>
          <View style={styles.channelRow}>
            {REHEARSAL_FORMATS.map((format) => (
              <Pressable
                key={format}
                style={[styles.channelOption, rehearsalFormat === format && styles.channelOptionActive]}
                onPress={() => setRehearsalFormat(format)}
              >
                <Text style={styles.channelOptionText}>{format}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Scene details (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Which scene, characters, etc."
            placeholderTextColor={colors.parchmentMuted}
            value={sceneDetails}
            onChangeText={setSceneDetails}
          />
        </View>
      ) : null}

      {channel === 'callboard' ? (
        <View style={styles.section}>
          <Text style={styles.label}>Casting type</Text>
          <View style={styles.channelRow}>
            {CASTING_TYPES.map((type) => (
              <Pressable
                key={type}
                style={[styles.channelOption, castingType === type && styles.channelOptionActive]}
                onPress={() => setCastingType(type)}
              >
                <Text style={styles.channelOptionText}>{type.replace('_', ' ')}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Deadline (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-10-15"
            placeholderTextColor={colors.parchmentMuted}
            value={deadlineAt}
            onChangeText={setDeadlineAt}
          />
        </View>
      ) : null}

      <Text style={styles.label}>Images (optional, up to 4)</Text>
      <Pressable style={styles.pickButton} onPress={pickImages}>
        <Text style={styles.pickButtonText}>Choose photos</Text>
      </Pressable>
      {images.length > 0 ? (
        <View style={styles.previewRow}>
          {images.map((image) => (
            <Image key={image.uri} source={{ uri: image.uri }} style={styles.previewImage} />
          ))}
        </View>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Pressable
        style={styles.button}
        onPress={() => mutation.mutate()}
        disabled={!title.trim() || !content.trim() || mutation.isPending}
      >
        {mutation.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.buttonText}>Post</Text>}
      </Pressable>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink },
  content: { padding: spacing.md, gap: spacing.sm },
  label: { color: colors.parchmentMuted, fontSize: 13, marginTop: spacing.sm },
  section: { gap: spacing.sm },
  input: {
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.parchment,
    fontSize: 16,
  },
  multiline: { minHeight: 100, textAlignVertical: 'top' },
  channelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  channelOption: {
    backgroundColor: colors.inkCard,
    borderWidth: 1,
    borderColor: colors.hairline,
    borderRadius: radius,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  channelOptionActive: { borderColor: colors.accent },
  channelOptionText: { color: colors.parchment, fontSize: 13 },
  pickButton: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 10, alignItems: 'center' },
  pickButtonText: { color: colors.accent, fontWeight: '600', fontSize: 14 },
  previewRow: { flexDirection: 'row', gap: spacing.xs },
  previewImage: { width: 64, height: 64, borderRadius: radius },
  error: { color: colors.accent, fontSize: 14 },
  button: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    borderRadius: radius,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonText: { color: colors.primaryForeground, fontWeight: '600', fontSize: 16 },
})
