import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type VocabularyItem } from "../lib/db";

export default function Vocabulary() {
  const words = useLiveQuery(() => db.vocabulary.orderBy('german').toArray());
  const [searchTerm, setSearchTerm] = useState("");

  // State for the "Add Word" modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGerman, setNewGerman] = useState("");
  const [newHungarian, setNewHungarian] = useState("");
  const [newExample, setNewExample] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleDelete = async (id?: number) => {
    if (!id) return;
    if (confirm("Are you sure you want to delete this word?")) {
      await db.vocabulary.delete(id);
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

  const openAddModal = () => {
    setEditingId(null);
    setNewGerman("");
    setNewHungarian("");
    setNewExample("");
    setIsModalOpen(true);
  };

  const handleEditClick = (word: VocabularyItem) => {
    setEditingId(word.id || null);
    setNewGerman(word.german);
    setNewHungarian(word.hungarian);
    setNewExample(word.example || "");
    setIsModalOpen(true);
  };

  const handleSaveWord = async () => {
    if (!newGerman.trim() || !newHungarian.trim()) {
      alert("Please fill in at least the German and Hungarian fields.");
      return;
    }

    if (editingId) {
      await db.vocabulary.update(editingId, {
        german: newGerman.trim(),
        hungarian: newHungarian.trim(),
        example: newExample.trim()
      });
    } else {
      await db.vocabulary.add({
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
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
          </svg>
          Add Word
        </button>
      </div>

      {!words ? (
        <div className="text-gray-500">Loading your vocabulary...</div>
      ) : words.length === 0 ? (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center text-gray-500">
          No vocabulary imported yet. Go to the <a href="/import" className="text-blue-600 hover:underline">Import page</a> to add some!
        </div>
      ) : (
        <div className="space-y-4">
          {/* Search Bar */}
          <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <input
              type="text"
              placeholder="Search vocabulary..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="text-gray-500 text-sm font-medium">
              {filteredWords?.length} {filteredWords?.length === 1 ? "word" : "words"}
            </div>
          </div>

          {/* Vocabulary Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 font-semibold text-gray-700 w-1/3">German</th>
                  <th className="p-4 font-semibold text-gray-700 w-1/3">Hungarian</th>
                  <th className="p-4 font-semibold text-gray-700">Example / Comment</th>
                  <th className="p-4 font-semibold text-gray-700 w-24 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredWords?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-8 text-center text-gray-500">
                      No words match your search.
                    </td>
                  </tr>
                ) : (
                  filteredWords?.map((word) => (
                    <tr key={word.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="p-4 font-medium text-gray-900">
                        {word.german}
                        {word.category && word.category !== 'vocabulary' && (
                          <span className="ml-2 px-2 py-0.5 text-[10px] uppercase font-bold bg-blue-100 text-blue-800 rounded">
                            {word.category}
                          </span>
                        )}
                      </td>
                      <td className="p-4 text-gray-600">{word.hungarian}</td>
                      <td className="p-4 text-gray-500 text-sm italic">{word.example}</td>
                      <td className="p-4 text-center">
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
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
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