import { Routes, Route } from "react-router-dom";
import Planner from "@/pages/Planner";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
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

