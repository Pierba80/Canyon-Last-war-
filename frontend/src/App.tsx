import { useRef, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { Volume2, VolumeX } from "lucide-react";
import Planner from "@/pages/Planner";

export default function App() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.volume = 0.4;
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <audio ref={audioRef} src="/last-war-music.mp3" loop preload="auto" />

      <div className="flex-1">
        <Routes>
          <Route path="*" element={<Planner />} />
        </Routes>
      </div>

      <footer className="w-full px-4 py-2 flex items-center justify-between text-xs text-gray-400 bg-black/85 border-t border-gray-800">
        <span>© 2026 Pīərbâ — Tutti i diritti riservati</span>

        <button
          type="button"
          onClick={toggleAudio}
          aria-label={isPlaying ? "Disattiva musica" : "Attiva musica"}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-gray-200 transition-colors"
        >
          {isPlaying ? (
            <>
              <Volume2 className="size-4 text-emerald-400" />
              <span>Audio ON</span>
            </>
          ) : (
            <>
              <VolumeX className="size-4 text-gray-400" />
              <span>Audio OFF</span>
            </>
          )}
        </button>
      </footer>
    </div>
  );
}


