import { Stack } from 'expo-router'
import { colors } from '../../../lib/theme'

export default function WorkshopsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTintColor: colors.parchment,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Workshops' }} />
      <Stack.Screen name="[id]" options={{ title: '' }} />
    </Stack>
  )
}
