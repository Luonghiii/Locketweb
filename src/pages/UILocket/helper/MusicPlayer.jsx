import { useRef, useEffect } from "react";

export function MusicPlayer({ music }) {
  const audioRef = useRef(null); // Luôn giữ là object { current: <audioElement> }

  useEffect(() => {
  let parsedMusic = music;
  if (typeof music === "string") {
    try {
      parsedMusic = JSON.parse(music);
    } catch (err) {
      console.error("Không parse được JSON:", err);
      return;
    }
  }

  console.log("Music object:", parsedMusic);

  const src =
    (Array.isArray(parsedMusic?.preview_url) && parsedMusic.preview_url[0]) ||
    parsedMusic?.preview_url ||
    parsedMusic?.preview_url_V2 ||
    parsedMusic?.audio;

  console.log("Audio src:", src);

  if (src && audioRef.current) {
    const audio = audioRef.current;
    audio.src = src;
    audio.muted = true;
    audio
      .play()
      .then(() => setTimeout(() => { audio.muted = false; }, 300))
      .catch(err => console.warn("Không thể auto-play:", err));
  }
}, [music]);

  return (
    <audio
      ref={audioRef}
      controls
      loop
      className="hidden" // nếu muốn ẩn thanh control thì thêm "hidden"
    />
  );
}
