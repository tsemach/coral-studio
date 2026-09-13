import { useLocalSearchParams, useRouter } from 'expo-router'
import { RehearsalVideoRoom } from '../../../../components/rehearsal-video-room'

export default function RehearsalLiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  return <RehearsalVideoRoom postId={id} onLeave={() => router.back()} />
}
