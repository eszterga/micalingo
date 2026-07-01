import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { useCloudVocabulary, addCloudWord, updateCloudWord, deleteCloudWord, type CloudVocabularyItem } from "../lib/firestore";
import { signInWithRedirect, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { publicVocabulary, publicPhrases, publicArticles } from '../lib/public-data';

export default function Vocabulary() {
  const { user, loading } = useAuth();
  const words = useCloudVocabulary(user?.uid);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<'library' | 'personal'>('library');

  // State for the "Add Word" modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGerman, setNewGerman] = useState("");
  const [newHungarian, setNewHungarian] = useState("");
  const [newExample, setNewExample] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Redirect logged-in users to /import if they want their personal vocabulary but it's empty
  useEffect(() => {
    if (activeTab === 'personal' && user && words?.length === 0) {
      navigate('/import');
    }
  }, [activeTab, user, words, navigate]);

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithRedirect(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      alert("Failed to log in with Google.");
    }
  };

  const handleDelete = async (id?: string) => {
    if (!id) return;
    if (confirm("Are you sure you want to delete this word?")) {
      await deleteCloudWord(id);
    }
  };

  // Filter words based on search term. The list is already sorted alphabetically by the database query.
  const filteredWords = words?.filter(word => {
    const search = searchTerm.toLowerCase();
    const g = (word.german || "").toLowerCase();
    const h = (word.hungarian || "").toLowerCase();
    const e = (word.example || "").toLowerCase();
    return g.includes(search) || h.includes(search) || e.includes(search);
  });

  const allPublicWords = useMemo(() => [...publicVocabulary, ...publicPhrases, ...publicArticles], []);

  const filteredLibraryWords = allPublicWords.filter(word => {
    const search = searchTerm.toLowerCase();
    const g = (word.german || "").toLowerCase();
    const h = (word.hungarian || "").toLowerCase();
    return g.includes(search) || h.includes(search);
  });

  // Grouping logic for the library
  const groupedLibrary = useMemo(() => {
    const groups: Record<string, typeof allPublicWords> = {
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

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ "A - D": true });

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const groupedPersonal = useMemo(() => {
    const groups: Record<string, CloudVocabularyItem[]> = {
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

  const [openPersonalGroups, setOpenPersonalGroups] = useState<Record<string, boolean>>({ "A - D": true });

  const togglePersonalGroup = (group: string) => {
    setOpenPersonalGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const openAddModal = () => {
    setEditingId(null);
    setNewGerman("");
    setNewHungarian("");
    setNewExample("");
    setIsModalOpen(true);
  };

  const handleEditClick = (word: CloudVocabularyItem) => {
    setEditingId(word.id || null);
    setNewGerman(word.german);
    setNewHungarian(word.hungarian);
    setNewExample(word.example || "");
    setIsModalOpen(true);
  };

  const handleSaveWord = async () => {
    if (!newGerman.trim() || !newHungarian.trim() || !user) {
      alert("Please fill in at least the German and Hungarian fields. Make sure you are logged in.");
      return;
    }

    if (editingId) {
      await updateCloudWord(editingId, {
        german: newGerman.trim(),
        hungarian: newHungarian.trim(),
        example: newExample.trim()
      });
    } else {
      await addCloudWord({
        userId: user.uid,
        german: newGerman.trim(),
        hungarian: newHungarian.trim(),
        example: newExample.trim(),
        dateAdded: Date.now(),
        category: "vocabulary"
      });
    }

    // Clear form and close modal
    setNewGerman("");
    setNewHungarian("");
    setNewExample("");
    setEditingId(null);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold">Vocabulary</h1>
          <p className="text-gray-600 mt-1">Browse and manage your learned words.</p>
        </div>
        <button
          onClick={openAddModal}
          className={`bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap ${activeTab !== 'personal' || !user ? 'hidden' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Word
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('library')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'library' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Open Library
        </button>
        <button
          onClick={() => setActiveTab('personal')}
          className={`py-3 px-6 font-semibold text-sm border-b-2 transition-colors ${activeTab === 'personal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Personalized Space
        </button>
      </div>

      {/* Shared Search Bar */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <input
          type="text"
          placeholder="Search vocabulary..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="text-gray-500 text-sm font-medium hidden sm:block">
          {activeTab === 'library' ? filteredLibraryWords.length : (filteredWords?.length || 0)} words found
        </div>
      </div>

      {/* Tab Content: Open Library */}
      {activeTab === 'library' && (
        <div className="space-y-4">
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
                    <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{wordsInGroup.length} words</span>
                  </div>
                  <svg className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                  </svg>
                </button>
                
                {isOpen && (
                  <table className="w-full text-left border-collapse border-t border-gray-200">
                    <tbody className="divide-y divide-gray-100">
                      {wordsInGroup.map((word, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                          <td className="p-4 font-medium text-gray-900 w-1/2">{word.german}</td>
                          <td className="p-4 text-gray-600 w-1/2">{word.hungarian}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })}
          {filteredLibraryWords.length === 0 && (
             <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">
               No words match your search.
             </div>
          )}
        </div>
      )}

      {/* Tab Content: Personalized Space */}
      {activeTab === 'personal' && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center text-gray-500">Checking account...</div>
          ) : !user ? (
            <div className="bg-white p-12 rounded-xl shadow-sm border border-gray-200 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-3">Personalized Space</h2>
                <p className="text-gray-600 mb-8">
                  Log in to build and manage your own vocabulary list. You can add words manually or import them from files!
                </p>
                <button onClick={handleGoogleLogin} className="inline-flex items-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-800 font-bold py-3 px-6 rounded-xl shadow-sm transition-colors">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                  Log in with Google
                </button>
              </div>
            </div>
          ) : !words ? (
            <div className="text-gray-500">Loading your vocabulary...</div>
          ) : (
          <div className="space-y-4">
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
                      <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2.5 py-0.5 rounded-full">{wordsInGroup.length} words</span>
                    </div>
                    <svg className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </button>
                  
                  {isOpen && (
                    <table className="w-full text-left border-collapse border-t border-gray-200">
                      <tbody className="divide-y divide-gray-100">
                        {wordsInGroup.map((word) => (
                          <tr key={word.id} className="hover:bg-gray-50 transition-colors group">
                            <td className="p-4 font-medium text-gray-900 w-1/3">
                              {word.german}
                              {word.category && word.category !== 'vocabulary' && (
                                <span className="ml-2 px-2 py-0.5 text-[10px] uppercase font-bold bg-blue-100 text-blue-800 rounded">
                                  {word.category}
                                </span>
                              )}
                            </td>
                            <td className="p-4 text-gray-600 w-1/3">{word.hungarian}</td>
                            <td className="p-4 text-gray-500 text-sm italic w-1/3">{word.example}</td>
                            <td className="p-4 text-center w-24">
                              <div className="flex justify-center items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => handleEditClick(word)}
                                  className="text-blue-500 hover:text-blue-700 p-2 rounded hover:bg-blue-50 transition-colors"
                                  title="Edit word"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(word.id)}
                                  className="text-red-500 hover:text-red-700 p-2 rounded hover:bg-red-50 transition-colors"
                                  title="Delete word"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
            {(!filteredWords || filteredWords.length === 0) && (
               <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-gray-200 shadow-sm">
                 No words match your search.
               </div>
            )}
          </div>
          )}
        </div>
      )}

      {/* Add Word Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">{editingId ? "Edit Word" : "Add New Word"}</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">German *</label>
                <input
                  type="text"
                  value={newGerman}
                  onChange={(e) => setNewGerman(e.target.value)}
                  placeholder="e.g. der Apfel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hungarian *</label>
                <input
                  type="text"
                  value={newHungarian}
                  onChange={(e) => setNewHungarian(e.target.value)}
                  placeholder="e.g. alma"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Example / Comment</label>
                <input
                  type="text"
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder="e.g. Ich esse einen Apfel."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSaveWord} className="px-4 py-2 font-medium bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors shadow-sm">{editingId ? "Save Changes" : "Save Word"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}