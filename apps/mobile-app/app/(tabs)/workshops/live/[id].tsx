import { useLocalSearchParams, useRouter } from 'expo-router'
import { WorkshopVideoRoom } from '../../../../components/workshop-video-room'

export default function WorkshopLiveScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()

  return <WorkshopVideoRoom workshopId={id} onLeave={() => router.back()} />
}
