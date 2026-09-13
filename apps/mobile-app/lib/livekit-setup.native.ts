import { registerGlobals } from '@livekit/react-native'

// Must run once, before any LiveKit component/hook is used anywhere in the
// app -- sets up the WebRTC globals the JS layer needs. Only imported by
// _layout.tsx via the extension-less '../lib/livekit-setup' path -- Metro
// resolves this .native.ts file for iOS/Android automatically.
registerGlobals()
