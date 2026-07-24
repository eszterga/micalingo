import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { 
  useCloudVocabulary, 
  addCloudWord, 
  updateCloudWord, 
  deleteCloudWord, 
  bulkDeleteCloudWords, 
  type CloudVocabularyItem 
} from "../lib/firestore";
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { publicVocabulary, publicPhrases, publicArticles, publicPrepositions, publicFalseFriends, publicAdjectives } from '../lib/public-data';
import { useI18n } from "../I18nContext";

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

export default function Vocabulary() {
  const { user, loading, adminMode } = useAuth();
  const personalWords = useCloudVocabulary(user?.uid);
  const publicDbWords = useCloudVocabulary("PUBLIC_LIBRARY") || [];
  const { t } = useI18n();

  const allPublicWords: any[] = useMemo(() => {
    const combined = [
      ...publicDbWords, // DB items come first so edits override static!
      ...publicVocabulary.map(w => ({ ...w, category: 'vocabulary' })),
      ...publicPhrases.map(w => ({ ...w, category: 'phrases' })),
      ...publicArticles.map(w => ({ ...w, category: 'articles' })),
      ...publicPrepositions.map(w => ({ ...w, category: 'prepositions' })),
      ...publicFalseFriends.map(w => ({ ...w, category: 'false_friends' })),
      ...(publicAdjectives || []).map(w => ({ ...w, category: 'adjectives' }))
    ];
    const unique: any[] = [];
    const seen = new Set<string>();

    for (const word of combined) {
      const key = word.german.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        if (!(word as any).deleted) unique.push(word);
      }
    }
    return unique;
  }, [publicDbWords]);

  const words = personalWords;
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'library' | 'personal'>('library');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // State for the "Add Word" modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGerman, setNewGerman] = useState("");
  const [newArticle, setNewArticle] = useState("der");
  const [newNoun, setNewNoun] = useState("");
  const [newHungarian, setNewHungarian] = useState("");
  const [newExample, setNewExample] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newCategory, setNewCategory] = useState("vocabulary");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStaticWord, setEditingStaticWord] = useState<any>(null);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [moveTargetCategory, setMoveTargetCategory] = useState("vocabulary");


  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      alert(t('alert_login_failed'));
    }
  };

  const handleDelete = async (word: any) => {
    if (!word) return;
    if (confirm(t('alert_confirm_delete_word'))) {
      if (word.id) {
        await deleteCloudWord(word.id);
      } else if (adminMode) {
        await addCloudWord({
          userId: "PUBLIC_LIBRARY",
          german: word.german,
          hungarian: word.hungarian,
          category: word.category || "vocabulary",
          deleted: true,
          dateAdded: Date.now()
        } as any);
      }
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (confirm(t('alert_confirm_bulk_delete_words', { count: selectedIds.size }))) {
      const idsToDelete = Array.from(selectedIds).filter(id => !id.startsWith('static_'));
      const staticToTombstone = Array.from(selectedIds).filter(id => id.startsWith('static_'));

      if (idsToDelete.length > 0) {
        await bulkDeleteCloudWords(idsToDelete);
      }

      if (adminMode && staticToTombstone.length > 0) {
        for (const staticId of staticToTombstone) {
          const word = allPublicWords.find(w => `static_${w.german}` === staticId);
          if (word) {
            await addCloudWord({
              userId: "PUBLIC_LIBRARY",
              german: word.german,
              hungarian: word.hungarian,
              category: word.category || "vocabulary",
              deleted: true,
              dateAdded: Date.now()
            } as any);
          }
        }
      }
      setSelectedIds(new Set());
    }
  };

  const handleBulkMoveSubmit = async () => {
    if (selectedIds.size === 0) return;

    const idsToMove = Array.from(selectedIds).filter(id => !id.startsWith('static_'));
    const staticToMove = Array.from(selectedIds).filter(id => id.startsWith('static_'));
    
    const duplicatesFound: { german: string, category: string }[] = [];
    const nonDuplicateStaticToMove: string[] = [];
    const nonDuplicateIdsToMove: string[] = [];

    // Check for duplicates when copying static (public) words to personal library
    if (user && (!adminMode || activeTab !== 'library')) {
      for (const staticId of staticToMove) {
        const word = allPublicWords.find(w => `static_${w.german}` === staticId);
        if (word) {
          const duplicate = personalWords?.find(w => w.category === moveTargetCategory && (w.german || '').toLowerCase().trim() === (word.german || '').toLowerCase().trim());
          if (duplicate) {
                const catKey = duplicate.category || 'vocabulary';
                let catName = t(`dropdown_${catKey}`);
                if (catName === `dropdown_${catKey}`) catName = catKey;
                duplicatesFound.push({ german: word.german, category: catName });
          } else {
            nonDuplicateStaticToMove.push(staticId);
          }
        }
      }
    } else {
      nonDuplicateStaticToMove.push(...staticToMove);
    }

    // Check for duplicates when moving personal words between categories
    for (const id of idsToMove) {
      const wordToMove = personalWords?.find(w => w.id === id);
      if (wordToMove) {
        const isDuplicateInTarget = personalWords?.some(w => w.category === moveTargetCategory && (w.german || '').toLowerCase().trim() === (wordToMove.german || '').toLowerCase().trim() && w.id !== id);
        if (isDuplicateInTarget) {
              const catKey = moveTargetCategory || 'vocabulary';
              let catName = t(`dropdown_${catKey}`);
              if (catName === `dropdown_${catKey}`) catName = catKey;
              duplicatesFound.push({ german: wordToMove.german, category: catName });
        } else {
          nonDuplicateIdsToMove.push(id);
        }
      }
    }

    if (duplicatesFound.length > 0) {
      const message = duplicatesFound.map(d => `"${d.german}" (${t('alert_word_exists', { category: d.category })})`).join('\n');
      alert(`${t('duplicates_found_title')}\n\n${message}\n\n${t('duplicates_found_subtitle')}`);
    }

    let itemsProcessed = 0;
    for (const id of nonDuplicateIdsToMove) {
      await updateCloudWord(id, { category: moveTargetCategory } as any);
      itemsProcessed++;
    }

    for (const staticId of nonDuplicateStaticToMove) {
      const word = allPublicWords.find(w => `static_${w.german}` === staticId);
      if (word) {
        if (adminMode && activeTab === 'library') {
          await addCloudWord({ ...word, userId: "PUBLIC_LIBRARY", deleted: true, dateAdded: Date.now() } as any);
          await addCloudWord({ ...word, category: moveTargetCategory, userId: "PUBLIC_LIBRARY", dateAdded: Date.now() } as any);
          itemsProcessed++;
        } else if (user) {
          await addCloudWord({ userId: user.uid, german: word.german, hungarian: word.hungarian, example: word.example || "", note: word.note || "", category: moveTargetCategory, dateAdded: Date.now() } as any);
          itemsProcessed++;
        }
      }
    }

    setSelectedIds(new Set());
    setIsMoveModalOpen(false);
    if (itemsProcessed > 0) {
      alert(t('saved') || 'Saved successfully!');
    }
  };

  // Filter words based on search term. The list is already sorted alphabetically by the database query.
  const filteredWords = words?.filter((word: any) => {
    const search = searchTerm.toLowerCase();
    const g = (word.german || "").toLowerCase();
    const h = (word.hungarian || "").toLowerCase();
    const e = (word.example || "").toLowerCase();
    return g.includes(search) || h.includes(search) || e.includes(search);
  });

  const filteredLibraryWords = allPublicWords.filter((word: any) => {
    const search = searchTerm.toLowerCase();
    const g = (word.german || "").toLowerCase();
    const h = (word.hungarian || "").toLowerCase();
    return g.includes(search) || h.includes(search);
  });

  // Grouping logic for the library
  const groupedLibrary = useMemo(() => {
    const groups: Record<string, any[]> = {
      "A - D": [],
      "E - H": [],
      "I - L": [],
      "M - P": [],
      "Q - T": [],
      "U - Z": [],
      "Other": []
    };

    // Sort alphabetically while completely ignoring "der/die/das " at the start
    const sortedLibrary = [...filteredLibraryWords].sort((a, b) => {
      const cleanA = String(a.german || '').replace(/^(der|die|das)\s+/i, '').trim().toLowerCase();
      const cleanB = String(b.german || '').replace(/^(der|die|das)\s+/i, '').trim().toLowerCase();
      return cleanA.localeCompare(cleanB);
    });

    sortedLibrary.forEach(word => {
      const cleanWord = String(word.german || '').replace(/^(der|die|das)\s+/i, '').trim().toUpperCase();
      const firstChar = cleanWord.charAt(0);
      if (/[A-DÄ]/.test(firstChar)) groups["A - D"].push(word);
      else if (/[E-H]/.test(firstChar)) groups["E - H"].push(word);
      else if (/[I-L]/.test(firstChar)) groups["I - L"].push(word);
      else if (/[M-PÖ]/.test(firstChar)) groups["M - P"].push(word);
      else if (/[Q-T]/.test(firstChar)) groups["Q - T"].push(word);
      else if (/[U-ZÜ]/.test(firstChar)) groups["U - Z"].push(word);
      else groups["Other"].push(word);
    });

    return groups;
  }, [filteredLibraryWords]);

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const groupedPersonal = useMemo(() => {
    const groups: Record<string, any[]> = {
      "A - D": [],
      "E - H": [],
      "I - L": [],
      "M - P": [],
      "Q - T": [],
      "U - Z": [],
      "Other": []
    };

    if (!filteredWords) return groups;

    const sortedPersonal = [...filteredWords].sort((a, b) => {
      const cleanA = String(a.german || '').replace(/^(der|die|das)\s+/i, '').trim().toLowerCase();
      const cleanB = String(b.german || '').replace(/^(der|die|das)\s+/i, '').trim().toLowerCase();
      return cleanA.localeCompare(cleanB);
    });

    sortedPersonal.forEach(word => {
      const cleanWord = String(word.german || '').replace(/^(der|die|das)\s+/i, '').trim().toUpperCase();
      const firstChar = cleanWord.charAt(0);
      if (/[A-DÄ]/.test(firstChar)) groups["A - D"].push(word);
      else if (/[E-H]/.test(firstChar)) groups["E - H"].push(word);
      else if (/[I-L]/.test(firstChar)) groups["I - L"].push(word);
      else if (/[M-PÖ]/.test(firstChar)) groups["M - P"].push(word);
      else if (/[Q-T]/.test(firstChar)) groups["Q - T"].push(word);
      else if (/[U-ZÜ]/.test(firstChar)) groups["U - Z"].push(word);
      else groups["Other"].push(word);
    });

    return groups;
  }, [filteredWords]);

  const [openPersonalGroups, setOpenPersonalGroups] = useState<Record<string, boolean>>({});

  const togglePersonalGroup = (group: string) => {
    setOpenPersonalGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const openAddModal = () => {
    setEditingId(null);
    setEditingStaticWord(null);
    setNewGerman("");
    setNewArticle("der");
    setNewNoun("");
    setNewHungarian("");
    setNewExample("");
    setNewNote("");
    setNewCategory("vocabulary");
    setIsModalOpen(true);
  };

  const handleEditClick = (word: CloudVocabularyItem | any) => {
    setEditingId(word.id || null);
    setEditingStaticWord(word.id ? null : word);
    if (word.category === 'articles') {
      const match = word.german.match(/^(der|die|das)\s+(.*)/i);
      if (match) {
        setNewArticle(match[1].toLowerCase());
        setNewNoun(match[2]);
        setNewGerman("");
      } else {
        setNewArticle("der");
        setNewNoun(word.german);
        setNewGerman("");
      }
    } else {
      setNewGerman(word.german);
      setNewArticle("der");
      setNewNoun("");
    }
    setNewHungarian(word.hungarian);
    setNewExample(word.example || "");
    setNewNote(word.note || "");
    setNewCategory(word.category || "vocabulary");
    setIsModalOpen(true);
  };

  const handleSaveWord = async () => {
    const finalGerman = newCategory === 'articles' ? `${newArticle} ${newNoun.trim()}` : newGerman.trim();

    if (!finalGerman || !newHungarian.trim() || !user) {
      alert(t('alert_fill_fields_login'));
      return;
    }

    const isPublicSave = adminMode && activeTab === 'library';
    const targetVocabulary = isPublicSave ? allPublicWords : personalWords;

    const duplicate = targetVocabulary?.find((w: any) => 
      w.category === newCategory && (w.german || '').toLowerCase().trim() === finalGerman.toLowerCase().trim() && w.id !== editingId
    );

    if (duplicate) {
          const catKey = duplicate.category || 'vocabulary';
          let catName = t(`dropdown_${catKey}`);
          if (catName === `dropdown_${catKey}`) catName = catKey;
      alert(t('alert_word_exists', { category: catName }));
      return;
    }

    try {
      if (editingId) {
        await updateCloudWord(editingId, {
          german: finalGerman,
          hungarian: newHungarian.trim(),
          example: newExample.trim(),
          note: newCategory === 'false_friends' ? newNote.trim() : "",
          category: newCategory
        } as any);
      } else {
        if (adminMode && editingStaticWord && editingStaticWord.german.toLowerCase().trim() !== finalGerman.toLowerCase()) {
           // Tombstone the old static word since the german key changed
           await addCloudWord({
             userId: "PUBLIC_LIBRARY",
             german: editingStaticWord.german,
             hungarian: editingStaticWord.hungarian,
             category: editingStaticWord.category || "vocabulary",
             deleted: true,
             dateAdded: Date.now()
           } as any);
        }

        const payload: any = {
          userId: (adminMode && activeTab === 'library') ? "PUBLIC_LIBRARY" : user.uid,
          german: finalGerman,
          hungarian: newHungarian.trim(),
          example: newExample.trim(),
          note: newCategory === 'false_friends' ? newNote.trim() : "",
          dateAdded: Date.now(),
          category: newCategory,
        };

        if (editingStaticWord?.sourceFile) payload.sourceFile = editingStaticWord.sourceFile;
        if (editingStaticWord?.sourceType) payload.sourceType = editingStaticWord.sourceType;

        await addCloudWord(payload);
      }

      // Clear form and close modal
      setNewGerman("");
      setNewArticle("der");
      setNewNoun("");
      setNewHungarian("");
      setNewExample("");
      setNewNote("");
      setEditingId(null);
      setEditingStaticWord(null);
      setIsModalOpen(false);
      alert(t('saved') || 'Saved!');
    } catch (e) {
      console.error("Failed to save word:", e);
      alert("Failed to save word. Please try again.");
    }
  };

  return (
    <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
      <BackgroundBlobs />
      
      <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 px-4 md:px-8">
        <div className="flex items-center gap-4">
          <Link to="/library" className="bg-white/70 backdrop-blur-md border border-white text-gray-700 hover:bg-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2">
            {t('back_button')}
          </Link>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 tracking-tight pb-2">{t('vocab_title')}</h1>
            <p className="text-lg text-blue-900/70 font-medium mt-1">{t('vocab_subtitle')}</p>
          </div>
        </div>

      {/* Navigation Tabs */}
        <div className="flex overflow-x-auto whitespace-nowrap border-b border-white/60">
          <button
            onClick={() => setActiveTab('library')}
            className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors ${activeTab === 'library' ? 'border-blue-600 text-blue-700' : 'border-transparent text-blue-900/50 hover:text-blue-900/80'}`}
          >
            {t('open_library')}
          </button>
          <button
            onClick={() => setActiveTab('personal')}
            className={`py-3 px-6 font-bold text-sm border-b-2 transition-colors ${activeTab === 'personal' ? 'border-blue-600 text-blue-700' : 'border-transparent text-blue-900/50 hover:text-blue-900/80'}`}
          >
          {t('personalized_space')}
          </button>
        </div>

      {/* Shared Search Bar */}
        <div className="w-full bg-white/60 backdrop-blur-xl p-4 rounded-[1.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex flex-col sm:flex-row justify-between items-center gap-4">
          <input
            type="text"
            placeholder={t('search_vocabulary')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full flex-1 px-5 py-3 border border-white/60 bg-white/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
          {((activeTab === 'personal' && user) || (activeTab === 'library' && adminMode)) && (
            <button
              onClick={openAddModal}
              className="w-full sm:w-auto whitespace-nowrap bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <span className="text-xl leading-none">+</span> {t('add_word')}
            </button>
          )}
          <div className="text-blue-900/60 font-bold whitespace-nowrap text-center sm:text-right hidden sm:block px-2">
            {t('words_found', { count: activeTab === 'library' ? filteredLibraryWords.length : (filteredWords?.length || 0) })}
          </div>
        </div>

      {/* Tab Content: Open Library */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          {adminMode && selectedIds.size > 0 && (
            <div className="bg-blue-50/90 backdrop-blur border border-blue-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
              <span className="text-blue-800 font-medium">{t('words_selected', { count: selectedIds.size })}</span>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  onClick={() => setIsMoveModalOpen(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                  {t('save_to') || 'Save to...'}
                </button>
                <button
                  onClick={handleBulkDelete}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  {t('delete_selected_words')}
                </button>
              </div>
            </div>
          )}

          {Object.entries(groupedLibrary).map(([groupName, wordsInGroup]) => {
            if (wordsInGroup.length === 0) return null;
            const isOpen = openGroups[groupName];

            return (
              <div key={groupName} className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white overflow-hidden transition-all duration-300">
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center justify-between p-6 bg-transparent hover:bg-white/50 transition-colors group outline-none"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-extrabold text-2xl text-blue-950">{groupName}</span>
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm">{t('words_count', { count: wordsInGroup.length })}</span>
                  </div>
                  <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600 transition-transform duration-500 ${isOpen ? "rotate-180" : ""}`}>
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </button>

                {isOpen && (
                  <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed border-t border-blue-50/50">
                    <thead className="bg-blue-50/30">
                      <tr>
                        <th className="p-3 sm:p-5 font-bold text-sm text-blue-900/60 uppercase tracking-wider">{t('german')}</th>
                        <th className="p-3 sm:p-5 font-bold text-sm text-blue-900/60 uppercase tracking-wider">{t('hungarian')}</th>
                        <th className="p-3 sm:p-5 font-bold text-sm text-blue-900/60 uppercase tracking-wider">{t('example')}</th>
                        {adminMode && <th className="p-2 sm:p-4 w-16 sm:w-24"></th>}
                        {adminMode && <th className="p-2 sm:p-4 w-10 sm:w-12"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-blue-50/50">
                      {wordsInGroup.map((word, idx) => (
                        <tr key={word.id || `static_${word.german}_${idx}`} className="hover:bg-white/60 transition-colors group">
                          <td className="p-3 sm:p-5 font-bold text-blue-950 break-all">{word.german}</td>
                          <td className="p-3 sm:p-5 text-gray-700 break-all">{word.hungarian}</td>
                          <td className="p-3 sm:p-5 text-gray-500 text-sm italic break-all">{word.example}</td>
                          {adminMode && (
                            <td className="p-2 sm:p-4 text-center w-16 sm:w-24">
                              <div className="flex justify-center items-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditClick(word)}
                                  className="text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                  title={t('edit_word')}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(word)}
                                  className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                  title={t('delete_word')}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                </button>
                              </div>
                            </td>
                          )}
                          {adminMode && (
                            <td className="p-2 sm:p-4 text-center w-10 sm:w-12 border-l border-blue-50/50">
                              <input
                                type="checkbox"
                                checked={word.id ? selectedIds.has(word.id) : selectedIds.has(`static_${word.german}`)}
                                onChange={() => toggleSelection(word.id || `static_${word.german}`)}
                                className="w-5 h-5 text-blue-600 rounded border-blue-200 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            );
          })}
          {filteredLibraryWords.length === 0 && (
             <div className="p-8 text-center text-blue-900/60 bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white shadow-sm font-medium">
               {t('no_words_match_search')}
             </div>
          )}
        </div>
      )}

      {/* Tab Content: Personalized Space */}
      {activeTab === 'personal' && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white/70 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white text-center text-blue-900/60 font-medium">{t('checking_account')}</div>
          ) : !user ? (
            <div className="bg-white/70 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h2 className="text-3xl font-extrabold text-blue-950 mb-3">{t('personalized_space')}</h2>
                <p className="text-blue-900/70 font-medium mb-8">
                  {t('personalized_space_description')}
                </p>
                <button onClick={handleGoogleLogin} className="inline-flex items-center gap-3 bg-white border border-white hover:border-blue-200 hover:bg-blue-50/50 hover:shadow-md text-gray-800 font-bold py-3.5 px-6 rounded-xl shadow-sm transition-all duration-300">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  {t('login_with_google')}
                </button>
              </div>
            </div>
          ) : !words ? (
            <div className="text-blue-900/60 font-medium text-center mt-8">{t('loading_vocabulary')}</div>
          ) : (
          <div className="space-y-4">
            {selectedIds.size > 0 && (
              <div className="bg-blue-50/90 backdrop-blur border border-blue-200 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                <span className="text-blue-800 font-medium">{t('words_selected', { count: selectedIds.size })}</span>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setIsMoveModalOpen(true)}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg>
                    {t('save_to') || 'Save to...'}
                  </button>
                  <button
                    onClick={handleBulkDelete}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    {t('delete_selected_words')}
                  </button>
                </div>
              </div>
            )}

            {Object.entries(groupedPersonal).map(([groupName, wordsInGroup]) => {
              if (wordsInGroup.length === 0) return null;
              const isOpen = openPersonalGroups[groupName];

              return (
                <div key={groupName} className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white overflow-hidden transition-all duration-300">
                  <button
                    onClick={() => togglePersonalGroup(groupName)}
                    className="w-full flex items-center justify-between p-6 bg-transparent hover:bg-white/50 transition-colors group outline-none"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-extrabold text-2xl text-blue-950">{groupName}</span>
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full shadow-sm">{t('words_count', { count: wordsInGroup.length })}</span>
                    </div>
                    <div className={`w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600 transition-transform duration-500 ${isOpen ? "rotate-180" : ""}`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse table-fixed border-t border-blue-50/50">
                      <tbody className="divide-y divide-blue-50/50">
                        {wordsInGroup.map((word: any, idx: number) => (
                          <tr key={word.id || `static_${word.german}_${idx}`} className="hover:bg-white/60 transition-colors group">
                            <td className="p-3 sm:p-5 font-bold text-blue-950 break-all">
                              {word.german}
                              {word.category && word.category !== 'vocabulary' && (
                                <span className="ml-2 px-2 py-0.5 text-[10px] uppercase font-bold bg-blue-100 text-blue-800 rounded">
                                  {word.category}
                                </span>
                              )}
                            </td>
                            <td className="p-3 sm:p-5 text-gray-700 break-all">{word.hungarian}</td>
                            <td className="p-3 sm:p-5 text-gray-500 text-sm italic break-all">{word.example}</td>
                            <td className="p-2 sm:p-4 text-center w-16 sm:w-24">
                              <div className="flex justify-center items-center gap-2 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditClick(word)}
                                  className="text-blue-500 hover:text-blue-700 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                                  title={t('edit_word')}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(word)}
                                  className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                                  title={t('delete_word')}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                </button>
                              </div>
                            </td>
                            <td className="p-2 sm:p-4 text-center w-10 sm:w-12 border-l border-blue-50/50">
                              <input
                                type="checkbox"
                                checked={word.id ? selectedIds.has(word.id) : selectedIds.has(`static_${word.german}`)}
                                onChange={() => toggleSelection(word.id || `static_${word.german}`)}
                                className="w-5 h-5 text-blue-600 rounded border-blue-200 focus:ring-blue-500 cursor-pointer"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )}
                </div>
              );
            })}
            {(!filteredWords || filteredWords.length === 0) && (
              searchTerm ? (
                 <div className="p-8 text-center text-blue-900/60 bg-white/70 backdrop-blur-xl rounded-[2rem] border border-white shadow-sm font-medium">
                   {t('no_words_match_search')}
                 </div>
              ) : (
                <div className="bg-white/70 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white text-center flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                  </div>
                  <h2 className="text-3xl font-extrabold text-blue-950 mb-3">{t('personalized_space')} is Empty</h2>
                  <p className="text-blue-900/70 text-lg font-medium mb-8 max-w-md">{t('personalized_space_description')}</p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link to="/import" className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold shadow-sm hover:bg-blue-700 transition-colors">{t('import_data')}</Link>
                    <Link to="/quizzes" className="bg-white border border-gray-300 text-gray-700 px-8 py-3 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-colors">{t('create_your_own_quizzes')}</Link>
                  </div>
                </div>
              )
            )}
          </div>
          )}
        </div>
      )}

      {/* Add Word Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-extrabold text-blue-950">{editingId ? t('modal_edit_word_title') : t('modal_add_word_title')}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
             {(() => {
              let germanLabel = t('modal_german_label');
              let germanPlaceholder = t('modal_german_placeholder');
              let hungarianPlaceholder = t('modal_hungarian_placeholder');

              if (newCategory === 'phrases') {
                germanLabel = t('modal_german_phrase_label') || "German Phrase/Sentence *";
                germanPlaceholder = t('modal_german_phrase_placeholder') || "e.g. Wie geht es Ihnen?";
                hungarianPlaceholder = t('modal_hungarian_phrase_placeholder') || "e.g. Hogy van?";
              } else if (newCategory === 'prepositions') {
                germanLabel = t('modal_german_prep_label') || "German Preposition *";
                germanPlaceholder = t('modal_german_prep_placeholder') || "e.g. mit";
                hungarianPlaceholder = t('modal_hungarian_prep_placeholder') || "e.g. val/vel";
              } else if (newCategory === 'verbs') {
                germanLabel = t('modal_german_verb_label') || "German Verb *";
                germanPlaceholder = t('modal_german_verb_placeholder') || "e.g. machen";
                hungarianPlaceholder = t('modal_hungarian_verb_placeholder') || "e.g. csinálni";
              } else if (newCategory === 'false_friends') {
                germanLabel = t('modal_german_ff_label') || "German False Friend *";
                germanPlaceholder = t('modal_german_ff_placeholder') || "e.g. das Gift, die Gifte";
                hungarianPlaceholder = t('modal_hungarian_ff_placeholder') || "e.g. a méreg";
              }
              
              return (
                <div className="space-y-4">
              {newCategory === 'articles' ? (
                <div className="flex gap-4">
                  <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_article_label') || 'Article *'}</label>
                    <select
                      value={newArticle}
                      onChange={(e) => setNewArticle(e.target.value)}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      <option value="der">der</option>
                      <option value="die">die</option>
                      <option value="das">das</option>
                    </select>
                  </div>
                  <div className="w-2/3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_noun_label') || 'Noun (with plural) *'}</label>
                    <input
                      type="text"
                      value={newNoun}
                      onChange={(e) => setNewNoun(e.target.value)}
                      placeholder={t('modal_noun_placeholder') || 'e.g. Mann, die Männer'}
                      className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{germanLabel}</label>
                  <input
                    type="text"
                    value={newGerman}
                    onChange={(e) => setNewGerman(e.target.value)}
                    placeholder={germanPlaceholder}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{newCategory === 'idioms' ? (t('idiom_hungarian_label') || 'Hungarian Meaning *') : t('modal_hungarian_label')}</label>
                <input
                  type="text"
                  value={newHungarian}
                  onChange={(e) => setNewHungarian(e.target.value)}
                  placeholder={hungarianPlaceholder}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{newCategory === 'idioms' ? (t('explanation_label') || 'Explanation') : t('modal_example_label')}</label>
                <input
                  type="text"
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder={newCategory === 'idioms' ? (t('explanation_placeholder') || 'Explanation') : t('modal_example_placeholder')}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {newCategory === 'false_friends' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('note') || 'Note'} *</label>
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder={t('template_note_header') || 'Note'}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
            );
          })()}
            </div>

            <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-6 py-3 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">{t('cancel')}</button>
              <button onClick={handleSaveWord} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors">{editingId ? t('modal_save_changes') : t('modal_save_word')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Move Selected / Save To Modal */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-extrabold text-blue-950">{t('save_to') || 'Save to...'}</h2>
              <button onClick={() => setIsMoveModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_category_label') || 'Target Category'}</label>
                <select value={moveTargetCategory} onChange={(e) => setMoveTargetCategory(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50">
                  <option value="vocabulary">{t('dropdown_vocabulary') || 'Vocabulary quiz'}</option>
                  <option value="reading">{t('dropdown_reading') || 'Vocabulary (to read)'}</option>
                  <option value="articles">{t('dropdown_articles') || 'Articles quiz'}</option>
                  <option value="phrases">{t('dropdown_phrases') || 'Phrases and sentences quiz'}</option>
                  <option value="prepositions">{t('dropdown_prepositions') || 'Prepositions quiz'}</option>
                  <option value="adjectives">{t('dropdown_adjectives') || 'Adjectives quiz'}</option>
                  <option value="verbs">{t('dropdown_verbs') || 'Verbs quiz'}</option>
                </select>
              </div>
            </div>
            <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={() => setIsMoveModalOpen(false)} className="w-full sm:w-auto px-6 py-3 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">{t('cancel') || 'Cancel'}</button>
              <button onClick={handleBulkMoveSubmit} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors">{t('save_button') || 'Save'}</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}