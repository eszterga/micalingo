import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { dbCloud } from '../lib/firebase';
import { useAuth } from '../AuthContext';
import { useI18n } from '../I18nContext';
import { addCloudWord, useCloudVocabulary, findVocabDuplicate, vocabCategoryKey } from '../lib/firestore';
import { ImageLightbox, useImageLightbox } from '../components/ImageLightbox';
import ArticleContent from '../components/ArticleContent';

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
      return <iframe style={{ borderRadius: "12px" }} src={`https://open.spotify.com/embed${pathname}`} width="100%" height="152" frameBorder="0" allowFullScreen allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" className="shadow-sm" title="Spotify player" />;
    } catch (e) {
      console.error("Invalid Spotify URL", e);
    }
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg w-full">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
      {t("play_content") || "Play Content"}
    </a>
  );
};

export default function PrivateMaterials({ type }: { type: 'reading' | 'listening' }) {
  const { t } = useI18n();
  const { user, isAdmin, adminMode } = useAuth();
  const userVocabulary = useCloudVocabulary(user?.uid) || [];
  const publicVocabulary = useCloudVocabulary("PUBLIC_LIBRARY") || [];
  
  const collectionName = type === 'reading' ? 'private_reading' : 'private_listening';
  const defaultIcon = type === 'reading' ? '📂' : '🎧';
  const defaultCategories = useMemo(() => [
    { id: "cat1", icon: defaultIcon, title: t('private_category_1') || "Category 1", items: [] },
    { id: "cat2", icon: defaultIcon, title: t('private_category_2') || "Category 2", items: [] },
    { id: "cat3", icon: defaultIcon, title: t('private_category_3') || "Category 3", items: [] },
    { id: "cat4", icon: defaultIcon, title: t('private_category_4') || "Category 4", items: [] },
    { id: "cat5", icon: defaultIcon, title: t('private_category_5') || "Category 5", items: [] }
  ], [defaultIcon]);

  const [categories, setCategories] = useState<any[]>(defaultCategories);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>(() => {
    try {
      const saved = sessionStorage.getItem(`micalingo_private_${type}_sections`);
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryTitleInput, setCategoryTitleInput] = useState("");
  
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [bookmarks, setBookmarks] = useState<Record<string, string>>({});
  const [bookmarkPopup, setBookmarkPopup] = useState<{ itemId: string, text: string, x: number, y: number } | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [editingItemCategory, setEditingItemCategory] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ title: "", url: "", source: "", content: "" });
  const contentRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [selectedTable, setSelectedTable] = useState<HTMLTableElement | null>(null);
  const { image: lightboxImage, handleImageClick, openTable, closeLightbox } = useImageLightbox();

  const savedSelection = useRef<Range | null>(null);
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0);
    }
  };
  const restoreSelection = () => {
    if (savedSelection.current) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedSelection.current);
    }
  };

  const applyTableStyle = (action: string, value?: string) => {
    if (!selectedTable) return;
    if (action === 'align') {
      if (value === 'center') {
        selectedTable.style.marginLeft = 'auto';
        selectedTable.style.marginRight = 'auto';
        selectedTable.style.float = 'none';
      } else if (value === 'left') {
        selectedTable.style.marginLeft = '0';
        selectedTable.style.marginRight = 'auto';
        selectedTable.style.float = 'left';
      } else if (value === 'right') {
        selectedTable.style.marginLeft = 'auto';
        selectedTable.style.marginRight = '0';
        selectedTable.style.float = 'right';
      }
    } else if (action === 'width') {
      selectedTable.style.width = value!;
    } else if (action === 'addRow') {
      const rowCount = selectedTable.rows.length;
      const colCount = rowCount > 0 ? selectedTable.rows[0].cells.length : 1;
      const newRow = selectedTable.insertRow();
      for (let i = 0; i < colCount; i++) {
        const cell = newRow.insertCell();
        cell.innerHTML = '&nbsp;';
        cell.style.border = '1px solid #ccc';
        cell.style.padding = '8px';
      }
    } else if (action === 'addColumn') {
      for (let i = 0; i < selectedTable.rows.length; i++) {
        const cell = selectedTable.rows[i].insertCell();
        cell.innerHTML = '&nbsp;';
        cell.style.border = '1px solid #ccc';
        cell.style.padding = '8px';
      }
    }
    if (contentRef.current) {
      setEditData(prev => ({ ...prev, content: contentRef.current!.innerHTML }));
    }
  };

  const handleInsertTable = () => {
    const dims = window.prompt("Enter table dimensions (rows,columns) e.g., '3,3'", "3,3");
    if (!dims) return;
    const [rows, cols] = dims.split(',').map(Number);
    if (!rows || !cols || rows <= 0 || cols <= 0) return;
    
    let html = '<table style="width: 100%; border-collapse: collapse; margin-bottom: 1rem;"><tbody>';
    for (let i = 0; i < rows; i++) {
      html += '<tr>';
      for (let j = 0; j < cols; j++) {
        html += '<td style="border: 1px solid #ccc; padding: 8px;">&nbsp;</td>';
      }
      html += '</tr>';
    }
    html += '</tbody></table><p><br></p>';
    
    if (contentRef.current) {
      contentRef.current.focus();
      document.execCommand('insertHTML', false, html);
      setEditData(prev => ({ ...prev, content: contentRef.current!.innerHTML }));
    }
  };

  const applyImageStyle = (action: string, value: string) => {
    if (!selectedImage) return;
    if (action === 'align') {
      if (value === 'center') {
        selectedImage.style.display = 'block';
        selectedImage.style.float = 'none';
        selectedImage.style.margin = '8px auto';
      } else if (value === 'left') {
        selectedImage.style.display = 'inline-block';
        selectedImage.style.float = 'left';
        selectedImage.style.margin = '8px 16px 8px 0';
      } else if (value === 'right') {
        selectedImage.style.display = 'inline-block';
        selectedImage.style.float = 'right';
        selectedImage.style.margin = '8px 0 8px 16px';
      }
    } else if (action === 'width') {
      selectedImage.style.width = value;
    }
    if (contentRef.current) {
      setEditData(prev => ({ ...prev, content: contentRef.current!.innerHTML }));
    }
  };

  const [isSaveWordModalOpen, setIsSaveWordModalOpen] = useState(false);
  const [newGerman, setNewGerman] = useState("");
  const [newArticle, setNewArticle] = useState("der");
  const [newNoun, setNewNoun] = useState("");
  const [newHungarian, setNewHungarian] = useState("");
  const [newExample, setNewExample] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newCategory, setNewCategory] = useState("vocabulary");
  const [saveToPublic, setSaveToPublic] = useState(isAdmin ? adminMode : false);

  useEffect(() => {
    setSaveToPublic(isAdmin ? adminMode : false);
  }, [isAdmin, adminMode]);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(`micalingo_private_${type}_sections`);
      setExpandedCategories(saved ? JSON.parse(saved) : {});
    } catch (e) {
      setExpandedCategories({});
    }
  }, [type]);

  useEffect(() => {
    const fetchBookmarks = async () => {
      if (user) {
        try {
          const q = query(collection(dbCloud, "bookmarks"), where("userId", "==", user.uid), where("categoryId", "==", collectionName));
          const snapshot = await getDocs(q);
          const bms: Record<string, string> = {};
          snapshot.forEach(doc => { bms[doc.data().itemId] = doc.data().snippet; });
          setBookmarks(bms);
        } catch (e) {
          console.error("Error fetching bookmarks:", e);
        }
      }
    };
    fetchBookmarks();
  }, [user?.uid, collectionName]);

  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      if (!(e.target as Element).closest("#bookmark-popover")) {
        setBookmarkPopup(null);
      }
    };
    document.addEventListener("mousedown", handleGlobalClick);
    document.addEventListener("touchstart", handleGlobalClick);
    return () => {
      document.removeEventListener("mousedown", handleGlobalClick);
      document.removeEventListener("touchstart", handleGlobalClick);
    };
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (user) {
        try {
          const docRef = doc(dbCloud, collectionName, user.uid);
          const snapshot = await getDoc(docRef);
          if (snapshot.exists() && snapshot.data().categories) {
            setCategories(snapshot.data().categories);
          } else {
            const localData = localStorage.getItem(`micalingo_${collectionName}_${user.uid}`);
            if (localData) {
              try {
                const parsed = JSON.parse(localData);
                if (parsed && Array.isArray(parsed) && parsed.length > 0) {
                  setCategories(parsed);
                  setDoc(docRef, { categories: parsed }, { merge: true });
                } else {
                  setCategories(defaultCategories);
                }
              } catch {
                setCategories(defaultCategories);
              }
            } else {
              setCategories(defaultCategories);
            }
          }
        } catch (e) {
          console.error(`Error loading ${collectionName} data:`, e);
          const localData = localStorage.getItem(`micalingo_${collectionName}_${user.uid}`);
          if (localData) {
            try { setCategories(JSON.parse(localData)); } catch { setCategories(defaultCategories); }
          } else {
            setCategories(defaultCategories);
          }
        }
      }
    };
    loadData();
  }, [user?.uid, collectionName, defaultCategories]);

  useEffect(() => {
    if (isModalOpen && contentRef.current && contentRef.current.innerHTML !== editData.content) {
      contentRef.current.innerHTML = editData.content;
    }
  }, [editData.content, isModalOpen]);

  const saveCategories = async (newCategories: any[]) => {
    setCategories(newCategories);
    if (user) {
      localStorage.setItem(`micalingo_${collectionName}_${user.uid}`, JSON.stringify(newCategories));
      try {
        await setDoc(doc(dbCloud, collectionName, user.uid), { categories: newCategories }, { merge: true });
      } catch (e) {
        console.error("Error saving to cloud:", e);
      }
    }
  };

  const toggleCategory = (id: string) => setExpandedCategories(prev => {
    const next = { ...prev, [id]: !prev[id] };
    sessionStorage.setItem(`micalingo_private_${type}_sections`, JSON.stringify(next));
    return next;
  });
  
  const handleMouseUp = (_e: React.MouseEvent | React.TouchEvent, itemId: string) => {
    if (!user) return;
    setTimeout(() => {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (text && text.length > 2) {
        const rect = selection!.getRangeAt(0).getBoundingClientRect();
        setBookmarkPopup({ itemId, text, x: rect.left + rect.width / 2, y: rect.top - 45 });
      } else {
        setBookmarkPopup(null);
      }
    }, 150);
  };

  const saveBookmark = async () => {
    if (bookmarkPopup && user) {
      try {
        const { itemId, text } = bookmarkPopup;
        await setDoc(doc(dbCloud, "bookmarks", `${user.uid}_${itemId}`), {
          userId: user.uid,
          categoryId: collectionName,
          itemId,
          snippet: text,
          updatedAt: Date.now()
        });
        setBookmarks(prev => ({ ...prev, [itemId]: text }));
        setBookmarkPopup(null);
        window.getSelection()?.removeAllRanges();
      } catch (e) {
        console.error("Error saving bookmark:", e);
      }
    }
  };

  const deleteBookmark = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (user) {
      try {
        await deleteDoc(doc(dbCloud, "bookmarks", `${user.uid}_${itemId}`));
        setBookmarks(prev => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
      } catch (err) {
        console.error("Error deleting bookmark:", err);
      }
    }
  };

  const handleContinueFrom = (e: React.MouseEvent, itemId: string, snippet: string) => {
    e.stopPropagation();
    e.preventDefault();
    setExpandedItems(prev => new Set(prev).add(itemId));
    setTimeout(() => {
      const container = document.getElementById(`article-content-${itemId}`);
      if (!container) return;
      const elements = Array.from(container.querySelectorAll("p, h1, h2, h3, h4, h5, h6, li, span, div, b, i, em, strong"));
      for (const el of elements) {
        if (el.textContent && el.textContent.includes(snippet)) {
          const htmlElement = el as HTMLElement;
          const originalHtml = htmlElement.innerHTML;
          let highlighted = false;
          try {
            const escapedSnippet = snippet.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            const regex = new RegExp(`(${escapedSnippet})`, "g");
            if (regex.test(originalHtml)) {
              htmlElement.innerHTML = originalHtml.replace(regex, '<mark id="temp-highlight" class="bg-yellow-300 text-gray-900 rounded px-1 transition-colors duration-700">$1</mark>');
              const mark = htmlElement.querySelector("#temp-highlight");
              if (mark) {
                mark.scrollIntoView({ behavior: "smooth", block: "center" });
                setTimeout(() => {
                  const m = htmlElement.querySelector("#temp-highlight");
                  if (m) {
                    m.classList.remove("bg-yellow-300");
                    m.classList.add("bg-transparent");
                  }
                  setTimeout(() => { htmlElement.innerHTML = originalHtml; }, 1000);
                }, 2000);
                highlighted = true;
              }
            }
          } catch (err) {
            console.error("Highlighting error:", err);
          }
          if (!highlighted) {
            htmlElement.scrollIntoView({ behavior: "smooth", block: "center" });
            const oldBg = htmlElement.style.backgroundColor;
            htmlElement.style.backgroundColor = "#fef08a";
            htmlElement.style.transition = "background-color 0.5s";
            setTimeout(() => { htmlElement.style.backgroundColor = oldBg; }, 2000);
          }
          break;
        }
      }
    }, 300);
  };

  const startEditCategory = (e: React.MouseEvent, cat: any) => {
    e.stopPropagation();
    setEditingCategory(cat.id);
    setCategoryTitleInput(cat.title);
  };
  const saveCategoryTitle = (e: React.MouseEvent | React.KeyboardEvent, catId: string) => {
    e.stopPropagation();
    const next = categories.map(c => c.id === catId ? { ...c, title: categoryTitleInput || c.title } : c);
    saveCategories(next);
    setEditingCategory(null);
  };

  const openSaveWordModal = () => {
    if (bookmarkPopup) {
      const text = bookmarkPopup.text;
      setNewGerman(text);
      const match = text.match(/^(der|die|das)\s+(.*)/i);
      if (match) {
        setNewArticle(match[1].toLowerCase());
        setNewNoun(match[2]);
      } else {
        setNewArticle("der");
        setNewNoun(text);
      }
      setNewHungarian("");
      setNewExample("");
      setNewNote("");
      setNewCategory("vocabulary");
      setIsSaveWordModalOpen(true);
      setBookmarkPopup(null);
    }
  };

  const handleSaveWord = async () => {
    const finalGerman = newCategory === 'articles' ? `${newArticle} ${newNoun.trim()}` : newGerman.trim();
    if (!finalGerman || !newHungarian.trim() || !user) {
      alert(t('alert_fill_fields_login'));
      return;
    }

    const isPublicSave = isAdmin && adminMode && saveToPublic;
    const targetUserId = isPublicSave ? "PUBLIC_LIBRARY" : user.uid;
    const targetVocabulary = isPublicSave ? publicVocabulary : userVocabulary;
    const saveCategory = vocabCategoryKey(newCategory);

    // reading (to read) and vocabulary quiz are separate libraries — same word may exist in both
    const duplicate = findVocabDuplicate(targetVocabulary, finalGerman, saveCategory);

    if (duplicate) {
          const catKey = vocabCategoryKey(duplicate.category);
          let catName = t(`dropdown_${catKey}`);
          if (catName === `dropdown_${catKey}`) catName = catKey;
      alert(t('alert_word_exists', { category: catName }));
      return;
    }

    await addCloudWord({
      userId: targetUserId, german: finalGerman, hungarian: newHungarian.trim(), example: newExample.trim(), note: saveCategory === 'false_friends' ? newNote.trim() : "", dateAdded: Date.now(), category: saveCategory
    } as any);
    setIsSaveWordModalOpen(false);
    alert(t('saved') || 'Saved!');
  };

  const openAddModal = (catId: string) => {
    setEditingItemCategory(catId);
    setEditingItemId(null);
    setEditData({ title: "", url: "", source: "", content: "<p><br></p>" });
    setIsModalOpen(true);
  };

  const openEditModal = (catId: string, item: any) => {
    setEditingItemCategory(catId);
    setEditingItemId(item.id);
    setEditData(item);
    setIsModalOpen(true);
  };

  const handleFetchContent = async () => {
    if (editData.url) {
      setIsFetching(true);
      try {
        if (type === 'reading') {
          const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(editData.url)}`;
          const res = await fetch(proxyUrl);
          const data = await res.json();
          if (data.contents) {
            const parser = new DOMParser();
            const doc = parser.parseFromString(data.contents, "text/html");
            const title = doc.querySelector("title")?.textContent || doc.querySelector("h1")?.textContent || "";
            const article = doc.querySelector("article") || doc.querySelector("main") || doc.body;
            let content = "";
            if (article) {
              content = Array.from(article.querySelectorAll("p"))
                .map(p => (p as HTMLElement).textContent?.trim() || "")
                .filter(t => t.length > 20)
                .map(t => `<p>${t}</p>`)
                .join("");
            }
            const finalContent = content || "<p>Could not automatically extract clean content. Please paste manually.</p>";
            setEditData(prev => ({ ...prev, title, content: finalContent }));
            if (contentRef.current) contentRef.current.innerHTML = finalContent;
          }
        } else {
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
        }
      } catch (e) {
        console.error("Error fetching content:", e);
        alert(t("fetch_error_audio") || "Failed to fetch content. Please check the URL or paste manually.");
      } finally {
        setIsFetching(false);
      }
    }
  };

  const handleSaveItem = () => {
    if (!editData.title || !editingItemCategory) return;
    const next = categories.map(c => {
      if (c.id === editingItemCategory) {
        if (editingItemId) {
          return { ...c, items: (c.items || []).map((i: any) => i.id === editingItemId ? { ...editData, id: editingItemId } : i) };
        } else {
          return { ...c, items: [{ ...editData, id: Date.now().toString() }, ...(c.items || [])] };
        }
      }
      return c;
    });
    saveCategories(next);
    setIsModalOpen(false);
    setEditingItemId(null);
  };

  const handleDeleteItem = (catId: string, itemId: string) => {
    if (!confirm(t("delete") || "Are you sure you want to delete this item?")) return;
    const next = categories.map(c => c.id === catId ? { ...c, items: (c.items || []).filter((i: any) => i.id !== itemId) } : c);
    saveCategories(next);
  };

  const processImageFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        } else {
          if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        // Compress the image to avoid hitting Firestore's 1MB document size limit
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        const imgHtml = `<br><img src="${dataUrl}" alt="Image" style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 8px; margin-bottom: 8px;" /><br>`;
        
        if (contentRef.current) {
          contentRef.current.focus();
          document.execCommand("insertHTML", false, imgHtml);
          setEditData(prev => ({ ...prev, content: contentRef.current!.innerHTML }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
      e.target.value = '';
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    let hasImage = false;
    
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        hasImage = true;
        const blob = items[i].getAsFile();
        if (blob) processImageFile(blob);
        e.preventDefault();
        break;
      }
    }
    
    if (hasImage) return;

    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    if (!html && text) {
      e.preventDefault();
      const formatted = text.split(/\r?\n\r?\n/).filter(x => x.trim() !== "").map(x => `<p>${x.replace(/\r?\n/g, "<br/>")}</p>`).join("");
      document.execCommand("insertHTML", false, formatted);
    }
  };

  const handleInsertList = (e: React.MouseEvent) => {
    e.preventDefault();
    const selection = window.getSelection();
    if (!selection?.rangeCount) {
      document.execCommand("insertUnorderedList", false);
      return;
    }

    const selectedText = selection.toString();
    if (selectedText.trim() === '') {
      document.execCommand("insertUnorderedList", false);
      return;
    }

    const lines = selectedText.split('\n').filter(line => line.trim() !== '');
    if (lines.length > 0) {
      const listHtml = '<ul>' + lines.map(line => `<li>${line}</li>`).join('') + '</ul>';
      document.execCommand('insertHTML', false, listHtml);
    }
  };

  return (
    <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
      <BackgroundBlobs />
      <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 px-4 md:px-8">
        <div className="flex items-center gap-4">
          <Link to="/learning-materials?tab=private" className="bg-white/70 backdrop-blur-md border border-white text-gray-700 hover:bg-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2">
            {t("back_button")}
          </Link>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 tracking-tight pb-2 capitalize">
              {type === 'reading' ? t("read_materials") : t("listen_materials")}
            </h1>
            <p className="text-lg text-blue-900/70 font-medium mt-1">
              {t((type === 'reading' ? "private_reading_hint" : "private_listening_hint") as any)}
            </p>
          </div>
        </div>

        <div className="space-y-6 pt-4">
          <div className="bg-blue-50/80 backdrop-blur-sm border border-blue-200/60 text-blue-900 p-5 rounded-[1.5rem] shadow-sm text-sm font-medium mb-6 flex items-center gap-3">
            <span className="text-xl">🔖</span>
            {t("bookmark_instructions_logged_in") || "Highlight any text while reading to save a bookmark, or save the highlighted text directly to your personal vocabulary database or into your quizzes!"}
          </div>

          {categories.map((cat) => (
            <section key={cat.id} className="bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 md:p-8 transition-all duration-300 hover:bg-white/80">
              <button onClick={() => toggleCategory(cat.id)} className="w-full flex items-center justify-between group outline-none">
                <div className="flex items-center gap-4 flex-1">
                  <span className="bg-blue-100 text-blue-600 p-3 rounded-2xl text-xl shadow-sm group-hover:scale-110 transition-transform duration-300">{cat.icon}</span>
                  {editingCategory === cat.id ? (
                    <div className="flex items-center gap-2 flex-1 max-w-sm" onClick={e => e.stopPropagation()}>
                      <input type="text" autoFocus value={categoryTitleInput} onChange={e => setCategoryTitleInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveCategoryTitle(e, cat.id)} className="px-3 py-1.5 border border-blue-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-xl font-extrabold text-blue-950 bg-white/80 w-full shadow-inner" />
                      <button onClick={e => saveCategoryTitle(e, cat.id)} className="bg-green-500 hover:bg-green-600 text-white p-2 rounded-xl shadow-sm transition-colors"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg></button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-extrabold text-blue-950 m-0">{cat.title}</h2>
                      <button onClick={e => startEditCategory(e, cat)} className="text-gray-400 hover:text-blue-600 transition-colors p-1" title={t("edit_category")}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg></button>
                    </div>
                  )}
                </div>
                <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600 transition-transform duration-500 flex-shrink-0 ml-4 ${expandedCategories[cat.id] ? "rotate-180" : ""}`}>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </button>
              
              <div className={`grid transition-[grid-template-rows,opacity,margin] duration-500 ease-in-out ${expandedCategories[cat.id] ? "grid-rows-[1fr] opacity-100 mt-6" : "grid-rows-[0fr] opacity-0 mt-0"}`}>
                <div className="min-h-0 overflow-hidden">
                  <div className="pt-4 border-t border-blue-50/50 flex flex-col gap-4">
                    <div className="flex justify-end">
                      <button onClick={() => openAddModal(cat.id)} className="w-full sm:w-auto justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-sm transition-colors flex items-center gap-2 text-sm">
                        <span className="text-xl leading-none">+</span> {t((type === 'reading' ? "add_article" : "add_audio") as any)}
                      </button>
                    </div>
                    {!cat.items || cat.items.length === 0 ? (
                      <div className="text-center py-8 text-gray-500 bg-white/40 rounded-xl border border-dashed border-gray-300">
                        {t("no_items") || "No items yet."}
                      </div>
                    ) : (
                      <div className="space-y-6 pt-2 pb-2">
                            {cat.items?.map((item: any) => {
                          const isItemExpanded = expandedItems.has(item.id);
                          return (
                            <div key={item.id} className="relative bg-white/90 backdrop-blur-xl p-5 md:p-6 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-blue-50 transition-all duration-300 group/item">
                              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 w-full">
                                <button onClick={() => setExpandedItems(prev => { const n = new Set(prev); if(n.has(item.id)) n.delete(item.id); else n.add(item.id); return n; })} className="flex-1 w-full flex items-center justify-between group outline-none text-left">
                                  <div className="flex flex-col items-start gap-2 text-left pr-4">
                                    <h3 className="font-extrabold text-gray-900 group-hover/item:text-blue-700 transition-colors text-xl m-0 leading-tight">{item.title}</h3>
                                    {bookmarks[item.id] && (
                                      <div className="flex items-center gap-2 mt-1">
                                        <span onClick={(e) => handleContinueFrom(e, item.id, bookmarks[item.id])} className="inline-flex items-center gap-1.5 text-xs font-bold bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-lg hover:bg-yellow-200 transition-colors shadow-sm cursor-pointer border border-yellow-300">
                                          🔖 {t("continue_from") || "Continue from:"} "{bookmarks[item.id].substring(0, 25)}..."
                                        </span>
                                        <button onClick={(e) => deleteBookmark(e, item.id)} className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm" title="Delete bookmark">
                                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                  <div className={`w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shadow-sm text-blue-600 transition-transform duration-500 flex-shrink-0 ml-4 ${isItemExpanded ? "rotate-180" : ""}`}>
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
                                  </div>
                                </button>
                                <div className="flex items-center gap-2 w-full sm:w-auto justify-end sm:border-l sm:border-gray-100 sm:pl-4 pt-3 sm:pt-0 border-t border-gray-100 sm:border-t-0 flex-shrink-0">
                                  <button onClick={(e) => { e.stopPropagation(); openEditModal(cat.id, item); }} className="px-3 py-2 sm:p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 hover:text-blue-700 transition-colors shadow-sm flex items-center gap-2" title={t((type === 'reading' ? "edit_article" : "edit_audio") as any)}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                                    <span className="text-xs font-bold sm:hidden">{t("edit_word") || "Edit"}</span>
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); handleDeleteItem(cat.id, item.id); }} className="px-3 py-2 sm:p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 hover:text-red-600 transition-colors shadow-sm flex items-center gap-2" title={t("delete")}>
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                                    <span className="text-xs font-bold sm:hidden">{t("delete") || "Delete"}</span>
                                  </button>
                                </div>
                              </div>
                              
                              <div className={`grid transition-[grid-template-rows,opacity,margin] duration-500 ease-in-out ${isItemExpanded ? "grid-rows-[1fr] opacity-100 mt-6" : "grid-rows-[0fr] opacity-0 mt-0"}`}>
                                <div className="min-h-0 overflow-hidden">
                                  <div className="pt-2 border-t border-blue-50/50 mt-2">
                                    {item.source && (
                                      <p className="text-sm font-bold text-blue-600 mt-4 mb-6 flex items-center gap-2">
                                        <span className="bg-blue-100 p-1.5 rounded-lg text-xs shadow-sm">{type === 'reading' ? '📰' : type === 'listening' ? '🎧' : '✍️'}</span> {item.source}
                                      </p>
                                    )}
                                    {type === 'listening' && item.url ? (
                                      <div className="flex flex-col lg:flex-row gap-8 items-start">
                                        <div className="flex-1 w-full order-2 lg:order-1">
                                          <ArticleContent id={`article-content-${item.id}`} html={item.content} onImageClick={handleImageClick} onExpandTable={openTable} onMouseUp={(e) => handleMouseUp(e, item.id)} onTouchEnd={(e) => handleMouseUp(e, item.id)} className="prose prose-blue max-w-none text-gray-700 leading-relaxed space-y-4 mb-4" />
                                        </div>
                                        <div className="w-full lg:w-80 flex-shrink-0 lg:sticky lg:top-4 bg-blue-50/50 p-4 rounded-3xl border border-blue-100 shadow-sm order-1 lg:order-2 mb-4 lg:mb-0">
                                          <div className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-3 px-2">{t("media_player") || "Media Player"}</div>
                                          <MediaPlayer url={item.url} t={t} />
                                        </div>
                                      </div>
                                  ) : ( // This is the reading block
                                    <>
                                      <ArticleContent id={`article-content-${item.id}`} html={item.content} onImageClick={handleImageClick} onExpandTable={openTable} onMouseUp={(e) => handleMouseUp(e, item.id)} onTouchEnd={(e) => handleMouseUp(e, item.id)} className="prose prose-blue max-w-none text-gray-700 leading-relaxed space-y-4 mb-4" />
                                      {item.url && (
                                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-block mt-4 text-blue-600 hover:text-blue-800 font-medium text-sm">
                                          {t("original_source") || "Original source"} ↗
                                        </a>
                                      )}
                                    </>
                                  )} 
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          ))}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-extrabold text-blue-950">
                {editingItemId ? t((type === 'reading' ? "edit_article" : "edit_audio") as any) : t((type === 'reading' ? "add_article" : "add_audio") as any)}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t("url_optional") || "URL (Optional)"}</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input type="url" value={editData.url} onChange={e => setEditData({ ...editData, url: e.target.value })} className="flex-1 w-full rounded-xl border-gray-200 border p-3 focus:ring-2 focus:ring-blue-500 outline-none" />
                  <button onClick={handleFetchContent} disabled={!editData.url || isFetching} className="w-full sm:w-auto bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 whitespace-nowrap">
                    {isFetching ? "..." : t((type === 'reading' ? "fetch_article" : type === 'listening' ? "fetch_audio" : "fetch_content") as any) || "Fetch Content"}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t("title_label") || "Title"}</label>
                <input type="text" value={editData.title} onChange={e => setEditData({ ...editData, title: e.target.value })} className="w-full rounded-xl border-gray-200 border p-3 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t("source_author") || "Source / Author"}</label>
                <input type="text" value={editData.source} onChange={e => setEditData({ ...editData, source: e.target.value })} className="w-full rounded-xl border-gray-200 border p-3 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">{t("content_label") || "Content"}</label>
                <div className="w-full rounded-xl border-gray-200 border focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all overflow-hidden flex flex-col bg-white">
                  <div className="bg-gray-50 border-b border-gray-200 p-2 flex gap-2 flex-wrap">
                    <button type="button" onClick={e => { e.preventDefault(); document.execCommand("bold", false); }} className="px-3 py-1 bg-white border border-gray-300 rounded font-bold hover:bg-gray-200 text-sm transition-colors shadow-sm">B</button>
                    <button type="button" onClick={e => { e.preventDefault(); document.execCommand("italic", false); }} className="px-3 py-1 bg-white border border-gray-300 rounded italic hover:bg-gray-200 text-sm transition-colors shadow-sm">I</button>
                    <div className="w-px h-6 bg-gray-300 self-center mx-1"></div>
                    <button type="button" onClick={e => { e.preventDefault(); document.execCommand("justifyLeft", false); }} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-sm shadow-sm" title="Align Left">⬅️</button>
                    <button type="button" onClick={e => { e.preventDefault(); document.execCommand("justifyCenter", false); }} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-sm shadow-sm" title="Align Center">↔️</button>
                    <button type="button" onClick={e => { e.preventDefault(); document.execCommand("justifyRight", false); }} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-sm shadow-sm" title="Align Right">➡️</button>
                    <div className="w-px h-6 bg-gray-300 self-center mx-1"></div>
                    <button type="button" onClick={e => { e.preventDefault(); document.execCommand("formatBlock", false, "H2"); }} className="px-3 py-1 bg-white border border-gray-300 rounded font-bold hover:bg-gray-200 text-sm text-gray-700 transition-colors shadow-sm">H2</button>
                    <button type="button" onClick={e => { e.preventDefault(); document.execCommand("formatBlock", false, "H3"); }} className="px-3 py-1 bg-white border border-gray-300 rounded font-bold hover:bg-gray-200 text-sm text-gray-700 transition-colors shadow-sm">H3</button>
                    <button type="button" onClick={e => { e.preventDefault(); document.execCommand("formatBlock", false, "P"); }} className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-sm text-gray-700 transition-colors shadow-sm">P</button>
                    <div className="w-px h-6 bg-gray-300 self-center mx-1"></div>
                    <button type="button" onClick={handleInsertList} className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-sm text-gray-700 transition-colors shadow-sm font-medium">• Bullet List</button>
                    <button type="button" onClick={e => { e.preventDefault(); document.execCommand("undo", false); }} className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-sm text-gray-700 transition-colors shadow-sm font-medium">↩ Undo</button>
                    <div className="w-px h-6 bg-gray-300 self-center mx-1"></div>
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-sm text-gray-700 transition-colors shadow-sm font-medium flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg> {t('add_image') || 'Add Image'}
                    </button>
                    <div className="w-px h-6 bg-gray-300 self-center mx-1"></div>
                    <select onChange={(e) => { restoreSelection(); document.execCommand("fontSize", false, e.target.value); setEditData(prev => ({ ...prev, content: contentRef.current!.innerHTML })); e.target.value = ""; }} className="px-2 py-1 bg-white border border-gray-300 rounded text-sm shadow-sm outline-none cursor-pointer">
                      <option value="">Size</option><option value="1">Small</option><option value="3">Normal</option><option value="5">Large</option><option value="7">Huge</option>
                    </select>
                    <div className="flex items-center border border-gray-300 rounded bg-white shadow-sm px-1" title="Text Color">
                      <span className="text-xs text-gray-500 px-1 font-serif">A</span><input type="color" onChange={(e) => { restoreSelection(); document.execCommand("foreColor", false, e.target.value); setEditData(prev => ({ ...prev, content: contentRef.current!.innerHTML })); }} className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer" />
                    </div>
                    <div className="flex items-center border border-gray-300 rounded bg-white shadow-sm px-1" title="Highlight Color">
                      <span className="text-xs text-gray-500 px-1 font-serif bg-yellow-200">A</span><input type="color" onChange={(e) => { restoreSelection(); document.execCommand("hiliteColor", false, e.target.value); setEditData(prev => ({ ...prev, content: contentRef.current!.innerHTML })); }} className="w-5 h-5 p-0 border-0 bg-transparent cursor-pointer" />
                    </div>
                    <button type="button" onClick={handleInsertTable} className="px-3 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-sm text-gray-700 transition-colors shadow-sm font-medium flex items-center gap-1">📊 Table</button>
                    <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
                  </div>
                  {selectedImage && (
                    <div className="bg-blue-50/50 border-b border-gray-200 p-2 flex gap-2 flex-wrap items-center">
                      <span className="text-xs font-bold text-blue-800 uppercase ml-1 mr-2">Image:</span>
                      <button type="button" onClick={() => applyImageStyle('align', 'left')} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-xs shadow-sm font-medium">Left</button>
                      <button type="button" onClick={() => applyImageStyle('align', 'center')} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-xs shadow-sm font-medium">Center</button>
                      <button type="button" onClick={() => applyImageStyle('align', 'right')} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-xs shadow-sm font-medium">Right</button>
                      <div className="w-px h-5 bg-gray-300 self-center mx-1"></div>
                      <button type="button" onClick={() => applyImageStyle('width', '25%')} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-xs shadow-sm font-medium">25%</button>
                      <button type="button" onClick={() => applyImageStyle('width', '50%')} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-xs shadow-sm font-medium">50%</button>
                      <button type="button" onClick={() => applyImageStyle('width', '75%')} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-xs shadow-sm font-medium">75%</button>
                      <button type="button" onClick={() => applyImageStyle('width', '100%')} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-xs shadow-sm font-medium">100%</button>
                    </div>
                  )}
                  {selectedTable && (
                    <div className="bg-green-50/50 border-b border-gray-200 p-2 flex gap-2 flex-wrap items-center">
                      <span className="text-xs font-bold text-green-800 uppercase ml-1 mr-2">Table:</span>
                      <button type="button" onClick={() => applyTableStyle('align', 'left')} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-xs shadow-sm font-medium">Left</button>
                      <button type="button" onClick={() => applyTableStyle('align', 'center')} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-xs shadow-sm font-medium">Center</button>
                      <button type="button" onClick={() => applyTableStyle('align', 'right')} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-xs shadow-sm font-medium">Right</button>
                      <div className="w-px h-5 bg-gray-300 self-center mx-1"></div>
                      <button type="button" onClick={() => applyTableStyle('width', '25%')} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-xs shadow-sm font-medium">25%</button>
                      <button type="button" onClick={() => applyTableStyle('width', '50%')} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-xs shadow-sm font-medium">50%</button>
                      <button type="button" onClick={() => applyTableStyle('width', '75%')} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-xs shadow-sm font-medium">75%</button>
                      <button type="button" onClick={() => applyTableStyle('width', '100%')} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-xs shadow-sm font-medium">100%</button>
                      <div className="w-px h-5 bg-gray-300 self-center mx-1"></div>
                      <button type="button" onClick={() => applyTableStyle('addRow')} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-xs shadow-sm font-medium flex items-center gap-1">+ Row</button>
                      <button type="button" onClick={() => applyTableStyle('addColumn')} className="px-2 py-1 bg-white border border-gray-300 rounded hover:bg-gray-200 text-xs shadow-sm font-medium flex items-center gap-1">+ Col</button>
                    </div>
                  )}
                  <div ref={contentRef} contentEditable onInput={e => setEditData({ ...editData, content: e.currentTarget.innerHTML })} onPaste={handlePaste} onMouseUp={saveSelection} onClick={(e) => { saveSelection(); const target = e.target as HTMLElement; if (target.tagName === 'IMG') { setSelectedImage(target as HTMLImageElement); setSelectedTable(null); handleImageClick(e); } else { setSelectedImage(null); const table = target.closest('table'); setSelectedTable((table as HTMLTableElement) || null); } }} onKeyUp={() => { saveSelection(); setSelectedImage(null); const sel = window.getSelection(); if (sel && sel.anchorNode) { const table = sel.anchorNode.parentElement?.closest('table'); setSelectedTable((table as HTMLTableElement) || null); } else { setSelectedTable(null); } }} className="p-4 min-h-[200px] max-h-[50vh] overflow-y-auto overflow-x-auto outline-none prose prose-blue max-w-none focus:bg-blue-50/10 transition-colors bg-white"></div>
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-bold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200">{t("cancel")}</button>
              <button onClick={handleSaveItem} disabled={!editData.title} className="bg-blue-600 text-white font-bold py-3 px-8 rounded-xl disabled:opacity-50">{t("save_button") || "Save"}</button>
            </div>
          </div>
        </div>
      )}

      {bookmarkPopup && (
        <div id="bookmark-popover" className="fixed z-50 animate-fade-in-up flex gap-[1px]" style={{ left: window.innerWidth > 768 ? bookmarkPopup.x : "50%", top: window.innerWidth > 768 ? bookmarkPopup.y : "auto", bottom: window.innerWidth > 768 ? "auto" : "30px", transform: "translateX(-50%)" }}>
          <button onClick={saveBookmark} className="bg-blue-900 text-white font-bold text-sm px-5 py-3 md:px-4 md:py-2 rounded-l-full md:rounded-l-xl shadow-2xl md:shadow-xl flex items-center gap-2 hover:bg-blue-800 transition-all">
            🔖 {t("save_bookmark") || "Bookmark"}
          </button>
          <button onClick={openSaveWordModal} className="bg-green-600 text-white font-bold text-sm px-5 py-3 md:px-4 md:py-2 rounded-r-full md:rounded-r-xl shadow-2xl md:shadow-xl flex items-center gap-2 hover:bg-green-700 transition-all">
            💾 {t("save_to_vocabulary") || "Save Word"}
          </button>
        </div>
      )}

      {isSaveWordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-extrabold text-blue-950">{t('modal_add_word_title')}</h2>
              <button onClick={() => setIsSaveWordModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
              {isAdmin && adminMode && (
                <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-xl border border-purple-200 shadow-sm w-full mb-4">
                  <span className="text-sm font-bold text-purple-900 mr-2">Admin Target:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={saveToPublic}
                      onChange={(e) => setSaveToPublic(e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600" />
                    <span className="ml-3 text-sm font-medium text-purple-800">
                      {saveToPublic ? 'Public Library' : 'Personal Library'}
                    </span>
                  </label>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_category_label') || 'Category'}</label>
                <select value={newCategory} onChange={(e) => setNewCategory(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50">
                  <option value="vocabulary">{t('dropdown_vocabulary') || 'Vocabulary quiz'}</option>
                  <option value="reading">{t('dropdown_reading') || 'Vocabulary (to read)'}</option>
                  <option value="articles">{t('dropdown_articles') || 'Articles quiz'}</option>
                  <option value="phrases">{t('dropdown_phrases') || 'Phrases and sentences quiz'}</option>
                  <option value="prepositions">{t('dropdown_prepositions') || 'Prepositions quiz'}</option>
                  <option value="adjectives">{t('dropdown_adjectives') || 'Adjectives quiz'}</option>
                  <option value="verbs">{t('dropdown_verbs') || 'Verbs quiz'}</option>
                </select>
              </div>

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
                    <select value={newArticle} onChange={(e) => setNewArticle(e.target.value)} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                      <option value="der">der</option>
                      <option value="die">die</option>
                      <option value="das">das</option>
                    </select>
                  </div>
                  <div className="w-2/3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_noun_label') || 'Noun (with plural) *'}</label>
                    <input type="text" value={newNoun} onChange={(e) => setNewNoun(e.target.value)} placeholder={t('modal_noun_placeholder') || 'e.g. Mann, die Männer'} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{germanLabel}</label>
                  <input type="text" value={newGerman} onChange={(e) => setNewGerman(e.target.value)} placeholder={germanPlaceholder} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_hungarian_label')}</label>
                <input type="text" value={newHungarian} onChange={(e) => setNewHungarian(e.target.value)} placeholder={hungarianPlaceholder} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('modal_example_label')}</label>
                <input type="text" value={newExample} onChange={(e) => setNewExample(e.target.value)} placeholder={t('modal_example_placeholder')} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              {newCategory === 'false_friends' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('note') || 'Note'} *</label>
                  <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} placeholder={t('template_note_header') || 'Note'} className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              )}
            </div>
            );
          })()}
            </div>

            <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={() => setIsSaveWordModalOpen(false)} className="w-full sm:w-auto px-6 py-3 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">{t('cancel')}</button>
              <button onClick={handleSaveWord} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors">{t('modal_save_word')}</button>
            </div>
          </div>
        </div>
      )}

      <ImageLightbox image={lightboxImage} onClose={closeLightbox} />
    </div>
  );
}