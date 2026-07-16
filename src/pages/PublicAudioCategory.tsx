import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { dbCloud } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { useI18n } from '../I18nContext';

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

const MediaPlayer = ({ url, t }: { url: string, t: any }) => {
  if (!url) return null;
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = url.split("v=")[1]?.split("&")[0] || url.split("youtu.be/")[1]?.split("?")[0];
    if (videoId) {
      return <iframe width="100%" height="220" src={`https://www.youtube.com/embed/${videoId}`} title="YouTube player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="rounded-2xl shadow-sm bg-black" />;
    }
  } else if (url.includes("spotify.com/")) {
    try {
      const pathname = new URL(url).pathname;
      return <iframe style={{ borderRadius: "12px" }} src={`https://open.spotify.com/embed${pathname}`} width="100%" height="152" frameBorder="0" allowFullScreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" className="shadow-sm" />;
    } catch {}
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg w-full">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      {t("play_content") || "Play Content"}
    </a>
  );
};

export default function PublicAudioCategory({ type }: { type: 'music' | 'podcasts' | 'audiobooks' }) {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { t } = useI18n();
  const { user, isAdmin, adminMode } = useAuth();
  
  const [items, setItems] = useState<any[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ title: "", url: "", source: "", content: "" });
  const contentRef = useRef<HTMLDivElement>(null);

  const categoryName = t((categoryId || '') as any) || categoryId;
  const sectionName = type === 'music' ? t("music_section" as any) : type === 'podcasts' ? t("podcasts_section" as any) : t("audiobooks_section" as any);

  useEffect(() => {
    if (isModalOpen && contentRef.current && contentRef.current.innerHTML !== editData.content) {
      contentRef.current.innerHTML = editData.content;
    }
  }, [editData.content, isModalOpen]);

  const fetchItems = async () => {
    try {
      const q = query(collection(dbCloud, "audio"), where("categoryId", "==", categoryId));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter((m: any) => m.userId === "PUBLIC_LIBRARY" || m.userId === user?.uid);
      data.sort((a: any, b: any) => (b.updatedAt || 0) - (a.updatedAt || 0));
      setItems(data);
    } catch (e) {
      console.error("Error fetching audio:", e);
    }
  };

  useEffect(() => {
    fetchItems();
  }, [categoryId, user, adminMode]);

  const handleFetchAudio = async () => {
    if (editData.url) {
      setIsFetching(true);
      try {
        let title = "";
        let source = "";
        if (editData.url.includes("youtube.com") || editData.url.includes("youtu.be")) {
          let url = editData.url.replace("m.youtube.com", "www.youtube.com").replace("music.youtube.com", "www.youtube.com");
          const res = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(url)}`);
          const data = await res.json();
          if (data.title) title = data.title;
          if (data.author_name) source = data.author_name;
        } else if (editData.url.includes("spotify.com")) {
          const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(editData.url)}`);
          const data = await res.json();
          if (data.title) title = data.title;
          if (data.author_name) source = data.author_name;
        }
        const content = (!editData.content.trim() || editData.content === "<p><br></p>") ? `<p>Lyrics/Description for ${title || "this track"}...</p>` : editData.content;
        setEditData(prev => ({ ...prev, title: title || prev.title, source: source || prev.source, content }));
        if (contentRef.current) contentRef.current.innerHTML = content;
      } catch (e) {
        console.error("Error fetching audio details:", e);
        alert(t("fetch_error_audio") || "Failed to fetch audio details. Please check the URL or paste manually.");
      } finally {
        setIsFetching(false);
      }
    }
  };

  const handleSave = async () => {
    if (editData.title && editData.content) {
      try {
        const payload = {
          title: editData.title,
          content: editData.content,
          url: editData.url,
          source: editData.source,
          categoryId,
          userId: isAdmin && adminMode ? "PUBLIC_LIBRARY" : user?.uid,
          updatedAt: Date.now()
        };
        if (editingId) {
          await setDoc(doc(dbCloud, "audio", editingId), payload);
        } else {
          await setDoc(doc(collection(dbCloud, "audio")), payload);
        }
        closeModal();
        await fetchItems();
      } catch (e) {
        console.error("Error saving audio:", e);
        alert(t("save_error_audio") || "Failed to save audio. Make sure you are logged in.");
      }
    }
  };

  const openEditModal = (item: any) => {
    setEditData({ title: item.title || "", url: item.url || "", source: item.source || "", content: item.content || "" });
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm(t("confirm_delete_audio") || "Are you sure you want to delete this audio?")) {
      try {
        await deleteDoc(doc(dbCloud, "audio", id));
        setItems(prev => prev.filter(i => i.id !== id));
      } catch (e) {
        console.error("Error deleting audio:", e);
        alert(t("delete_error_audio") || "Failed to delete audio.");
      }
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditData({ title: "", url: "", source: "", content: "" });
    setEditingId(null);
  };

  const openAddModal = () => {
    setEditData({ title: "", url: "", source: "", content: "<p><br></p>" });
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    if (!html && text) {
      e.preventDefault();
      const formatted = text.split(/\r?\n\r?\n/).filter(x => x.trim() !== "").map(x => `<p>${x.replace(/\r?\n/g, "<br/>")}</p>`).join("");
      document.execCommand("insertHTML", false, formatted);
    }
  };

  return (
    <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
      <BackgroundBlobs />
      <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 px-4 md:px-8">
        <div className="flex items-center gap-4">
          <Link to="/learning-materials/listening" className="bg-white/70 backdrop-blur-md border border-white text-gray-700 hover:bg-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2">
            {t("back_button")}
          </Link>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 tracking-tight pb-2 capitalize">
              {categoryName}
            </h1>
            <p className="text-lg text-blue-900/70 font-medium mt-1">
              {sectionName}
            </p>
          </div>
        </div>

        {isAdmin && adminMode && (
          <div className="flex justify-end">
            <button onClick={openAddModal} className="w-full sm:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-sm transition-colors flex items-center gap-2">
              <span className="text-xl leading-none">+</span> {t("add_audio") || "Add Audio"}
            </button>
          </div>
        )}

        {items.length > 0 ? (
          <div className="space-y-8">
            {items.map((item, index) => {
              const isExpanded = expandedItems.has(item.id);
              return (
                <div key={item.id} className="relative bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white transition-all duration-300">
                  {isAdmin && adminMode && (
                    <div className="absolute top-4 right-4 md:top-8 md:right-8 flex items-center gap-1.5 md:gap-2 z-10">
                      <button onClick={() => openEditModal(item)} className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 hover:text-blue-700 transition-colors shadow-sm" title={t("edit_audio") || "Edit"}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      </button>
                      <button onClick={() => handleDelete(item.id)} className="p-2.5 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors shadow-sm" title={t("delete_audio") || "Delete"}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  )}
                  
                  <button onClick={() => toggleExpand(item.id)} className={`w-full flex items-center justify-between group outline-none text-left ${isAdmin && adminMode ? "pr-20 md:pr-[100px]" : ""}`}>
                    <h2 className="text-2xl font-extrabold text-blue-950 m-0">{item.title}</h2>
                    <div className={`w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shadow-sm text-blue-600 transition-transform duration-500 flex-shrink-0 ml-4 ${isExpanded ? "rotate-180" : ""}`}>
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </button>
                  
                  <div className={`grid transition-[grid-template-rows,opacity,margin] duration-500 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100 mt-6" : "grid-rows-[0fr] opacity-0 mt-0"}`}>
                    <div className="overflow-hidden">
                      <div className="pt-6 border-t border-blue-50/50 mt-2 flex flex-col lg:flex-row gap-8 items-start">
                        <div className="flex-1 w-full order-2 lg:order-1">
                          {item.source && (
                            <p className="text-sm font-bold text-blue-600 mb-6 flex items-center gap-2">
                              <span className="bg-blue-100 p-1.5 rounded-lg text-xs shadow-sm">🎧</span> {item.source}
                            </p>
                          )}
                          <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed space-y-4 mb-4" dangerouslySetInnerHTML={{ __html: item.content }}></div>
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-blue-600 hover:text-blue-800 font-medium text-sm">
                            {t("original_source") || "Original source"} ↗
                          </a>
                        )}
                        </div>
                        {item.url && (
                          <div className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-4 bg-blue-50/50 p-4 rounded-3xl border border-blue-100 shadow-sm order-1 lg:order-2 mb-4 lg:mb-0">
                            <div className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3 px-2">{t("media_player") || "Media Player"}</div>
                            <MediaPlayer url={item.url} t={t} />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white/70 backdrop-blur-xl p-12 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white text-center">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"></path></svg>
            </div>
            <h2 className="text-3xl font-extrabold text-blue-950 mb-3">{isAdmin && adminMode ? t("no_audio_yet_admin") : t("no_audio_yet")}</h2>
            <p className="text-blue-900/70 text-lg font-medium">{isAdmin && adminMode ? "" : t("check_back_later")}</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-extrabold text-blue-950">
                {editingId ? t("edit_audio") || "Edit Audio" : t("add_audio") || "Add Audio"}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">URL (Optional)</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input type="url" value={editData.url} onChange={e => setEditData({ ...editData, url: e.target.value })} placeholder="https://..." className="flex-1 w-full rounded-xl border-gray-200 border p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
                  <button onClick={handleFetchAudio} disabled={!editData.url || isFetching} className="w-full sm:w-auto bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap">
                    {isFetching ? "..." : t("fetch_audio") || "Fetch Content"}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">Note: Fetching works via a proxy. Complex sites might block extraction. You can always paste content manually.</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Title</label>
                <input type="text" value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} className="w-full rounded-xl border-gray-200 border p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Source / Artist</label>
                <input type="text" value={editData.source} onChange={e => setEditData({ ...editData, source: e.target.value })} placeholder="Original source or artist..." className="w-full rounded-xl border-gray-200 border p-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Content</label>
                <div className="w-full rounded-xl border-gray-200 border focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all overflow-hidden flex flex-col bg-white">
                  <div className="bg-gray-50 border-b border-gray-200 p-2 flex gap-2 flex-wrap">
                    <button type="button" onClick={e => { e.preventDefault(); document.execCommand("bold", false); }} className="px-3 py-1 bg-white border border-gray-300 rounded font-bold hover:bg-gray-200 text-sm transition-colors shadow-sm">B</button>
                    <button type="button" onClick={e => { e.preventDefault(); document.execCommand("italic", false); }} className="px-3 py-1 bg-white border border-gray-300 rounded italic hover:bg-gray-200 text-sm transition-colors shadow-sm">I</button>
                    <div className="w-px h-6 bg-gray-300 self-center mx-1"></div>
                    <button type="button" onClick={e => { e.preventDefault(); document.execCommand("formatBlock", false, "H2"); }} className="px-3 py-1 bg-white border border-gray-300 rounded font-bold hover:bg-gray-200 text-sm text-gray-700 transition-colors shadow-sm">H2</button>
                    <button type="button" onClick={e => { e.preventDefault(); document.execCommand("formatBlock", false, "H3"); }} className="px-3 py-1 bg-white border border-gray-300 rounded font-bold hover:bg-gray-200 text-sm text-gray-700 transition-colors shadow-sm">H3</button>
                    <button type="button" onClick={e => { e.preventDefault(); document.execCommand("formatBlock", false, "P"); }} className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-sm text-gray-700 transition-colors shadow-sm">P</button>
                  </div>
                  <div ref={contentRef} contentEditable onInput={e => setEditData({ ...editData, content: e.currentTarget.innerHTML })} onPaste={handlePaste} className="p-4 min-h-[200px] max-h-[50vh] overflow-y-auto outline-none prose prose-blue max-w-none focus:bg-blue-50/10 transition-colors"></div>
                </div>
              </div>
            </div>
            <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={closeModal} className="w-full sm:w-auto px-6 py-3 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">{t("cancel")}</button>
              <button onClick={handleSave} disabled={!editData.title || !editData.content} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors disabled:opacity-50">
                {editingId ? t("modal_save_changes") : t("save_audio") || "Save Audio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}