import { useMemo, useState } from 'react';
import { Link } from "react-router-dom";
import { useI18n } from "../I18nContext";
import { useAuth } from "../AuthContext";
import { useCloudVocabulary, addCloudWord, updateCloudWord, deleteCloudWordPurgingSoftDeleted, purgeVocabDuplicatesKeeping } from "../lib/firestore";
import { publicFalseFriends } from "../lib/public-data";

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

export default function FalseFriends() {
  const { t } = useI18n();
  const { user, isAdmin, adminMode } = useAuth();
  
  const publicDbWords = useCloudVocabulary("PUBLIC_LIBRARY") || [];

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingStaticWord, setEditingStaticWord] = useState<any>(null);
  const [formData, setFormData] = useState({ german: '', hungarian: '', note: '', example: '' });

  const allFalseFriends = useMemo(() => {
    const combined = [
      ...publicDbWords.filter((w: any) => w.category === 'false_friends'),
      ...publicFalseFriends.map((w: any) => ({ ...w, category: 'false_friends' }))
    ];
    
    const unique: any[] = [];
    const seen = new Set<string>();

    for (const word of combined) {
      const key = (word.german || "").toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        if (!word.deleted) unique.push(word);
      }
    }
    
    return unique.sort((a, b) => (a.german || "").localeCompare(b.german || ""));
  }, [publicDbWords]);

  const openAddModal = () => {
    setEditingId(null);
    setEditingStaticWord(null);
    setFormData({ german: '', hungarian: '', note: '', example: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (item: any) => {
    setEditingId(item.id || null);
    setEditingStaticWord(item.id ? null : item);
    setFormData({ 
      german: item.german || '', 
      hungarian: item.hungarian || '', 
      note: item.note || '', 
      example: item.example || '' 
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (item: any) => {
    if (!confirm(t('confirm_delete_ff') || "Are you sure you want to delete this false friend?")) return;
    if (item.id) {
      await deleteCloudWordPurgingSoftDeleted(item, publicDbWords as any[]);
    } else {
      await addCloudWord({ userId: "PUBLIC_LIBRARY", german: item.german, hungarian: item.hungarian, category: "false_friends", deleted: true, dateAdded: Date.now() } as any);
    }
  };

  const handleSave = async () => {
    if (!formData.german.trim() || !formData.hungarian.trim()) {
      alert(t('alert_fill_fields_admin') || "Please fill in at least the German and Hungarian fields.");
      return;
    }

    if (editingId) {
      await updateCloudWord(editingId, { german: formData.german.trim(), hungarian: formData.hungarian.trim(), note: formData.note.trim(), example: formData.example.trim(), category: 'false_friends', deleted: false } as any);
      await purgeVocabDuplicatesKeeping(publicDbWords as any[], formData.german.trim(), 'false_friends', editingId);
    } else {
      if (editingStaticWord && editingStaticWord.german.toLowerCase().trim() !== formData.german.toLowerCase().trim()) {
         await addCloudWord({ userId: "PUBLIC_LIBRARY", german: editingStaticWord.german, hungarian: editingStaticWord.hungarian, category: "false_friends", deleted: true, dateAdded: Date.now() } as any);
      }

      const docRef = await addCloudWord({ userId: "PUBLIC_LIBRARY", german: formData.german.trim(), hungarian: formData.hungarian.trim(), note: formData.note.trim(), example: formData.example.trim(), category: 'false_friends', dateAdded: Date.now() } as any);
      await purgeVocabDuplicatesKeeping(publicDbWords as any[], formData.german.trim(), 'false_friends', docRef.id);
    }

    setIsModalOpen(false);
  };

  return (
    <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
      <BackgroundBlobs />
      <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 px-4 md:px-8">
        <div className="flex items-center gap-4">
          <Link to="/learning-materials/reading" className="bg-white/70 backdrop-blur-md border border-white text-gray-700 hover:bg-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2">
            {t('back_button')}
          </Link>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 tracking-tight pb-2">{t('false_friends')}</h1>
            <p className="text-lg text-blue-900/70 font-medium mt-1">{t('false_friends_desc')}</p>
          </div>
        </div>

        {isAdmin && adminMode && (
          <div className="flex justify-end pt-2">
            <button onClick={openAddModal} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-sm transition-colors flex items-center gap-2">
              <span className="text-xl leading-none">+</span> {t('add_content') || 'Add Content'}
            </button>
          </div>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 pt-4">
          {allFalseFriends.length > 0 ? (
            allFalseFriends.map((item, idx) => (
              <div key={idx} className="bg-white/80 backdrop-blur-xl p-5 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white flex flex-col justify-between hover:shadow-[0_20px_40px_rgba(37,99,235,0.15)] hover:border-blue-200 transition-all duration-500 hover:-translate-y-1 group/item">
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full mb-2">
                  <h2 className="text-2xl font-extrabold text-blue-950 m-0 leading-tight">{item.german}</h2>
                  {isAdmin && adminMode && (
                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:border-l sm:border-gray-100 sm:pl-4 pt-3 sm:pt-0 border-t border-gray-100 sm:border-t-0 flex-shrink-0">
                      <button onClick={(e) => { e.preventDefault(); openEditModal(item); }} className="px-3 py-2 sm:p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 hover:text-blue-700 transition-colors shadow-sm flex items-center gap-2" title={t('edit_word') || 'Edit'}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        <span className="text-xs font-bold sm:hidden">{t('edit_word') || 'Edit'}</span>
                      </button>
                      <button onClick={(e) => { e.preventDefault(); handleDelete(item); }} className="px-3 py-2 sm:p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors shadow-sm flex items-center gap-2" title={t('delete') || 'Delete'}>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        <span className="text-xs font-bold sm:hidden">{t('delete') || 'Delete'}</span>
                      </button>
                    </div>
                  )}
                </div>

                  <p className="text-lg font-medium text-blue-600 mb-4">{item.hungarian}</p>
                  
                  {item.note && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-xl text-sm font-medium mb-4 shadow-sm">
                      <span className="font-bold mr-2">⚠️ {t('note') || 'Note'}:</span>{item.note}
                    </div>
                  )}
                  
                  {item.example && (
                    <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                      <p className="text-sm font-bold text-blue-800 uppercase tracking-wider mb-1">{t('example_label') || 'Example'}</p>
                      <p className="text-gray-700 italic text-sm">"{item.example}"</p>
                    </div>
                  )}
              </div>
            ))
          ) : (
            <div className="col-span-full bg-white/70 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white text-center">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">{t('no_items') || 'No items found'}</h2>
            </div>
          )}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-extrabold text-blue-950">
                {editingId || editingStaticWord ? (t('modal_edit_word_title') || 'Edit False Friend') : (t('modal_add_word_title') || 'Add False Friend')}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t('modal_german_ff_label') || 'German False Friend *'}</label>
                <input type="text" value={formData.german} onChange={e => setFormData({ ...formData, german: e.target.value })} placeholder={t('modal_german_ff_placeholder') || "e.g. das Gift, die Gifte"} className="w-full rounded-xl border-gray-200 border p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t('modal_hungarian_label') || 'Hungarian *'}</label>
                <input type="text" value={formData.hungarian} onChange={e => setFormData({ ...formData, hungarian: e.target.value })} placeholder={t('modal_hungarian_ff_placeholder') || "e.g. a méreg"} className="w-full rounded-xl border-gray-200 border p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t('note') || 'Note'} *</label>
                <input type="text" value={formData.note} onChange={e => setFormData({ ...formData, note: e.target.value })} placeholder={t('ff_note_placeholder') || "e.g. False friend: gift != ajándék"} className="w-full rounded-xl border-gray-200 border p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t('modal_example_label') || 'Example Sentence'}</label>
                <textarea rows={3} value={formData.example} onChange={e => setFormData({ ...formData, example: e.target.value })} placeholder={t('modal_example_placeholder') || "Dieses Tier produziert ein starkes Gift."} className="w-full rounded-xl border-gray-200 border p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none" />
              </div>
            </div>
            <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-6 py-3 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">{t('cancel')}</button>
              <button onClick={handleSave} disabled={!formData.german || !formData.hungarian} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors disabled:opacity-50">
                {editingId || editingStaticWord ? (t('modal_save_changes') || 'Save Changes') : (t('save_content') || 'Save Content')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}