import { Route, Routes } from "react-router-dom";
import Layout from "./layout/Layout";
import CollectionPage from "./pages/CollectionPage";
import ImportPage from "./pages/ImportPage";
import ItemFormPage from "./pages/ItemFormPage";
import ListingFormPage from "./pages/ListingFormPage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import SalePage from "./pages/SalePage";
import CameraScreen from "./screens/CameraScreen";
import ReviewScreen from "./screens/ReviewScreen";
import StartScreen from "./screens/StartScreen";

// Served by mtg_ledger_core for every page URL; the app routes on the client. Page URLs are the ones of the
// former Django pages. Scan: /scan/ start, /scan/<uuid>/ camera, /scan/<uuid>/review/ review (no sidebar).
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/scan" element={<StartScreen />} />
      <Route path="/scan/:uuid" element={<CameraScreen />} />
      <Route path="/scan/:uuid/review" element={<ReviewScreen />} />
      <Route element={<Layout />}>
        <Route path="/" element={<CollectionPage />} />
        <Route path="/cards/add" element={<ItemFormPage />} />
        <Route path="/cards/import" element={<ImportPage />} />
        <Route path="/cards/:pk" element={<ItemFormPage />} />
        <Route path="/sale" element={<SalePage />} />
        <Route path="/sale/:itemPk" element={<ListingFormPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
