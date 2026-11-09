import { useEffect, useRef, useState } from "react";

const UNAVAILABLE = "Camera not available (HTTPS and permission are required). Use Search.";

/** The rear camera streamed into a <video>. */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let cancelled = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(UNAVAILABLE);
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 } }, audio: false })
      .then((s) => {
        if (cancelled) return s.getTracks().forEach((t) => t.stop());
        stream = s;
        keepFocusing(s);
        const video = videoRef.current;
        if (video) {
          video.srcObject = s;
          video.onloadedmetadata = () => setReady(true);
        }
      })
      .catch(() => setError(UNAVAILABLE));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return { videoRef, ready, error };
}

/** Ask for continuous autofocus where supported (Chrome on Android); a card held close otherwise often stays blurred. */
function keepFocusing(stream: MediaStream) {
  const track = stream.getVideoTracks()[0];
  const modes = (track?.getCapabilities?.() as { focusMode?: string[] } | undefined)?.focusMode;
  if (!modes?.includes("continuous")) return;
  track.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => {});
}
