export function getVideoDuration(file: File | Blob): Promise<number | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    const url = URL.createObjectURL(file)

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      const duration = Number.isFinite(video.duration) ? Math.round(video.duration) : null
      resolve(duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }

    video.src = url
  })
}
