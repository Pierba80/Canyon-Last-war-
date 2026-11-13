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
    <div className="min-h-screen flex flex-col relative">
      <audio ref={audioRef} src="/last-war-music.mp3" loop preload="auto" />

      <button
        type="button"
        onClick={toggleAudio}
        aria-label={isPlaying ? "Disattiva musica" : "Attiva musica"}
        className="fixed top-3 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900/90 hover:bg-gray-800 text-gray-100 text-xs font-medium border border-gray-700 shadow-lg backdrop-blur-sm transition-colors"
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

      <div className="flex-1">
        <Routes>
          <Route path="*" element={<Planner />} />
        </Routes>
      </div>

      <footer className="w-full py-2 text-center text-xs text-gray-400 bg-black/80 border-t border-gray-800">
        © 2026 Pīərbâ — Tutti i diritti riservati
      </footer>
    </div>
  );
}



