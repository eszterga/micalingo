import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Import from "./pages/Import";
import Vocabulary from "./pages/Vocabulary";
import Quiz from "./pages/Quiz";
import Results from "./pages/Results";
import Collections from "./pages/Collections";
import Grammar from "./pages/Grammar";
import Statistics from "./pages/Statistics";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <BrowserRouter basename="/micalingo">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            {/* Publicly shared sections */}
            <Route path="/" element={<Home />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/results" element={<Results />} />
            <Route path="/grammar" element={<Grammar />} />
            <Route path="/collections" element={<Collections />} />
            <Route path="/statistics" element={<Statistics />} />
            
            {/* Personalized sections requiring login */}
            <Route element={<ProtectedRoute />}>
              <Route path="/import" element={<Import />} />
              <Route path="/vocabulary" element={<Vocabulary />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}