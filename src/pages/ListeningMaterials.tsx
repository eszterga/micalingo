import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../I18nContext';
import { useAuth } from '../AuthContext';
import CMSEditorModal, { MaterialData, CategoryOption } from '../components/CMSEditorModal';
import { collection, doc, setDoc } from 'firebase/firestore';
import { dbCloud } from '../lib/firebase';

const BackgroundBlobs = () => (
  <>
    <style>{`
      @keyframes blob {
        0% { transform: translate(0px, 0px) scale(1); }
        33% { transform: translate(30px, -50px) scale(1.1); }
        66% { transform: translate(-20px, 20px) scale(0.9); }
        100% { transform: translate(0px, 0px) scale(1); }
      }
      .animate-blob { animation: blob 15s infinite alternate; }
      .animation-delay-2000 { animation-delay: 2s; }
      .animation-delay-4000 { animation-delay: 4s; }
    `}</style>
    <div className="fixed top-[-10%] left-[-10%] w-[50vw] h-[50vw] max-w-[600px] max-h-[600px] bg-blue-300 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-40 animate-blob pointer-events-none z-0"></div>
    <div className="fixed top-[10%] right-[-5%] w-[40vw] h-[40vw] max-w-[500px] max-h-[500px] bg-purple-300 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-40 animate-blob animation-delay-2000 pointer-events-none z-0"></div>
    <div className="fixed bottom-[-10%] left-[20%] w-[45vw] h-[45vw] max-w-[550px] max-h-[550px] bg-pink-200 rounded-full mix-blend-multiply filter blur-[80px] md:blur-[120px] opacity-40 animate-blob animation-delay-4000 pointer-events-none z-0"></div>
  </>
);

