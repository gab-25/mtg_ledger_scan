import { Route, Routes } from "react-router-dom";
import CameraScreen from "./screens/CameraScreen";
import ReviewScreen from "./screens/ReviewScreen";
import StartScreen from "./screens/StartScreen";

// Served by mtg_ledger_core for every page URL; the app routes on the client.
// Scan: /scan/ start, /scan/<uuid>/ camera, /scan/<uuid>/review/ review.
export default function App() {
  return (
    <Routes>
      <Route path="/scan" element={<StartScreen />} />
      <Route path="/scan/:uuid" element={<CameraScreen />} />
      <Route path="/scan/:uuid/review" element={<ReviewScreen />} />
    </Routes>
  );
}
