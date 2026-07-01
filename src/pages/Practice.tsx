import { Link } from "react-router-dom";

export default function Practice() {
  const practiceTopics = [
    {
      title: "Vocabulary",
      description: "Progressive quizzes from A1 basics to C1 advanced. 400 total words!",
      path: `/practice/vocabulary`,
    },
    {
      title: "Phrases",
      description: "Learn essential phrases from basic greetings to idioms.",
      path: `/practice/phrases`,
    },
    {
      title: "Articles (der/die/das, ein/kein)",
      description: "Master the German articles with this focused quiz.",
      path: `/practice/articles`,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">General Practice</h1>
        <p className="text-gray-600 mt-1">Choose a topic to start a quiz. No login required.</p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {practiceTopics.map((topic) => (
          <Link key={topic.title} to={topic.path} className="block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-blue-300 transition-all">
            <h3 className="font-bold text-lg text-gray-900">{topic.title}</h3>
            <p className="text-sm text-gray-600 mt-2">{topic.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}