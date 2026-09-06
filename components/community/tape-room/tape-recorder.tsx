'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

export type TapeRecorderHandle = { stopCamera: () => void }

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export const TapeRecorder = forwardRef<TapeRecorderHandle, { onRecorded: (file: File) => void }>(
  function TapeRecorder({ onRecorded }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const recorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const [isActive, setIsActive] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
    const [selectedDeviceId, setSelectedDeviceId] = useState('')
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    useEffect(() => {
      return () => {
        streamRef.current?.getTracks().forEach((track) => track.stop())
        if (timerRef.current) clearInterval(timerRef.current)
      }
    }, [])

    // The <video> element only mounts once isActive is true, so it doesn't
    // exist yet at the point openCamera() resolves -- wiring srcObject here,
    // keyed on isActive, runs after that element is actually in the DOM.
    useEffect(() => {
      if (isActive && videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current
      }
    }, [isActive])

    // Device labels are blank until getUserMedia has been granted at least
    // once, so this is only useful (and only called) after a stream exists.
    async function refreshDevices() {
      const all = await navigator.mediaDevices.enumerateDevices()
      setDevices(all.filter((d) => d.kind === 'videoinput'))
    }

    async function openCamera(deviceId?: string) {
      setError(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: deviceId ? { deviceId: { exact: deviceId } } : true,
          audio: true,
        })
        streamRef.current?.getTracks().forEach((track) => track.stop())
        streamRef.current = stream
        setIsActive(true)
        // Covers switching devices while already active: the effect below
        // only re-runs on isActive changing, which switching a device
        // doesn't trigger. On the very first activation videoRef.current is
        // still null here (the <video> element hasn't mounted yet), so that
        // effect is what handles this assignment instead.
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        await refreshDevices()
        const activeDeviceId = stream.getVideoTracks()[0]?.getSettings().deviceId
        if (activeDeviceId) setSelectedDeviceId(activeDeviceId)
      } catch {
        setError('Could not access your camera and microphone. Check your browser permissions.')
      }
    }

    function stopCamera() {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setIsActive(false)
      setIsRecording(false)
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
      setElapsedSeconds(0)
    }

    useImperativeHandle(ref, () => ({ stopCamera }))

    function startRecording() {
      if (!streamRef.current) return
      chunksRef.current = []
      const recorder = new MediaRecorder(streamRef.current)
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'video/webm'
        const baseMimeType = mimeType.split(';')[0]
        const extension = baseMimeType.includes('mp4') ? 'mp4' : 'webm'
        const blob = new Blob(chunksRef.current, { type: baseMimeType })
        const file = new File([blob], `recording-${Date.now()}.${extension}`, { type: baseMimeType })
        onRecorded(file)
        stopCamera()
      }
      recorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
      setElapsedSeconds(0)
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000)
    }

    function stopRecording() {
      recorderRef.current?.stop()
    }

    return (
      <div className="space-y-2">
        {error && (
          <p className="rounded-lg bg-red-500/15 border border-red-500/30 p-2.5 text-xs text-red-200">{error}</p>
        )}

        {isActive && (
          <>
            {isRecording && (
              <div className="flex justify-end">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-red-600/20 px-2 py-0.5 text-xs font-medium text-red-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  {formatTime(elapsedSeconds)}
                </span>
              </div>
            )}
            <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-lg bg-black aspect-video" />

            {devices.length > 1 && (
              <select
                value={selectedDeviceId}
                onChange={(e) => openCamera(e.target.value)}
                disabled={isRecording}
                className="w-full rounded-lg border border-ink-foreground/16 bg-ink px-2.5 py-1.5 text-xs text-ink-foreground focus:outline-none disabled:opacity-50"
              >
                {devices.map((device, i) => (
                  <option key={device.deviceId} value={device.deviceId}>
                    {device.label || `Camera ${i + 1}`}
                  </option>
                ))}
              </select>
            )}
          </>
        )}

        <div className="flex gap-2">
          {!isActive && (
            <button
              type="button"
              onClick={() => openCamera()}
              className="rounded-lg border border-ink-foreground/20 bg-ink px-3 py-1.5 text-xs font-medium text-ink-foreground hover:bg-ink-card transition-colors cursor-pointer"
            >
              Turn on camera
            </button>
          )}
          {isActive && !isRecording && (
            <button
              type="button"
              onClick={startRecording}
              className="rounded-lg bg-red-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-600 transition-colors cursor-pointer"
            >
              ● Start recording
            </button>
          )}
          {isRecording && (
            <button
              type="button"
              onClick={stopRecording}
              className="rounded-lg bg-ink-foreground/15 px-3 py-1.5 text-xs font-medium text-ink-foreground hover:bg-ink-foreground/25 transition-colors cursor-pointer"
            >
              ■ Stop recording
            </button>
          )}
          {isActive && !isRecording && (
            <button
              type="button"
              onClick={stopCamera}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-ink-foreground/60 hover:text-ink-foreground transition-colors cursor-pointer"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    )
  }
)
