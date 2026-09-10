import { useState } from 'react'
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import { useRouter } from 'expo-router'
import { useMutation } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { put } from '@vercel/blob/client'
import { apiClient } from '../../../../lib/api'
import { colors, radius, spacing } from '../../../../lib/theme'

type PickedVideo = { uri: string; name: string; type: string; durationSeconds: number | null }

export default function NewTapeScreen() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [video, setVideo] = useState<PickedVideo | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!video) throw new Error('Choose a video first.')

      setUploadProgress(0)
      const { token, pathname: requestedPathname } = await apiClient.requestTapeUploadToken(video.name)

      const response = await fetch(video.uri)
      const blob = await response.blob()

      const uploaded = await put(requestedPathname, blob, {
        access: 'private',
        token,
        contentType: video.type,
        onUploadProgress: (event) => setUploadProgress(event.percentage),
      })

      return apiClient.createTape({
        title: title.trim(),
        description: description.trim(),
        videoPathname: uploaded.pathname,
        durationSeconds: video.durationSeconds,
      })
    },
    onSuccess: (tape) => router.replace(`/community/tapes/${tape.id}`),
    onError: (err) => {
      setUploadProgress(null)
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    },
  })

  async function pickVideo() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setError('Photo library permission is required to choose a video.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 1,
    })
    if (result.canceled || result.assets.length === 0) return
    const asset = result.assets[0]
    setVideo({
      uri: asset.uri,
      name: asset.fileName ?? 'tape.mp4',
      type: asset.mimeType ?? 'video/mp4',
      durationSeconds: asset.duration ? Math.round(asset.duration / 1000) : null,
    })
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Title</Text>
      <TextInput
        style={styles.input}
        placeholder="Scene title"
        placeholderTextColor={colors.parchmentMuted}
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Description</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        placeholder="What's the scene, who's in it..."
        placeholderTextColor={colors.parchmentMuted}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <Text style={styles.label}>Video</Text>
      <Pressable style={styles.pickButton} onPress={pickVideo}>
        <Text style={styles.pickButtonText}>{video ? video.name : 'Choose a video from your library'}</Text>
      </Pressable>
      {Platform.OS === 'web' ? (
        <Text style={styles.hint}>Recording directly is only available in the installed app, not this web preview.</Text>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {uploadProgress !== null ? <Text style={styles.hint}>Uploading… {Math.round(uploadProgress)}%</Text> : null}

      <Pressable
        style={styles.button}
        onPress={() => mutation.mutate()}
        disabled={!title.trim() || !description.trim() || !video || mutation.isPending}
      >
        {mutation.isPending ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={styles.buttonText}>Upload tape</Text>}
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.ink, padding: spacing.md, gap: spacing.sm },
  label: { color: colors.parchmentMuted, fontSize: 13, marginTop: spacing.sm },
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
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  pickButton: { borderWidth: 1, borderColor: colors.hairline, borderRadius: radius, paddingVertical: 12, alignItems: 'center' },
  pickButtonText: { color: colors.accent, fontWeight: '600', fontSize: 14 },
  hint: { color: colors.parchmentMuted, fontSize: 12 },
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
