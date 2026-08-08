import { BrowserRouter, Routes, Route } from "react-router-dom";
import React, { Suspense } from "react";
import Layout from "./components/Layout";
import AdminPrompt from "./components/AdminPrompt";
import SeoManager from "./components/SeoManager";

// Create a simple loading component for lazy-loaded pages
const PageLoader = () => (
  <div className="w-full h-screen flex items-center justify-center">
    <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
  </div>
);

// Lazy load all the pages for route-based code splitting
const Login = React.lazy(() => import("./pages/Login"));
const Home = React.lazy(() => import("./pages/Home"));
const Import = React.lazy(() => import("./pages/Import"));
const Vocabulary = React.lazy(() => import("./pages/Vocabulary"));
const Practice = React.lazy(() => import("./pages/Practice"));
const TopicQuizzes = React.lazy(() => import("./pages/TopicQuizzes"));
const Quiz = React.lazy(() => import("./pages/Quiz"));
const Results = React.lazy(() => import("./pages/Results"));
const Quizzes = React.lazy(() => import("./pages/Quizzes"));
const Grammar = React.lazy(() => import("./pages/Grammar"));
const Statistics = React.lazy(() => import("./pages/Statistics"));
const Settings = React.lazy(() => import("./pages/Settings"));
const Library = React.lazy(() => import("./pages/Library"));
const LearningMaterials = React.lazy(() => import("./pages/LearningMaterials"));
const ReadingMaterials = React.lazy(() => import("./pages/ReadingMaterials"));
const ListeningMaterials = React.lazy(() => import("./pages/ListeningMaterials"));
const FalseFriends = React.lazy(() => import("./pages/FalseFriends"));
const Idioms = React.lazy(() => import("./pages/Idioms"));
const CreateQuiz = React.lazy(() => import("./pages/CreateQuiz"));
const PublicContentCategory = React.lazy(() => import("./pages/PublicContentCategory"));
const PublicAudioCategory = React.lazy(() => import("./pages/PublicAudioCategory"));
const GrammarCategory = React.lazy(() => import("./pages/GrammarCategory"));
const PrivateMaterials = React.lazy(() => import("./pages/PrivateMaterials"));
const ProtectedRoute = React.lazy(() => import("./components/ProtectedRoute"));
const Privacy = React.lazy(() => import("./pages/Privacy"));
const Terms = React.lazy(() => import("./pages/Terms"));
const About = React.lazy(() => import("./pages/About"));

// Main Application Router
export default function App() {
  return (
    <BrowserRouter>
      <SeoManager />
      <AdminPrompt />
      <Suspense fallback={<PageLoader />}>
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
            <Route path="/grammar/:categoryId" element={<GrammarCategory />} />
            <Route path="/quizzes" element={<Quizzes />} />
            <Route path="/quizzes/:topic" element={<TopicQuizzes />} />
            <Route path="/statistics" element={<Statistics />} />
            <Route path="/vocabulary" element={<Vocabulary />} />
            <Route path="/library" element={<Library />} />
            <Route path="/learning-materials" element={<LearningMaterials />} />
            <Route path="/learning-materials/reading" element={<ReadingMaterials />} />
            <Route path="/learning-materials/reading/false-friends" element={<FalseFriends />} />
            <Route path="/learning-materials/reading/idioms" element={<Idioms />} />
            <Route path="/learning-materials/reading/articles/:categoryId" element={<PublicContentCategory type="articles" />} />
            <Route path="/learning-materials/reading/interesting/:categoryId" element={<PublicContentCategory type="interesting" />} />
            <Route path="/learning-materials/reading/books/:categoryId" element={<PublicContentCategory type="books" />} />
            <Route path="/learning-materials/listening" element={<ListeningMaterials />} />
            <Route path="/learning-materials/listening/music/:categoryId" element={<PublicAudioCategory type="music" />} />
            <Route path="/learning-materials/listening/podcasts/:categoryId" element={<PublicAudioCategory type="podcasts" />} />
            <Route path="/learning-materials/listening/audiobooks/:categoryId" element={<PublicAudioCategory type="audiobooks" />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/about" element={<About />} />
            
            {/* Personalized sections requiring login */}
            <Route element={<ProtectedRoute />}>
              <Route path="/import" element={<Import />} />
              <Route path="/create-quiz" element={<CreateQuiz />} />
              <Route path="/learning-materials/private/reading" element={<PrivateMaterials type="reading" />} />
              <Route path="/learning-materials/private/listening" element={<PrivateMaterials type="listening" />} />
            </Route>
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}