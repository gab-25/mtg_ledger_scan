import { BrowserRouter, Route, Routes } from "react-router-dom";
import CameraScreen from "./screens/CameraScreen";
import StartScreen from "./screens/StartScreen";

function Placeholder({ name }: { name: string }) {
  return <p className="empty">{name}</p>;
}

export default function App() {
  return (
    <BrowserRouter basename="/scan">
      <Routes>
        <Route path="/" element={<StartScreen />} />
        <Route path="/:uuid" element={<CameraScreen />} />
        <Route path="/:uuid/review" element={<Placeholder name="Review" />} />
      </Routes>
    </BrowserRouter>
  );
}