export default function ListeningMaterials() {
  const { t } = useI18n();
  const { user, isAdmin, adminMode } = useAuth();
  const [openSections, setOpenSections] = useState<{ music: boolean; podcasts: boolean; audiobooks: boolean }>(() => {
    try {
      const saved = sessionStorage.getItem('micalingo_listening_sections_v2');
      return saved ? JSON.parse(saved) : { music: false, podcasts: false, audiobooks: false };
    } catch (e) {
      return { music: false, podcasts: false, audiobooks: false };
    }
  });
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const toggleSection = (section: 'music' | 'podcasts' | 'audiobooks') => {
    setOpenSections(prev => {
      const next = { ...prev, [section]: !prev[section] };
      sessionStorage.setItem('micalingo_listening_sections_v2', JSON.stringify(next));
      return next;
    });
  };

  const musicCategories = [
    { id: "pop", icon: "🎤", title: t("pop") || "Pop", desc: t("pop_desc") || "Popular music hits." },
    { id: "rock", icon: "🎸", title: t("rock") || "Rock", desc: t("rock_desc") || "Rock and alternative music." },
    { id: "other-music", icon: "🎵", title: t("other_music") || "Other", desc: t("other_music_desc") || "Various other genres." }
  ];

  const podcastsCategories = [
    { id: "politics", icon: "⚖️", title: t("politics") || "Politics", desc: t("politics_desc") || "Government and society." },
    { id: "travel", icon: "✈️", title: t("travel") || "Travel", desc: t("travel_desc") || "Stories and tips from around the world." },
    { id: "psychology", icon: "🧠", title: t("psychology") || "Psychology", desc: t("psychology_desc") || "Mind, behavior, and mental health." },
    { id: "other-podcasts", icon: "🎙️", title: t("other_podcasts") || "Other", desc: t("other_podcasts_desc") || "Various other podcast topics." }
  ];

  const audiobooksCategories = [
    { id: "fiction", icon: "📖", title: t("fiction") || "Fiction", desc: t("fiction_desc") || "Novels and stories." },
    { id: "non-fiction", icon: "🧠", title: t("non_fiction") || "Non-Fiction", desc: t("non_fiction_desc") || "Factual and educational." },
    { id: "other-audiobooks", icon: "📚", title: t("other_audiobooks") || "Other", desc: t("other_audiobooks_desc") || "Various other audiobooks." }
  ];

  const allCategories: CategoryOption[] = [
    ...musicCategories.map(c => ({ id: c.id, title: `Music - ${c.title}`, collectionName: 'audio' })),
    ...podcastsCategories.map(c => ({ id: c.id, title: `Podcasts - ${c.title}`, collectionName: 'audio' })),
    ...audiobooksCategories.map(c => ({ id: c.id, title: `Audiobooks - ${c.title}`, collectionName: 'audio' }))
  ];

  const handleSaveContent = async (data: MaterialData) => {
    try {
      const targetCollection = data.collectionName || 'audio';
      const payload = {
        title: data.title,
        content: data.content,
        url: data.mediaLink || "",
        source: data.artist || "",
        categoryId: data.categoryId,
        userId: isAdmin && adminMode ? "PUBLIC_LIBRARY" : user?.uid,
        updatedAt: Date.now()
      };
      await setDoc(doc(collection(dbCloud, targetCollection)), payload);
      alert(t("save_success") || "Content added successfully!");
    } catch (e) {
      console.error("Error saving content:", e);
      alert(t("save_error") || "Failed to save content.");
    }
  };

  return (
    <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
      <BackgroundBlobs />
      <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 px-4 md:px-8">
        <div className="flex items-center gap-4">
          <Link to="/learning-materials" className="bg-white/70 backdrop-blur-md border border-white text-gray-700 hover:bg-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2">
            {t("back_button")}
          </Link>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 tracking-tight pb-2">
              {t("listen_materials")}
            </h1>
            <p className="text-lg text-blue-900/70 font-medium mt-1">
              {t("listen_materials_desc")}
            </p>
          </div>
        </div>

      {/* Admin Add Content Button */}
      {isAdmin && adminMode && (
        <div className="flex justify-end pt-2">
          <button onClick={() => setIsEditorOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-sm transition-colors flex items-center gap-2">
            <span className="text-xl leading-none">+</span> Add Content
          </button>
        </div>
      )}

        <div className="space-y-6 pt-4">
          <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200/60 text-blue-900 p-5 rounded-[1.5rem] shadow-sm text-sm font-medium mb-6 flex items-center gap-3">
            <span className="text-xl">🔖</span>
            {user ? (t("bookmark_instructions_logged_in") || "Highlight any text while reading to save a bookmark, or save the highlighted text directly to your personal vocabulary database or into your quizzes!") : (t("bookmark_instructions_guest") || "Highlight any text while reading to save a bookmark, or save the highlighted text directly to your personal vocabulary database or into your quizzes! (This feature is exclusively available for logged-in users. Log in to use it!)")}
          </div>

          {/* Music Section */}
          <section className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 transition-all duration-300 hover:bg-white/80">
            <button onClick={() => toggleSection('music')} className="w-full flex items-center justify-between group outline-none">
              <h2 className="text-2xl font-extrabold text-blue-950 flex items-center gap-4">
                <span className="bg-blue-100 text-blue-600 p-3 rounded-2xl text-xl shadow-sm group-hover:scale-110 transition-transform duration-300">🎶</span>
                {t("music_section") || "Music"}
              </h2>
              <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600 transition-transform duration-500 ${openSections.music ? "rotate-180" : ""}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </button>
            {openSections.music && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-8 pb-2">
                  {musicCategories.map(cat => (
                    <Link key={cat.id} to={`/learning-materials/listening/music/${cat.id}`} className="group relative flex flex-col items-start justify-between p-6 md:p-8 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-blue-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:border-blue-200 hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                      <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-3xl mb-10 group-hover:scale-110 transition-transform duration-500 border border-gray-100">{cat.icon}</div>
                      <div className="relative z-10 w-full">
                        <h3 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors text-2xl drop-shadow-sm mb-1">{cat.title}</h3>
                        <p className="text-gray-600 font-medium text-sm leading-relaxed">{cat.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
            )}
          </section>

          {/* Podcasts Section */}
          <section className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 transition-all duration-300 hover:bg-white/80">
            <button onClick={() => toggleSection('podcasts')} className="w-full flex items-center justify-between group outline-none">
              <h2 className="text-2xl font-extrabold text-blue-950 flex items-center gap-4">
                <span className="bg-blue-100 text-blue-600 p-3 rounded-2xl text-xl shadow-sm group-hover:scale-110 transition-transform duration-300">🎧</span>
                {t("podcasts_section") || "Podcasts"}
              </h2>
              <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600 transition-transform duration-500 ${openSections.podcasts ? "rotate-180" : ""}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </button>
            {openSections.podcasts && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-8 pb-2">
                  {podcastsCategories.map(cat => (
                    <Link key={cat.id} to={`/learning-materials/listening/podcasts/${cat.id}`} className="group relative flex flex-col items-start justify-between p-6 md:p-8 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-blue-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:border-blue-200 hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                      <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-3xl mb-10 group-hover:scale-110 transition-transform duration-500 border border-gray-100">{cat.icon}</div>
                      <div className="relative z-10 w-full">
                        <h3 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors text-2xl drop-shadow-sm mb-1">{cat.title}</h3>
                        <p className="text-gray-600 font-medium text-sm leading-relaxed">{cat.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
            )}
          </section>

          {/* Audiobooks Section */}
          <section className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 transition-all duration-300 hover:bg-white/80">
            <button onClick={() => toggleSection('audiobooks')} className="w-full flex items-center justify-between group outline-none">
              <h2 className="text-2xl font-extrabold text-blue-950 flex items-center gap-4">
                <span className="bg-blue-100 text-blue-600 p-3 rounded-2xl text-xl shadow-sm group-hover:scale-110 transition-transform duration-300">📚</span>
                {t("audiobooks_section") || "Audiobooks"}
              </h2>
              <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600 transition-transform duration-500 ${openSections.audiobooks ? "rotate-180" : ""}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </button>
            {openSections.audiobooks && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-8 pb-2">
                  {audiobooksCategories.map(cat => (
                    <Link key={cat.id} to={`/learning-materials/listening/audiobooks/${cat.id}`} className="group relative flex flex-col items-start justify-between p-6 md:p-8 rounded-[2rem] bg-white/90 backdrop-blur-xl border border-blue-50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:border-blue-200 hover:-translate-y-2 transition-all duration-500 overflow-hidden">
                      <div className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-3xl mb-10 group-hover:scale-110 transition-transform duration-500 border border-gray-100">{cat.icon}</div>
                      <div className="relative z-10 w-full">
                        <h3 className="font-extrabold text-gray-900 group-hover:text-blue-700 transition-colors text-2xl drop-shadow-sm mb-1">{cat.title}</h3>
                        <p className="text-gray-600 font-medium text-sm leading-relaxed">{cat.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
            )}
          </section>
        </div>
      </div>

      <CMSEditorModal 
        isOpen={isEditorOpen} 
        type="listening" 
        categories={allCategories}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveContent}
      />
    </div>
  );
}