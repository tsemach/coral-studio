import { Tabs } from 'expo-router'
import { colors } from '../../lib/theme'

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.ink },
        headerTitleStyle: { color: colors.parchment },
        headerTintColor: colors.parchment,
        tabBarStyle: { backgroundColor: colors.ink, borderTopColor: colors.hairline },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.parchmentMuted,
      }}
    >
      <Tabs.Screen name="workshops" options={{ title: 'Workshops', headerShown: false }} />
      <Tabs.Screen name="community" options={{ title: 'Community' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  )
}
