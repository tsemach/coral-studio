'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'

export type TapeRecorderHandle = { stopCamera: () => void }

export const TapeRecorder = forwardRef<TapeRecorderHandle, { onRecorded: (file: File) => void }>(
  function TapeRecorder({ onRecorded }, ref) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const recorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const [isActive, setIsActive] = useState(false)
    const [isRecording, setIsRecording] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
      return () => {
        streamRef.current?.getTracks().forEach((track) => track.stop())
      }
    }, [])

    async function startCamera() {
      setError(null)
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
        }
        setIsActive(true)
      } catch {
        setError('Could not access your camera and microphone. Check your browser permissions.')
      }
    }

    function stopCamera() {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setIsActive(false)
      setIsRecording(false)
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
        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm'
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const file = new File([blob], `recording-${Date.now()}.${extension}`, { type: mimeType })
        onRecorded(file)
        stopCamera()
      }
      recorderRef.current = recorder
      recorder.start()
      setIsRecording(true)
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
          <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-lg bg-black aspect-video" />
        )}

        <div className="flex gap-2">
          {!isActive && (
            <button
              type="button"
              onClick={startCamera}
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
