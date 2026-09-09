import { StyleSheet, Text, View } from 'react-native'

export default function CommunityPlaceholderScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Community is coming soon.</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  text: { color: '#666', fontSize: 16, textAlign: 'center' },
})
