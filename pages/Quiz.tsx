import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useCloudVocabulary } from "../lib/firestore";
import { publicVocabulary, publicPhrases, publicArticles, PublicWord } from "../lib/public-data";

interface Question {
  questionText: string;
  options: string[];
  correctAnswer: string;
}

export default function Quiz() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const topic = searchParams.get("topic");
  const quizId = parseInt(searchParams.get("quizId") || "1", 10);
  const userVocabulary = useCloudVocabulary(user?.uid);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizState, setQuizState] = useState<'loading' | 'ongoing' | 'finished'>('loading');

  // Capitalize the first letter of the topic for the title
  const topicName = topic ? topic.charAt(0).toUpperCase() + topic.slice(1) : "Personal";
  const pageTitle = `${topicName} Quiz ${quizId}`;

  const generateQuestions = (words: PublicWord[]) => {
    // For structured topics, we don't shuffle the outer array, we just take the chunk.
    // We only shuffle the actual question options.
    const selectedWords = [...words];

    return selectedWords.map(word => {
      if (topic === 'articles') {
        const baseArticle = word.hungarian.toLowerCase().trim(); // "der", "die", or "das"
        
        // All grammatically possible forms for the noun's gender across all 4 cases
        const validForms = {
          "der": ["der", "den", "dem", "des", "ein", "einen", "einem", "eines", "kein", "keinen", "keinem", "keines"],
          "die": ["die", "der", "eine", "einer", "keine", "keiner"],
          "das": ["das", "dem", "des", "ein", "einem", "eines", "kein", "keinem", "keines"]
        };

        // All forms that are NEVER grammatically possible for the noun's gender
        const invalidForms = {
          "der": ["die", "das", "eine", "einer", "keine", "keiner"],
          "die": ["das", "den", "dem", "des", "ein", "einen", "einem", "eines", "kein", "keinen", "keinem", "keines"],
          "das": ["der", "die", "den", "eine", "einer", "einen", "keine", "keiner", "keinen"]
        };
        
        // Pick ONE valid form to be the correct answer
        const possibleCorrect = validForms[baseArticle as keyof typeof validForms] || [baseArticle];
        const correctAnswer = possibleCorrect[Math.floor(Math.random() * possibleCorrect.length)];

        // Pick THREE strictly invalid forms as distractors
        let distractorPool = [...(invalidForms[baseArticle as keyof typeof invalidForms] || [])];
        distractorPool.sort(() => 0.5 - Math.random());
        const distractors = distractorPool.slice(0, 3);

        const options = [...distractors, correctAnswer].sort(() => 0.5 - Math.random());

        return {
          questionText: `___ ${word.german}`, // e.g., "___ Mann"
          options,
          correctAnswer,
        };
      } else {
        // Standard logic for vocabulary and phrases
        const correctAnswer = word.hungarian;
        let distractors = words
          .filter(d => d.hungarian !== correctAnswer)
          .slice(0, 3)
          .map(d => d.hungarian);

        // Ensure we have 3 distractors
        while (distractors.length < 3) {
          const randomWord = words[Math.floor(Math.random() * words.length)];
          if (randomWord.hungarian !== correctAnswer && !distractors.includes(randomWord.hungarian)) {
            distractors.push(randomWord.hungarian);
          }
        }

        const options = [...distractors, correctAnswer].sort(() => 0.5 - Math.random());

        return {
          questionText: word.german,
          options,
          correctAnswer,
        };
      }
    });
  };

  useEffect(() => {
    let sourceData: PublicWord[] = [];
    if (topic === 'vocabulary') {
      sourceData = publicVocabulary;
    } else if (topic === 'phrases') {
      sourceData = publicPhrases;
    } else if (topic === 'articles') {
      sourceData = publicArticles;
    } else if (userVocabulary) {
      // If no topic, use user's personal vocabulary
      sourceData = userVocabulary;
    }

    if (sourceData.length > 0) {
      // Slice the exact 20 words for the current quiz level
      const WORDS_PER_QUIZ = 20;
      const startIndex = (quizId - 1) * WORDS_PER_QUIZ;
      const endIndex = startIndex + WORDS_PER_QUIZ;
      
      // Use the slice for public topics, or shuffle user's personal cloud data
      let wordsForQuiz = topic 
        ? sourceData.slice(startIndex, endIndex).sort(() => 0.5 - Math.random()) 
        : [...sourceData].sort(() => 0.5 - Math.random()).slice(0, WORDS_PER_QUIZ);
      
      if (wordsForQuiz.length < 4) {
        setQuizState('finished'); // No more words left for this level
        return;
      }

      const newQuestions = generateQuestions(wordsForQuiz);
      setQuestions(newQuestions);
      setQuizState(newQuestions.length > 0 ? 'ongoing' : 'loading');
    }
  }, [topic, userVocabulary, quizId]);

  const finishQuiz = (finalScore: number) => {
    // Save progress so the Topic Lists checkmarks update correctly
    const key = 'micalingo_guest_scores';
    const scores = JSON.parse(localStorage.getItem(key) || '{}');
    scores[`${topic || 'custom'}_${quizId}`] = finalScore;
    localStorage.setItem(key, JSON.stringify(scores));

    setQuizState('finished');
  };

  const handleAnswer = (answer: string) => {
    if (isAnswered) return;
    setSelectedAnswer(answer);
    setIsAnswered(true);
    
    const isCorrect = answer === questions[currentQuestionIndex].correctAnswer;
    
    if (isCorrect) {
      setScore(s => s + 1);
      
      // Auto-advance after 1 second so the user sees the green success state
      setTimeout(() => {
        setIsAnswered(false);
        setSelectedAnswer(null);
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(i => i + 1);
        } else {
          finishQuiz(score + 1);
        }
      }, 1000);
    }
  };

  const handleNext = () => {
    setIsAnswered(false);
    setSelectedAnswer(null);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(i => i + 1);
    } else {
      finishQuiz(score); // Called manually only on wrong answers, so the score is unchanged
    }
  };

  const handleNextQuiz = () => {
    // Instantly navigate and reset state for the next chunk
    navigate(`/quiz?topic=${topic || ''}&quizId=${quizId + 1}`);
    setQuizState('loading');
    setScore(0);
    setCurrentQuestionIndex(0);
    setIsAnswered(false);
    setSelectedAnswer(null);
  };

  const currentQuestion = questions[currentQuestionIndex];

  if (quizState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
        <p className="text-gray-500">Loading your questions...</p>
      </div>
    );
  }

  if (quizState === 'finished' || !currentQuestion) {
    return (
      <div className="text-center bg-white p-8 rounded-xl shadow-sm border">
        <h2 className="text-2xl font-bold mb-4">Quiz Complete!</h2>
        {questions.length > 0 ? (
          <p className="text-lg">Your score: <span className="font-bold text-blue-600">{score}</span> / {questions.length}</p>
        ) : (
          <p className="text-lg text-gray-600">You have completed all available quizzes for this topic!</p>
        )}
        <div className="mt-8 flex justify-center gap-4">
          <button onClick={() => window.location.reload()} className="bg-gray-100 text-gray-700 font-bold px-6 py-2.5 rounded-lg hover:bg-gray-200 transition-colors">
            Retry Level {quizId}
          </button>
          {topic && questions.length > 0 && (
            <button onClick={handleNextQuiz} className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 transition-colors">
              Go to Quiz {quizId + 1}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{pageTitle}</h1>
        <p className="text-gray-600 mt-1">Question {currentQuestionIndex + 1} of {questions.length}</p>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-3 overflow-hidden">
          <div 
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="text-center mb-8">
          <p className="text-lg text-gray-500 mb-2">Choose the correct one:</p>
          <p className="text-4xl font-bold text-gray-900">{currentQuestion.questionText}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentQuestion.options.map((option, index) => {
            const isCorrect = option === currentQuestion.correctAnswer;
            const isSelected = option === selectedAnswer;
            let buttonClass = "p-4 border-2 rounded-lg text-lg text-left transition-colors font-medium ";
            if (isAnswered) {
              if (isCorrect) buttonClass += "bg-green-100 border-green-500 text-green-800";
              else if (isSelected) buttonClass += "bg-red-100 border-red-500 text-red-800";
              else buttonClass += "border-gray-200 opacity-60";
            } else {
              buttonClass += "border-gray-300 hover:border-blue-500 hover:bg-blue-50";
            }
            return (
              <button key={index} onClick={() => handleAnswer(option)} disabled={isAnswered} className={buttonClass}>
                {option}
              </button>
            );
          })}
        </div>

        {isAnswered && selectedAnswer !== currentQuestion.correctAnswer && (
          <div className="text-center mt-8">
            <button onClick={handleNext} className="bg-blue-600 text-white font-bold px-8 py-3 rounded-lg shadow-md hover:bg-blue-700 transition-colors">
              {currentQuestionIndex < questions.length - 1 ? "Next Question" : "Finish Quiz"}
            </button>
          </div>
        )}
      </div>

      {/* Global Quiz Navigation */}
      <div className="flex justify-between items-center pt-4">
        <button 
          onClick={() => navigate(topic && ['vocabulary', 'phrases', 'articles'].includes(topic) ? `/practice/${topic}` : (topic ? '/practice' : '/quizzes'))} 
          className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          ← Back
        </button>
        {topic && (
          <button onClick={handleNextQuiz} className="bg-blue-600 text-white font-bold px-6 py-2.5 rounded-lg shadow-sm hover:bg-blue-700 transition-colors flex items-center gap-2">
            Next Quiz →
          </button>
        )}
      </div>
    </div>
  );
}