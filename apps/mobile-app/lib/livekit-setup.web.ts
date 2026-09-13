// LiveKit's native module (@livekit/react-native-webrtc) calls
// requireNativeComponent at import time, which react-native-web does not
// implement -- importing @livekit/react-native at all on web crashes the
// whole app before a single screen renders. This no-op keeps the web
// target (this app's only automated verification channel) working; live
// video itself isn't available there -- see workshop-video-room.web.tsx.
export {}
