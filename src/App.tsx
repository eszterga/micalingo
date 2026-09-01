import { BrowserRouter, Routes, Route, useLocation, Navigate, useParams } from "react-router-dom";
import React, { Suspense } from "react";
import Layout from "./components/Layout";
import AdminPrompt from "./components/AdminPrompt";
import SeoManager from "./components/SeoManager";
import CookieBanner from "./components/CookieBanner";
import AdController from "./components/AdController";

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
const Learn = React.lazy(() => import("./pages/Learn"));
const LearnGuide = React.lazy(() => import("./pages/LearnGuide"));
const Cookies = React.lazy(() => import("./pages/Cookies"));
const Impressum = React.lazy(() => import("./pages/Impressum"));

function PracticeTopicRedirect() {
  const { topic } = useParams();
  return <Navigate to={topic ? `/quizzes/${topic}` : '/quizzes'} replace />;
}

function AppRoutes() {
  const location = useLocation();
  // GitHub Pages serves /quizzes/ (200) and 301s /quizzes. Match both
  // without a client redirect, which Google would also treat as a redirect.
  const normalizedLocation = {
    ...location,
    pathname: location.pathname.replace(/\/+$/, '') || '/',
  };

  return (
    <Routes location={normalizedLocation}>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        {/* Publicly shared sections */}
        <Route path="/" element={<Home />} />
        <Route path="/practice" element={<Navigate to="/quizzes" replace />} />
        <Route path="/practice/:topic" element={<PracticeTopicRedirect />} />
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
        <Route path="/learn" element={<Learn />} />
        <Route path="/learn/german-exam-prep" element={<Navigate to="/learn/public-and-private" replace />} />
        <Route path="/learn/:slug" element={<LearnGuide />} />
        <Route path="/cookies" element={<Cookies />} />
        <Route path="/impressum" element={<Impressum />} />

        {/* Personalized sections requiring login */}
        <Route element={<ProtectedRoute />}>
          <Route path="/import" element={<Import />} />
          <Route path="/create-quiz" element={<CreateQuiz />} />
          <Route path="/learning-materials/private/reading" element={<PrivateMaterials type="reading" />} />
          <Route path="/learning-materials/private/listening" element={<PrivateMaterials type="listening" />} />
        </Route>
      </Route>
    </Routes>
  );
}

// Main Application Router
export default function App() {
  return (
    <BrowserRouter>
      <SeoManager />
      <AdminPrompt />
      <AdController />
      <CookieBanner />
      <Suspense fallback={<PageLoader />}>
        <AppRoutes />
      </Suspense>
    </BrowserRouter>
  );
}