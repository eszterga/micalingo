import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Home from "./pages/Home";
import Import from "./pages/Import";
import Vocabulary from "./pages/Vocabulary";
import Practice from "./pages/Practice";
import TopicQuizzes from "./pages/TopicQuizzes";
import Quiz from "./pages/Quiz";
import Results from "./pages/Results";
import Quizzes from "./pages/Quizzes";
import Grammar from "./pages/Grammar";
import Statistics from "./pages/Statistics";
import Settings from "./pages/Settings";

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<Layout />}>
            {/* Publicly shared sections */}
            <Route path="/" element={<Home />} />
            <Route path="/practice" element={<Practice />} />
            <Route path="/practice/:topic" element={<TopicQuizzes />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/results" element={<Results />} />
            <Route path="/grammar" element={<Grammar />} />
            <Route path="/quizzes" element={<Quizzes />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/vocabulary" element={<Vocabulary />} />
            
            {/* Personalized sections requiring login */}
            <Route element={<ProtectedRoute />}>
              <Route path="/import" element={<Import />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}