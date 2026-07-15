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
import Library from "./pages/Library";
import LearningMaterials from "./pages/LearningMaterials";
import ReadingMaterials from "./pages/ReadingMaterials";
import ListeningMaterials from "./pages/ListeningMaterials";
import FalseFriends from "./pages/FalseFriends";
import CreateQuiz from "./pages/CreateQuiz";
import PublicContentCategory from "./pages/PublicContentCategory";
import PublicAudioCategory from "./pages/PublicAudioCategory";
import PrivateMaterials from "./pages/PrivateMaterials";

// Main Application Router
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
            <Route path="/quizzes/:topic" element={<TopicQuizzes />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/vocabulary" element={<Vocabulary />} />
            <Route path="/library" element={<Library />} />
            <Route path="/learning-materials" element={<LearningMaterials />} />
            <Route path="/learning-materials/reading" element={<ReadingMaterials />} />
            <Route path="/learning-materials/reading/false-friends" element={<FalseFriends />} />
            <Route path="/learning-materials/reading/articles/:categoryId" element={<PublicContentCategory type="articles" />} />
            <Route path="/learning-materials/reading/books/:categoryId" element={<PublicContentCategory type="books" />} />
            <Route path="/learning-materials/listening" element={<ListeningMaterials />} />
            <Route path="/learning-materials/listening/music/:categoryId" element={<PublicAudioCategory type="music" />} />
            <Route path="/learning-materials/listening/podcasts/:categoryId" element={<PublicAudioCategory type="podcasts" />} />
            <Route path="/learning-materials/listening/audiobooks/:categoryId" element={<PublicAudioCategory type="audiobooks" />} />
            <Route path="/settings" element={<Settings />} />
            
            {/* Personalized sections requiring login */}
            <Route element={<ProtectedRoute />}>
              <Route path="/import" element={<Import />} />
              <Route path="/create-quiz" element={<CreateQuiz />} />
              <Route path="/learning-materials/private/reading" element={<PrivateMaterials type="reading" />} />
              <Route path="/learning-materials/private/listening" element={<PrivateMaterials type="listening" />} />
            </Route>
          </Route>
        </Routes>
      </AuthProvider>
    </HashRouter>
  );
}