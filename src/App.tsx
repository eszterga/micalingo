import { HashRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./AuthContext";
import { I18nProvider } from "./I18nContext";
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
import CreateQuiz from "./pages/CreateQuiz";
import Quizzes from "./pages/Quizzes";
import Grammar from "./pages/Grammar";
import Statistics from "./pages/Statistics";
import Settings from "./pages/Settings";
import Library from "./pages/Library";
import LearningMaterials from "./pages/LearningMaterials";
import ReadingMaterials from "./pages/ReadingMaterials";
import FalseFriends from "./pages/FalseFriends";

export default function App() {
  return (
    <HashRouter>
      <I18nProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route element={<Layout />}>
              {/* Personalized sections requiring login */}
              <Route element={<ProtectedRoute />}>
                <Route path="/import" element={<Import />} />
                <Route path="/create-quiz" element={<CreateQuiz />} />
              </Route>

              {/* Publicly shared sections */}
              <Route path="/" element={<Home />} />
              <Route path="/practice" element={<Practice />} />
              <Route path="/practice/:topic" element={<TopicQuizzes />} />
              <Route path="/quizzes/:topic" element={<TopicQuizzes />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/results" element={<Results />} />
              <Route path="/library" element={<Library />} />
              <Route path="/learning-materials" element={<LearningMaterials />} />
              <Route path="/learning-materials/reading" element={<ReadingMaterials />} />
              <Route path="/learning-materials/reading/false-friends" element={<FalseFriends />} />
              <Route path="/grammar" element={<Grammar />} />
              <Route path="/quizzes" element={<Quizzes />} />
              <Route path="/statistics" element={<Statistics />} />
              <Route path="/vocabulary" element={<Vocabulary />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Routes>
        </AuthProvider>
      </I18nProvider>
    </HashRouter>
  );
}