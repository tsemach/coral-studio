import { Stack } from 'expo-router'
import { colors } from '../../../lib/theme'

export default function CommunityStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.parchment,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Community' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
      <Stack.Screen name="tapes/[tapeId]" options={{ title: '' }} />
      <Stack.Screen name="new" options={{ title: 'New post' }} />
    </Stack>
  )
}
