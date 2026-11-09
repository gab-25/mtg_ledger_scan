import { BrowserRouter, Route, Routes } from "react-router-dom";
import CameraScreen from "./screens/CameraScreen";
import ReviewScreen from "./screens/ReviewScreen";
import StartScreen from "./screens/StartScreen";

// Served by mtg_ledger_core at /scan/...: /scan/ start, /scan/<uuid>/ camera, /scan/<uuid>/review/ review.
export default function App() {
  return (
    <BrowserRouter basename="/scan">
      <Routes>
        <Route path="/" element={<StartScreen />} />
        <Route path="/:uuid" element={<CameraScreen />} />
        <Route path="/:uuid/review" element={<ReviewScreen />} />
      </Routes>
    </BrowserRouter>
  );
}
