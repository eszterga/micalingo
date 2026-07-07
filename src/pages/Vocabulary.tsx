import { useState, useEffect, useMemo } from "react";
import { useNavigate, Link } from "react-router-dom";
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
import { publicVocabulary, publicPhrases, publicArticles, publicPrepositions, publicFalseFriends } from '../lib/public-data';
import { useI18n } from "../I18nContext";

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
      ...publicFalseFriends.map(w => ({ ...w, category: 'false_friends' }))
    ];
    const unique = [];
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
  const navigate = useNavigate();
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
      const cleanA = a.german.replace(/^(der|die|das)\s+/i, '').trim().toLowerCase();
      const cleanB = b.german.replace(/^(der|die|das)\s+/i, '').trim().toLowerCase();
      return cleanA.localeCompare(cleanB);
    });

    sortedLibrary.forEach(word => {
      const cleanWord = word.german.replace(/^(der|die|das)\s+/i, '').trim().toUpperCase();
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
      const cleanA = a.german.replace(/^(der|die|das)\s+/i, '').trim().toLowerCase();
      const cleanB = b.german.replace(/^(der|die|das)\s+/i, '').trim().toLowerCase();
      return cleanA.localeCompare(cleanB);
    });

    sortedPersonal.forEach(word => {
      const cleanWord = word.german.replace(/^(der|die|das)\s+/i, '').trim().toUpperCase();
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

      await addCloudWord({
        userId: (adminMode && activeTab === 'library') ? "PUBLIC_LIBRARY" : user.uid,
        german: finalGerman,
        hungarian: newHungarian.trim(),
        example: newExample.trim(),
        note: newCategory === 'false_friends' ? newNote.trim() : "",
        dateAdded: Date.now(),
        category: newCategory,
        sourceFile: editingStaticWord?.sourceFile || undefined,
        sourceType: editingStaticWord?.sourceType || undefined
      } as any);
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
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link to="/library" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2">
          {t('back_button')}
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{t('vocab_title')}</h1>
          <p className="text-gray-600 mt-1">{t('vocab_subtitle')}</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex overflow-x-auto whitespace-nowrap border-b border-gray-200">
        <button
          onClick={() => setActiveTab('library')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'library' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          {t('open_library')}
        </button>
        <button
          onClick={() => setActiveTab('personal')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'personal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
        {t('personalized_space')}
        </button>
      </div>

      {/* Shared Search Bar */}
      <div className="w-full lg:w-4/5 mx-auto flex flex-col sm:flex-row justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200 gap-4">
        <input
          type="text"
          placeholder={t('search_vocabulary')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {((activeTab === 'personal' && user) || (activeTab === 'library' && adminMode)) && (
          <button
            onClick={openAddModal}
            className="w-full sm:w-auto whitespace-nowrap text-sm bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm flex items-center justify-center gap-2 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            {t('add_word')}
          </button>
        )}
        <div className="text-gray-500 text-sm font-medium whitespace-nowrap text-center sm:text-right hidden sm:block">
          {t('words_found', { count: activeTab === 'library' ? filteredLibraryWords.length : (filteredWords?.length || 0) })}
        </div>
      </div>

      {/* Tab Content: Open Library */}
      {activeTab === 'library' && (
        <div className="space-y-4">
          {adminMode && selectedIds.size > 0 && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
              <span className="text-red-800 font-medium">{t('words_selected', { count: selectedIds.size })}</span>
              <button
                onClick={handleBulkDelete}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                {t('delete_selected_words')}
              </button>
            </div>
          )}

          {Object.entries(groupedLibrary).map(([groupName, wordsInGroup]) => {
            if (wordsInGroup.length === 0) return null;
            const isOpen = openGroups[groupName];

            return (
              <div key={groupName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleGroup(groupName)}
                  className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-lg text-gray-800">{groupName}</span>
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{t('words_count', { count: wordsInGroup.length })}</span>
                  </div>
                  <svg className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>

                {isOpen && (
                  <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse border-t border-gray-200">
                    <thead className="bg-gray-50/50">
                      <tr>
                        <th className="p-2 sm:p-4 font-semibold text-sm text-gray-600 w-1/3">{t('german')}</th>
                        <th className="p-2 sm:p-4 font-semibold text-sm text-gray-600 w-1/3">{t('hungarian')}</th>
                        <th className="p-2 sm:p-4 font-semibold text-sm text-gray-600 w-1/3">{t('example')}</th>
                        {adminMode && <th className="p-2 sm:p-4 w-16 sm:w-24"></th>}
                        {adminMode && <th className="p-2 sm:p-4 w-10 sm:w-12"></th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {wordsInGroup.map((word, idx) => (
                        <tr key={word.id || `static_${word.german}_${idx}`} className="hover:bg-gray-50 transition-colors group">
                          <td className="p-2 sm:p-4 font-medium text-gray-900 w-1/3 break-words">{word.german}</td>
                          <td className="p-2 sm:p-4 text-gray-600 w-1/3 break-words">{word.hungarian}</td>
                          <td className="p-2 sm:p-4 text-gray-500 text-sm italic w-1/3 break-words">{word.example}</td>
                          {adminMode && (
                            <td className="p-2 sm:p-4 text-center w-16 sm:w-24">
                              <div className="flex justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditClick(word)}
                                  className="text-blue-500 hover:text-blue-700 p-2 rounded hover:bg-blue-50 transition-colors"
                                  title={t('edit_word')}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(word)}
                                  className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"
                                  title={t('delete_word')}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                </button>
                              </div>
                            </td>
                          )}
                          {adminMode && (
                            <td className="p-2 sm:p-4 text-center w-10 sm:w-12 border-l border-gray-100">
                              <input
                                type="checkbox"
                                checked={word.id ? selectedIds.has(word.id) : selectedIds.has(`static_${word.german}`)}
                                onChange={() => toggleSelection(word.id || `static_${word.german}`)}
                                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
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
             <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">
               {t('no_words_match_search')}
             </div>
          )}
        </div>
      )}

      {/* Tab Content: Personalized Space */}
      {activeTab === 'personal' && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center text-gray-500">{t('checking_account')}</div>
          ) : !user ? (
            <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('personalized_space')}</h2>
                <p className="text-gray-600 mb-8">
                  {t('personalized_space_description')}
                </p>
                <button onClick={handleGoogleLogin} className="inline-flex items-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold py-3 px-6 rounded-xl shadow-sm transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  {t('login_with_google')}
                </button>
              </div>
            </div>
          ) : !words ? (
            <div className="text-gray-500">{t('loading_vocabulary')}</div>
          ) : (
          <div className="space-y-4">
            {selectedIds.size > 0 && (
              <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-center justify-between shadow-sm">
                <span className="text-red-800 font-medium">{t('words_selected', { count: selectedIds.size })}</span>
                <button
                  onClick={handleBulkDelete}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  {t('delete_selected_words')}
                </button>
              </div>
            )}

            {Object.entries(groupedPersonal).map(([groupName, wordsInGroup]) => {
              if (wordsInGroup.length === 0) return null;
              const isOpen = openPersonalGroups[groupName];

              return (
                <div key={groupName} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => togglePersonalGroup(groupName)}
                    className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-lg text-gray-800">{groupName}</span>
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{t('words_count', { count: wordsInGroup.length })}</span>
                    </div>
                    <svg className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </button>

                  {isOpen && (
                    <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse border-t border-gray-200">
                      <tbody className="divide-y divide-gray-100">
                        {wordsInGroup.map((word: any, idx: number) => (
                          <tr key={word.id || `static_${word.german}_${idx}`} className="hover:bg-gray-50 transition-colors group">
                            <td className="p-2 sm:p-4 font-medium text-gray-900 break-words">
                              {word.german}
                              {word.category && word.category !== 'vocabulary' && (
                                <span className="ml-2 px-2 py-0.5 text-[10px] uppercase font-bold bg-blue-100 text-blue-800 rounded">
                                  {word.category}
                                </span>
                              )}
                            </td>
                            <td className="p-2 sm:p-4 text-gray-600 break-words">{word.hungarian}</td>
                            <td className="p-2 sm:p-4 text-gray-500 text-sm italic break-words">{word.example}</td>
                            <td className="p-2 sm:p-4 text-center w-16 sm:w-24">
                              <div className="flex justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditClick(word)}
                                  className="text-blue-500 hover:text-blue-700 p-2 rounded hover:bg-blue-50 transition-colors"
                                  title={t('edit_word')}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(word)}
                                  className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"
                                  title={t('delete_word')}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                </button>
                              </div>
                            </td>
                            <td className="p-2 sm:p-4 text-center w-10 sm:w-12 border-l border-gray-100">
                              <input
                                type="checkbox"
                                checked={word.id ? selectedIds.has(word.id) : selectedIds.has(`static_${word.german}`)}
                                onChange={() => toggleSelection(word.id || `static_${word.german}`)}
                                className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer"
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
                 <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">
                   {t('no_words_match_search')}
                 </div>
              ) : (
                <div className="p-12 text-center bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col items-center">
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">{t('personalized_space')} is Empty</h2>
                  <p className="text-gray-600 mb-8 max-w-md">{t('personalized_space_description')}</p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <Link to="/import" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-blue-700 transition-colors">{t('import_data')}</Link>
                    <Link to="/quizzes" className="bg-white border border-gray-300 text-gray-700 px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-colors">{t('create_your_own_quizzes')}</Link>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{editingId ? t('modal_edit_word_title') : t('modal_add_word_title')}</h2>

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
              } else if (newCategory === 'false_friends') {
                germanLabel = t('modal_german_ff_label') || "German False Friend *";
                germanPlaceholder = t('modal_german_ff_placeholder') || "e.g. das Gift, die Gifte";
                hungarianPlaceholder = t('modal_hungarian_ff_placeholder') || "e.g. a méreg";
              }
              
              return (
                <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_category_label') || 'Category'}</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                >
                  <option value="vocabulary">{t('vocabulary')}</option>
                  <option value="phrases">{t('phrases_quiz')}</option>
                  <option value="articles">{t('articles_quiz')}</option>
                  <option value="prepositions">{t('prepositions_quiz')}</option>
                  <option value="false_friends">{t('false_friends') || 'False Friends'}</option>
                </select>
              </div>
              {newCategory === 'articles' ? (
                <div className="flex gap-4">
                  <div className="w-1/3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_article_label') || 'Article *'}</label>
                    <select
                      value={newArticle}
                      onChange={(e) => setNewArticle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_hungarian_label')}</label>
                <input
                  type="text"
                  value={newHungarian}
                  onChange={(e) => setNewHungarian(e.target.value)}
                  placeholder={hungarianPlaceholder}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_example_label')}</label>
                <input
                  type="text"
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder={t('modal_example_placeholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
            );
          })()}

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">{t('cancel')}</button>
              <button onClick={handleSaveWord} className="px-4 py-2 font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-sm">{editingId ? t('modal_save_changes') : t('modal_save_word')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}