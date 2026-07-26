import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../I18nContext";
import { useAuth } from "../AuthContext";
import { 
  useCloudVocabulary, 
  bulkDeleteCloudWords, 
  bulkAddCloudWords, 
  updateCloudWord 
} from "../lib/firestore";
import { publicVocabulary, publicPhrases, publicArticles, publicPrepositions, publicFalseFriends, publicAdjectives } from '../lib/public-data';
import * as XLSX from 'xlsx';
import { doc, getDoc, setDoc } from "firebase/firestore";
import { dbCloud } from "../lib/firebase";

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

interface UserSettings {
  language?: 'en' | 'de' | 'hu';
  showExamples?: boolean;
}

export default function Settings() {
  const { t, language, setLanguage } = useI18n();
  const { user, isAdmin, adminMode } = useAuth();
  const personalWords = useCloudVocabulary(user?.uid) || [];
  const publicWords = useCloudVocabulary("PUBLIC_LIBRARY") || [];
  const [isWiping, setIsWiping] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveToPublic, setSaveToPublic] = useState(isAdmin ? adminMode : false);
  const [isFilesListOpen, setIsFilesListOpen] = useState(false);
  const [fileSearchTerm, setFileSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Load the user's preference from localStorage (defaults to true)
  const [showExamples, setShowExamples] = useState(() => {
    const stored = localStorage.getItem('micalingo_show_examples');
    return stored !== null ? JSON.parse(stored) : true;
  });

  // State for advanced cleanup modal
  const [isCleanupModalOpen, setIsCleanupModalOpen] = useState(false);
  const [sources, setSources] = useState<{ name: string; category: string; count: number; uniqueKey: string }[]>([]);
  // State for managing sources selection
  const [selectedSources, setSelectedSources] = useState<Set<string>>(new Set());
  const [isCleaning, setIsCleaning] = useState(false);

  // State for editing files
  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editingFileCategory, setEditingFileCategory] = useState<string>('vocabulary');
  const [editFileItems, setEditFileItems] = useState<any[]>([]);
  const [deletedEditItemIds, setDeletedEditItemIds] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  const itemsPerPage = 10;

  useEffect(() => {
    setSaveToPublic(isAdmin ? adminMode : false);
  }, [isAdmin, adminMode]);

  const allItems = useMemo(() => {
    const existingItems = saveToPublic ? publicWords : personalWords;
    const cloudItems = existingItems.map((item: any) => ({ ...item, isCloud: true }));
    if (!saveToPublic) return cloudItems;

    const staticItems: any[] = [];
    const pushStatic = (data: any[], type: string) => {
      data.forEach((item: any, idx: number) => {
        const key = String(item.german || '').toLowerCase().trim();
        const hasTombstoneOrOverride = existingItems.some((i: any) => (i.german || '').toLowerCase().trim() === key);
        if (!hasTombstoneOrOverride) {
          staticItems.push({
            ...item,
            id: `static_${item.german}_${idx}`,
            sourceFile: `Static Library (${type})`,
            category: type,
            sourceType: 'static',
            isCloud: false
          });
        }
      });
    };

    pushStatic(publicVocabulary, 'vocabulary');
    pushStatic(publicPhrases, 'phrases');
    pushStatic(publicArticles, 'articles');
    pushStatic(publicPrepositions, 'prepositions');
    pushStatic(publicFalseFriends, 'false_friends');
    pushStatic(publicAdjectives || [], 'adjectives');

    return [...cloudItems.filter((i: any) => !i.deleted), ...staticItems];
  }, [personalWords, publicWords, saveToPublic]);

  const importedFiles = useMemo(() => {
    const fileMap = new Map<string, { fileName: string; fileType: string; destination: string; itemCount: number; wordIds: string[]; uniqueKey: string }>();
    allItems.forEach((item: any) => {
      const source = item.sourceFile || "Legacy Import (No File Name)";
      const category = item.category || 'mixed';
      const key = `${source}_${category}`;
      if (!fileMap.has(key)) {
        fileMap.set(key, { 
          fileName: source, 
          fileType: item.sourceType || (item.sourceFile ? item.sourceFile.split('.').pop() || 'unknown' : 'unknown'), 
          destination: category, 
          itemCount: 0, 
          wordIds: [],
          uniqueKey: key
        });
      }
      const fileData = fileMap.get(key)!;
      fileData.itemCount++;
      if (item.id) fileData.wordIds.push(item.id);
    });
    return Array.from(fileMap.values()).sort((a, b) => a.fileName.localeCompare(b.fileName) || a.destination.localeCompare(b.destination));
  }, [allItems]);


  // Fetch settings from Firestore on mount for logged-in users
  useEffect(() => {
    let mounted = true;
    if (user) {
      const fetchSettings = async () => {
        try {
          const settingsRef = doc(dbCloud, 'user_settings', user.uid);
          const snap = await getDoc(settingsRef);
          if (snap.exists() && mounted) {
            const settings = snap.data() as UserSettings;
            if (settings.language) {
              setLanguage(settings.language);
              localStorage.setItem('micalingo_language', settings.language);
            }
            if (settings.showExamples !== undefined) {
              setShowExamples(settings.showExamples);
              localStorage.setItem('micalingo_show_examples', JSON.stringify(settings.showExamples));
            }
          }
        } catch (error) {
          console.error("Failed to fetch settings from cloud", error);
        }
      };
      fetchSettings();
    }
    return () => { mounted = false; };
  }, [user?.uid, setLanguage]);

  const handleLanguageChange = (lang: 'en' | 'de' | 'hu') => {
    setLanguage(lang);
    setIsDirty(true);
  };

  const handleToggleExamples = () => {
    setShowExamples((prev: boolean) => !prev);
    setIsDirty(true);
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      localStorage.setItem('micalingo_language', language);
      localStorage.setItem('micalingo_show_examples', JSON.stringify(showExamples));
      if (user) {
        const settingsRef = doc(dbCloud, 'user_settings', user.uid);
        await setDoc(settingsRef, { language, showExamples }, { merge: true });
      }
      setIsDirty(false);
    } catch (error) {
      console.error("Error saving settings", error);
    } finally {
      setIsSaving(false);
    }
  };

  async function handleWipePersonalLibrary(event: React.MouseEvent<HTMLButtonElement>): Promise<void> {
    if (window.confirm(t('confirm_reset_library' as any) || 'Are you sure you want to delete all personal library items? This cannot be undone.')) {
      setIsWiping(true);
      try {
        if (personalWords.length > 0) {
          const ids = personalWords.map(word => word.id).filter((id): id is string => !!id);
          if (ids.length > 0) await bulkDeleteCloudWords(ids);
        }
        window.alert(t('library_wiped' as any) || 'Personal library wiped successfully.');
        window.location.reload();
      } catch (error) {
        console.error('Error wiping personal library:', error);
        window.alert(t('wipe_error' as any) || 'Failed to wipe personal library. Please try again.');
      } finally {
        setIsWiping(false);
      }
    }
  }

  const openCleanupModal = () => {
    const sourceMap = new Map<string, { name: string; category: string; count: number; uniqueKey: string }>();
    personalWords.forEach(word => {
      const sourceName = word.sourceFile || 'Legacy Import (No File Name)';
      const category = word.category || 'mixed';
      const key = `${sourceName}_${category}`;
      if (!sourceMap.has(key)) {
        sourceMap.set(key, { name: sourceName, category, count: 0, uniqueKey: key });
      }
      sourceMap.get(key)!.count++;
    });
    const sourcesArray = Array.from(sourceMap.values());
    sourcesArray.sort((a, b) => a.name.localeCompare(b.name) || a.category.localeCompare(b.category));
    setSources(sourcesArray);
    setSelectedSources(new Set());
    setIsCleanupModalOpen(true);
  };

  const handleSourceSelection = (uniqueKey: string) => {
    setSelectedSources(prev => {
      const next = new Set(prev);
      if (next.has(uniqueKey)) next.delete(uniqueKey);
      else next.add(uniqueKey);
      return next;
    });
  };

  const handleBulkDeleteFromSources = async () => {
    if (selectedSources.size === 0) return;
    const totalWordsToDelete = sources.filter(s => selectedSources.has(s.uniqueKey)).reduce((acc, s) => acc + s.count, 0);

    if (!window.confirm(`Are you sure you want to permanently delete all ${totalWordsToDelete} words from the ${selectedSources.size} selected sources? This cannot be undone.`)) return;

    setIsCleaning(true);
    try {
      const idsToDelete = personalWords
        .filter(word => {
          const key = `${word.sourceFile || 'Legacy Import (No File Name)'}_${word.category || 'mixed'}`;
          return selectedSources.has(key);
        })
        .map(word => word.id)
        .filter((id): id is string => !!id);
      
      if (idsToDelete.length > 0) await bulkDeleteCloudWords(idsToDelete);
      window.alert(`${idsToDelete.length} words have been deleted. The page will now reload.`);
      window.location.reload();
    } catch (error) {
      console.error("Error during cleanup:", error);
      window.alert("An error occurred during cleanup. Please try again.");
    } finally {
      setIsCleaning(false);
      setIsCleanupModalOpen(false);
    }
  };

  const filteredImportedFiles = useMemo(() => {
    if (!fileSearchTerm.trim()) return importedFiles;
    const searchTerms = fileSearchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return importedFiles.filter(f => {
      if (searchTerms.every(t => f.fileName.toLowerCase().includes(t))) return true;
      const itemsInFile = allItems.filter((item: any) => 
        (item.sourceFile || "Legacy Import (No File Name)") === f.fileName &&
        (item.category || 'mixed') === f.destination
      );
      return itemsInFile.some((item: any) =>
        searchTerms.every(t =>
          (item.german || '').toLowerCase().includes(t) ||
          (item.hungarian || '').toLowerCase().includes(t) ||
          (item.example || '').toLowerCase().includes(t) ||
          (item.note || '').toLowerCase().includes(t) ||
          (item.article || '').toLowerCase().includes(t) ||
          (item.noun || '').toLowerCase().includes(t) ||
          (item.levels || '').toLowerCase().includes(t) ||
          (item.hint || '').toLowerCase().includes(t)
        )
      );
    });
  }, [importedFiles, allItems, fileSearchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredImportedFiles.length / itemsPerPage));

  useEffect(() => {
    setCurrentPage(1);
  }, [fileSearchTerm]);

  const handleEditFile = (e: React.MouseEvent, file: any) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const items = allItems.filter((item: any) => 
        (item.sourceFile || "Legacy Import (No File Name)") === file.fileName &&
        (item.category || 'mixed') === file.destination
      );
      // Use safe mapping instead of JSON.stringify to prevent silent crashes
      setEditFileItems(items.map((i: any) => ({ ...i })));
      setEditingFileCategory(file.destination);
      setEditingFile(file.fileName);
      setDeletedEditItemIds([]);
      setModalSearchTerm("");
    } catch (err) {
      console.error("Error opening edit modal:", err);
    }
  };

  const handleEditItemChange = (index: number, field: string, value: string) => {
    setEditFileItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (editingFileCategory === 'articles' && (field === 'article' || field === 'noun')) {
        next[index].german = `${next[index].article || ''} ${next[index].noun || ''}`.trim();
      }
      return next;
    });
  };

  const handleDeleteEditItem = (index: number) => {
    const item = editFileItems[index];
    if (item.id) {
      setDeletedEditItemIds(prev => [...prev, item.id]);
    }
    setEditFileItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveFileEdits = async () => {
    setIsSavingEdit(true);
    try {
      if (deletedEditItemIds.length > 0) {
        const cloudDeletes = deletedEditItemIds.filter((id: string) => !id.startsWith('static_'));
        const staticDeletes = deletedEditItemIds.filter((id: string) => id.startsWith('static_'));

        if (cloudDeletes.length > 0) await bulkDeleteCloudWords(cloudDeletes);

        if (staticDeletes.length > 0) {
          const tombstones = staticDeletes.map((id: string) => {
            const orig: any = allItems.find((i: any) => i.id === id);
            return orig ? { userId: 'PUBLIC_LIBRARY', german: orig.german, hungarian: orig.hungarian, category: orig.category || 'vocabulary', deleted: true, dateAdded: Date.now() } : null;
          }).filter(Boolean);
          if (tombstones.length > 0) await bulkAddCloudWords(tombstones as any[]);
        }
      }

      const newCloudItems: any[] = [];
      const originalItems = allItems.filter((item: any) => 
        (item.sourceFile || 'Legacy Import (No File Name)') === editingFile &&
        (item.category || 'mixed') === editingFileCategory
      );
      const originalMap = new Map<string, any>(originalItems.map((i: any) => [i.id, i]));

      for (const item of editFileItems) {
        if (!item.id) continue;
        const orig = originalMap.get(item.id);
        if (
          orig &&
          (orig.german !== item.german || orig.hungarian !== item.hungarian || orig.example !== item.example || (orig as any).note !== item.note || (orig as any).levels !== item.levels || (orig as any).hint !== item.hint || (orig as any).article !== item.article || (orig as any).noun !== item.noun)
        ) {
          if (orig.isCloud) {
            const updatePayload: any = { german: item.german?.trim() || '', hungarian: item.hungarian?.trim() || '' };
            if (item.example !== undefined) updatePayload.example = item.example.trim();
            if (item.note !== undefined) updatePayload.note = item.note.trim();
            if (item.levels !== undefined) updatePayload.levels = item.levels.trim();
            if (item.hint !== undefined) updatePayload.hint = item.hint.trim();
            if (item.article !== undefined) updatePayload.article = item.article.trim();
            if (item.noun !== undefined) updatePayload.noun = item.noun.trim();
            await updateCloudWord(item.id, updatePayload);
          } else {
            newCloudItems.push({ userId: 'PUBLIC_LIBRARY', german: orig.german, hungarian: orig.hungarian, category: orig.category || 'vocabulary', deleted: true, dateAdded: Date.now() });
            const newCloudItem: any = { userId: 'PUBLIC_LIBRARY', german: item.german?.trim() || '', hungarian: item.hungarian?.trim() || '', category: orig.category || 'vocabulary', dateAdded: Date.now(), sourceFile: orig.sourceFile, sourceType: orig.sourceType };
            if (item.example !== undefined) newCloudItem.example = item.example.trim();
            if (item.note !== undefined) newCloudItem.note = item.note.trim();
            if (item.levels !== undefined) newCloudItem.levels = item.levels.trim();
            if (item.hint !== undefined) newCloudItem.hint = item.hint.trim();
            if (item.article !== undefined) newCloudItem.article = item.article.trim();
            if (item.noun !== undefined) newCloudItem.noun = item.noun.trim();
            newCloudItems.push(newCloudItem);
          }
        }
      }

      if (newCloudItems.length > 0) {
        await bulkAddCloudWords(newCloudItems as any[]);
      }

      setEditingFile(null);
      setDeletedEditItemIds([]);
    } catch (error) {
      console.error('Failed to save edits:', error);
      window.alert('An error occurred while saving edits.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteFile = async (uniqueKey: string) => {
    const fileInfo = importedFiles.find(f => f.uniqueKey === uniqueKey);
    if (!fileInfo) return;

    if (!window.confirm(t('confirm_delete_file', { fileName: fileInfo.fileName, count: fileInfo.itemCount }) || `Delete ${fileInfo.fileName}?`)) return;

    setIsSaving(true);
    try {
      const itemsInFile = allItems.filter((item: any) => 
        (item.sourceFile || "Legacy Import (No File Name)") === fileInfo.fileName &&
        (item.category || 'mixed') === fileInfo.destination
      );
      const wordIdsToDelete = itemsInFile.map((item: any) => item.id).filter(Boolean);

      const cloudDeletes = wordIdsToDelete.filter((id: string) => !id.startsWith('static_'));
      const staticDeletes = wordIdsToDelete.filter((id: string) => id.startsWith('static_'));

      if (cloudDeletes.length > 0) await bulkDeleteCloudWords(cloudDeletes);

      if (staticDeletes.length > 0) {
        const tombstones = staticDeletes.map((id: string) => {
          const orig: any = allItems.find((i: any) => i.id === id);
          return orig ? { userId: 'PUBLIC_LIBRARY', german: orig.german, hungarian: orig.hungarian, category: orig.category || 'vocabulary', deleted: true, dateAdded: Date.now() } : null;
        }).filter(Boolean);
        if (tombstones.length > 0) await bulkAddCloudWords(tombstones as any[]);
      }

      setSelectedSources(prev => {
        const next = new Set(prev);
        next.delete(uniqueKey);
        return next;
      });
    } catch (error) {
      console.error('Failed to delete file items:', error);
      window.alert(t('error_delete_file_desc') || 'An error occurred while deleting the file items.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkDeleteFiles = async () => {
    if (selectedSources.size === 0) return;
    if (!window.confirm(t('confirm_bulk_delete', { count: selectedSources.size }) || 'Delete selected?')) return;

    setIsSaving(true);
    try {
      let allIdsToDelete: string[] = [];
      importedFiles.forEach(f => {
        if (selectedSources.has(f.uniqueKey)) {
          const itemsInFile = allItems.filter((item: any) => 
            (item.sourceFile || "Legacy Import (No File Name)") === f.fileName &&
            (item.category || 'mixed') === f.destination
          );
          const wordIds = itemsInFile.map((item: any) => item.id).filter(Boolean);
          allIdsToDelete.push(...wordIds);
        }
      });
      allIdsToDelete = Array.from(new Set(allIdsToDelete));

      const cloudDeletes = allIdsToDelete.filter((id: string) => !id.startsWith('static_'));
      const staticDeletes = allIdsToDelete.filter((id: string) => id.startsWith('static_'));

      if (cloudDeletes.length > 0) await bulkDeleteCloudWords(cloudDeletes);

      if (staticDeletes.length > 0) {
        const tombstones = staticDeletes.map((id: string) => {
          const orig: any = allItems.find((i: any) => i.id === id);
          return orig ? { userId: 'PUBLIC_LIBRARY', german: orig.german, hungarian: orig.hungarian, category: orig.category || 'vocabulary', deleted: true, dateAdded: Date.now() } : null;
        }).filter(Boolean);
        if (tombstones.length > 0) await bulkAddCloudWords(tombstones as any[]);
      }

      setSelectedSources(new Set());
    } catch (error) {
      console.error('Failed to bulk delete files:', error);
      window.alert(t('error_bulk_delete_desc') || 'An error occurred while deleting the files.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadFiles = (uniqueKeys: string[]) => {
    const keysSet = new Set(uniqueKeys);
    const itemsToExport = allItems.filter((item: any) => {
      const key = `${item.sourceFile || 'Legacy Import (No File Name)'}_${item.category || 'mixed'}`;
      return keysSet.has(key);
    });

    if (itemsToExport.length === 0) {
      window.alert(t('no_items_export') || 'No items found to export.');
      return;
    }

    const exportData = itemsToExport.map((item: any) => ({ German: item.german || '', Hungarian: item.hungarian || '', Example: item.example || '', Note: item.note || '', Category: item.category || '', 'Source File': item.sourceFile || 'Legacy Import (No File Name)' }));
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 25 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');
    const firstItem = importedFiles.find(f => f.uniqueKey === uniqueKeys[0]);
    const outName = uniqueKeys.length === 1 && firstItem 
      ? `MicaLingo_Export_${firstItem.fileName.replace(/\.[^/.]+$/, '')}_${firstItem.destination}.xlsx` 
      : `MicaLingo_Bulk_Export_${uniqueKeys.length}_files.xlsx`;
    XLSX.writeFile(workbook, outName);
  };

  return (
    <div className="relative min-h-[85vh] w-full flex flex-col pt-4 md:pt-8 pb-12">
      <BackgroundBlobs />
      <div className="relative z-10 w-full max-w-7xl mx-auto space-y-8 px-4 md:px-8">
        <div className="flex items-center gap-4">
          <Link to="/" className="bg-white/70 backdrop-blur-md border border-white text-gray-700 hover:bg-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2">
            {t('back_button') || 'Back'}
          </Link>
          <div>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 tracking-tight pb-2">{t('settings_title') || 'Settings'}</h1>
            <p className="text-lg text-blue-900/70 font-medium mt-1">{t('settings_subtitle') || 'Manage your account and application settings.'}</p>
          </div>
        </div>
        
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-8">
        {/* Language Preferences */}
        <div>
          <h2 className="text-2xl font-extrabold text-blue-950 mb-2">{t('language_preferences') || 'Language Preferences'}</h2>
          <p className="text-blue-900/70 text-sm mb-4 font-medium">{t('language_preferences_subtitle') || 'Select the application language.'}</p>
          
          <div className="max-w-xs">
            <label className="block text-sm font-bold text-gray-700 mb-2">{t('app_language') || 'App Language'}</label>
            <select 
              value={language} 
              onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'de' | 'hu')}
              className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 block p-3 shadow-sm outline-none"
            >
              <option value="en">{t('english') || 'English'}</option>
              <option value="de">{t('german') || 'German'}</option>
              <option value="hu">{t('hungarian') || 'Hungarian'}</option>
            </select>
          </div>
        </div>

        <hr className="border-blue-50/50" />

        {/* Practice Settings */}
        <div>
          <h2 className="text-2xl font-extrabold text-blue-950 mb-2">{t('practice_settings') || 'Practice Settings'}</h2>
          <p className="text-blue-900/70 text-sm mb-4 font-medium">{t('practice_settings_subtitle') || 'Customize your quiz experience.'}</p>
          
          <div className="flex items-center justify-between max-w-md bg-white/50 p-5 rounded-2xl border border-blue-50 shadow-sm">
            <div>
              <h3 className="font-bold text-blue-950">{t('show_example_sentences') || 'Show Example Sentences'}</h3>
              <p className="text-xs text-blue-900/60 mt-1 font-medium">{t('show_example_sentences_subtitle') || 'Display example sentences after answering a question.'}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                className="sr-only peer" 
                checked={showExamples}
                onChange={handleToggleExamples}
              />
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {user && (
          <>
            <hr className="border-blue-50/50" />

            {/* Data Management */}
            <div>
              <h2 className="text-2xl font-extrabold text-blue-950 mb-2">{t('data_management' as any) || 'Data Management'}</h2>
              <p className="text-blue-900/70 text-sm mb-4 font-medium">{t('data_management_subtitle' as any) || 'Manage your saved progress and local data.'}</p>
              
              <div className="space-y-4">
                {/* Clear Local Data */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/50 rounded-2xl border border-blue-50 shadow-sm">
                  <div className="mb-3 sm:mb-0 sm:mr-4">
                    <h3 className="font-bold text-blue-950">{t('clear_local_data' as any) || 'Clear Local Progress'}</h3>
                    <p className="text-sm text-blue-900/60 mt-1 font-medium">{t('clear_local_data_desc' as any) || 'Wipe local quiz scores and progress. Does not delete cloud vocabulary.'}</p>
                  </div>
                  <button 
                    onClick={() => {
                      if (window.confirm(t('confirm_clear_data' as any) || 'Are you sure you want to clear all local progress? This cannot be undone.')) {
                        const lang = localStorage.getItem('micalingo_language');
                        const examples = localStorage.getItem('micalingo_show_examples');
                        localStorage.clear();
                        if (lang) localStorage.setItem('micalingo_language', lang);
                        if (examples) localStorage.setItem('micalingo_show_examples', examples);
                        window.alert(t('data_cleared' as any) || 'Local progress cleared successfully.');
                        window.location.reload();
                      }
                    }}
                    className="whitespace-nowrap bg-white text-gray-700 hover:bg-gray-100 border border-gray-200 font-bold py-2.5 px-6 rounded-xl transition-colors text-sm shadow-sm"
                  >
                    {t('clear_local_data' as any) || 'Clear Local Progress'}
                  </button>
                </div>

                {/* Wipe Personal Library */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-red-50/50 rounded-2xl border border-red-100 shadow-sm">
                  <div className="mb-3 sm:mb-0 sm:mr-4">
                    <h3 className="font-bold text-red-800">{t('reset_personal_library' as any) || 'Reset Personal Library'}</h3>
                    <p className="text-sm text-red-600 mt-1 font-medium">{t('reset_personal_library_desc' as any) || 'Permanently delete all your custom imported words and grammar materials from the cloud. This cannot be undone.'}</p>
                  </div>
                  <button 
                    onClick={handleWipePersonalLibrary}
                    disabled={isWiping}
                    className="whitespace-nowrap bg-red-600 text-white hover:bg-red-700 font-bold py-2.5 px-6 rounded-xl transition-colors text-sm shadow-sm disabled:opacity-50"
                  >
                    {isWiping ? (t('wiping_data' as any) || 'Wiping...') : (t('hard_reset_database' as any) || 'Wipe Library')}
                  </button>
                </div>

                {/* Advanced Cleanup */}
                {isAdmin && adminMode && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-yellow-50/50 rounded-2xl border border-yellow-200 shadow-sm">
                    <div className="mb-3 sm:mb-0 sm:mr-4">
                      <h3 className="font-bold text-yellow-800">Advanced Cleanup (Public Library)</h3>
                      <p className="text-sm text-yellow-600 mt-1 font-medium">Search, edit, delete, or download content from public imported files and ghost databases.</p>
                    </div>
                    <button 
                      onClick={() => {
                        setIsFilesListOpen(true);
                        setTimeout(() => document.getElementById('file-manager-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
                      }}
                      className="whitespace-nowrap bg-yellow-400 text-yellow-900 hover:bg-yellow-500 font-bold py-2.5 px-6 rounded-xl transition-colors text-sm shadow-sm"
                    >
                      Manage Sources...
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        <hr className="border-blue-50/50" />

        {/* Save Button */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSaveSettings}
            disabled={!isDirty || isSaving}
            className={`font-bold py-3 px-8 rounded-xl shadow-sm transition-colors ${
              !isDirty || isSaving 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSaving ? (t('saving_preferences' as any) || 'Saving...') : isDirty ? (t('save_preferences') || 'Save Preferences') : (t('save_button' as any) || 'Save')}
          </button>
        </div>
      </div>

      {/* IMPORTED FILES MANAGER */}
      {isAdmin && adminMode && (
        <div id="file-manager-section" className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white mt-8 overflow-hidden transition-all duration-300">
          <div 
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 md:p-8 gap-4 cursor-pointer hover:bg-white/50 transition-colors"
            onClick={() => setIsFilesListOpen(!isFilesListOpen)}
          >
            <div className="flex-1 text-left">
              <h2 className="text-2xl font-extrabold text-blue-950">
                {t('manage_imported_files')} <span className="text-purple-600 ml-2">({saveToPublic ? 'Public' : 'Personal'})</span>
              </h2>
              <p className="text-gray-600 text-sm mt-1">{t('manage_imported_files_desc')}</p>
            </div>
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="w-full sm:w-64" onClick={e => e.stopPropagation()}>
                <input
                  type="text"
                  placeholder={t('search_files') || 'Search files or keywords...'}
                  value={fileSearchTerm}
                  onChange={(e) => {
                    setFileSearchTerm(e.target.value);
                    if (e.target.value) setIsFilesListOpen(true);
                  }}
                  className="w-full px-5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                />
              </div>
              <div className={`w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm text-blue-600 transition-transform duration-500 flex-shrink-0 ${isFilesListOpen ? "rotate-180" : ""}`}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </div>

          <div className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${isFilesListOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
            <div className="overflow-hidden">
              <div className="px-4 pb-4 sm:px-6 sm:pb-6 md:px-8 md:pb-8 pt-2 border-t border-blue-50/50 space-y-6">
                {selectedSources.size > 0 && (
                  <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
                    <span className="text-blue-800 font-medium text-center sm:text-left">{t('files_selected', { count: selectedSources.size })}</span>
                    <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
                      <button onClick={() => handleDownloadFiles(Array.from(selectedSources))} disabled={isSaving} className="flex items-center justify-center gap-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" /></svg>
                        {t('download_selected')}
                      </button>
                      <button onClick={handleBulkDeleteFiles} disabled={isSaving} className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 w-full sm:w-auto">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-3h4m-6 3h8" /></svg>
                        {t('delete_selected')}
                      </button>
                    </div>
                  </div>
                )}

                <div className="bg-white rounded-2xl shadow-sm border border-blue-50 overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                    <thead className="bg-blue-50/50 border-b border-blue-100">
                      <tr>
                        <th className="p-2 sm:p-4 w-10 sm:w-12 text-center"></th>
                        <th className="p-3 sm:p-5 font-bold text-sm text-blue-900/60 uppercase tracking-wider">{t('file_name')}</th>
                        <th className="p-3 sm:p-5 font-bold text-sm text-blue-900/60 uppercase tracking-wider">{t('format')}</th>
                        <th className="p-3 sm:p-5 font-bold text-sm text-blue-900/60 uppercase tracking-wider">{t('used_in')}</th>
                        <th className="p-3 sm:p-5 font-bold text-sm text-blue-900/60 uppercase tracking-wider">{t('items')}</th>
                        <th className="p-3 sm:p-5 font-bold text-sm text-blue-900/60 uppercase tracking-wider text-right">{t('action')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredImportedFiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((file: any) => (
                        <tr key={file.uniqueKey} className="hover:bg-gray-50 transition-colors">
                          <td className="p-3 sm:p-4 text-center">
                            <input type="checkbox" checked={selectedSources.has(file.uniqueKey)} onChange={() => handleSourceSelection(file.uniqueKey)} className="w-5 h-5 text-blue-600 rounded border-blue-200 cursor-pointer" />
                          </td>
                          <td className="p-3 sm:p-5 font-bold text-blue-950 break-all">{file.fileName}</td>
                          <td className="p-3 sm:p-5 text-gray-600 uppercase text-sm font-bold">{file.fileType}</td>
                          <td className="p-3 sm:p-5"><span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">{file.destination}</span></td>
                          <td className="p-3 sm:p-5 text-gray-700 font-medium">{file.itemCount}</td>
                          <td className="p-3 sm:p-5 text-right">
                            <div className="flex flex-nowrap items-center justify-end gap-1.5 opacity-100 transition-opacity">
                              <button onClick={(e) => handleEditFile(e, file)} disabled={isSaving} className="flex items-center text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 font-bold text-sm">
                                <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536M9 11l6.768-6.768a2.5 2.5 0 113.536 3.536L12.536 14.536A4 4 0 019.172 15.9L6 16l.1-3.172A4 4 0 017.464 9.464z" /></svg>
                                <span className="hidden sm:inline">Edit</span>
                              </button>
                              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownloadFiles([file.uniqueKey]); }} disabled={isSaving} className="flex items-center text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50 font-bold text-sm">
                                <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" /></svg>
                                <span className="hidden sm:inline">{t('download')}</span>
                              </button>
                              <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDeleteFile(file.uniqueKey); }} disabled={isSaving} className="flex items-center text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 font-bold text-sm">
                                <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-3h4m-6 3h8" /></svg>
                                <span className="hidden sm:inline">{t('delete')}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {totalPages > 1 && (
                  <div className="flex justify-between items-center pt-6 px-2">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-blue-600 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-2">
                      &larr; <span className="hidden sm:inline">Previous</span>
                    </button>
                    <span className="text-gray-600 font-medium text-sm bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-blue-600 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-2">
                      <span className="hidden sm:inline">Next</span> &rarr;
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {isCleanupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
            <div className="p-4 sm:p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-extrabold text-blue-950">Manage Data Sources</h2>
              <button onClick={() => setIsCleanupModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-4 sm:p-6 md:p-8 overflow-y-auto space-y-4">
              <p className="text-sm text-gray-600">Select the file sources you want to permanently delete all associated words from. This is useful for cleaning up old or "ghost" imports.</p>
              <div className="bg-white rounded-2xl shadow-sm border border-blue-50 max-h-96 overflow-auto">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead className="bg-blue-50/50 border-b border-blue-100 sticky top-0">
                    <tr>
                      <th className="p-3 sm:p-4 w-10 sm:w-12 text-center"></th>
                      <th className="p-3 sm:p-4 font-bold text-sm text-blue-900/60 uppercase tracking-wider">Source File</th>
                      <th className="p-3 sm:p-4 font-bold text-sm text-blue-900/60 uppercase tracking-wider text-right">Words</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sources.map(source => (
                      <tr key={source.uniqueKey} className="hover:bg-gray-50">
                        <td className="p-3 sm:p-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedSources.has(source.uniqueKey)}
                            onChange={() => handleSourceSelection(source.uniqueKey)}
                            className="w-5 h-5 text-blue-600 rounded border-blue-200 cursor-pointer"
                          />
                        </td>
                        <td className="p-3 sm:p-4 font-bold text-blue-950 break-all">{source.name} <span className="text-xs text-blue-600 ml-2">({source.category})</span></td>
                        <td className="p-3 sm:p-4 text-gray-700 font-medium text-right">{source.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-4 sm:p-6 md:p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-between items-center gap-3">
              <span className="text-sm font-medium text-red-600 text-center sm:text-left mb-2 sm:mb-0">
                {selectedSources.size > 0 ? `Selected ${selectedSources.size} sources to delete.` : 'No sources selected.'}
              </span>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <button onClick={() => setIsCleanupModalOpen(false)} className="w-full sm:w-auto px-6 py-3 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                <button onClick={handleBulkDeleteFromSources} disabled={selectedSources.size === 0 || isCleaning} className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors disabled:opacity-50">
                  {isCleaning ? 'Deleting...' : 'Delete Selected'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT UPLOADED FILE MODAL */}
      {editingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center md:p-4 bg-blue-950/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white md:rounded-[2rem] shadow-2xl w-full max-w-6xl h-full md:h-auto max-h-[100vh] md:max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
            <div className="p-3 sm:p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-wrap gap-2 sm:gap-4">
              <h2 className="text-2xl font-extrabold text-blue-950">{t('preview_filename' as any, { filename: editingFile || '' }) || `Edit ${editingFile}`}</h2>
              
              <div className="flex-1 max-w-md mx-auto w-full">
                 <input
                   type="text"
                   placeholder="Highlight specific word..."
                   value={modalSearchTerm}
                   onChange={e => setModalSearchTerm(e.target.value)}
                   className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
                 />
              </div>

              <button onClick={() => setEditingFile(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-white p-0 sm:p-6 md:p-8">
              {editFileItems.length === 0 ? (
                <p className="text-gray-500 italic text-center py-4">{t("no_items_left" as any) || "No items left. Save to delete all."}</p>
              ) : (
                <table className="w-full text-left border-collapse table-fixed min-w-[800px] border border-blue-50 rounded-xl shadow-sm">
                  <thead className="bg-blue-50/80 border-b border-blue-100 sticky top-0 backdrop-blur z-10">
                    <tr>
                      {editingFileCategory === 'articles' ? (
                        <>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('article')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('noun')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('hungarian')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('example')}</th>
                        </>
                      ) : editingFileCategory === 'false_friends' || editingFileCategory === 'idioms' ? (
                        <>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{editingFileCategory === 'idioms' ? (t('idiom_german_label' as any) || 'German Idiom') : t('german')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{editingFileCategory === 'idioms' ? (t('idiom_hungarian_label' as any) || 'Hungarian Meaning') : t('hungarian')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{editingFileCategory === 'idioms' ? (t('explanation_label' as any) || 'Explanation') : t('example')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{editingFileCategory === 'idioms' ? (t('idiom_note_label' as any) || 'Note (Explanation)') : t('note')}</th>
                        </>
                      ) : editingFileCategory === 'prepositions' ? (
                        <>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('template_german_verb_header' as any) || 'German Verb + Hungarian'}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('prep_case_label' as any) || 'Preposition + Case'}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('template_meaning_example_header' as any) || 'Example Sentence'}</th>
                        </>
                      ) : editingFileCategory === 'adjectives' ? (
                        <>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('adjective' as any) || 'Adjective'}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('hungarian')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('levels' as any) || 'Levels'}</th>
                        </>
                      ) : editingFileCategory === 'verbs' ? (
                        <>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('german')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('hungarian')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('hint' as any) || 'Hint / Past Form'}</th>
                        </>
                      ) : (
                        <>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('german')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('hungarian')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('example')}</th>
                        </>
                      )}
                      <th className="p-2 sm:p-3 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {editFileItems.map((item: any, idx: number) => {
                      const searchTerms = modalSearchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
                      const matches = searchTerms.length === 0 || searchTerms.every(t => 
                        (item.german || '').toLowerCase().includes(t) ||
                        (item.hungarian || '').toLowerCase().includes(t) ||
                        (item.example || '').toLowerCase().includes(t) ||
                        (item.note || '').toLowerCase().includes(t) ||
                        (item.article || '').toLowerCase().includes(t) ||
                        (item.noun || '').toLowerCase().includes(t) ||
                        (item.levels || '').toLowerCase().includes(t) ||
                        (item.hint || '').toLowerCase().includes(t)
                      );
                      
                      if (!matches) return null;
                      
                      const getMatchClass = (val: string | undefined) => {
                        if (searchTerms.length === 0 || !val) return 'w-full border border-gray-200 rounded p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors';
                        const lowerVal = val.toLowerCase();
                        const isFieldMatch = searchTerms.some(t => lowerVal.includes(t));
                        return isFieldMatch 
                          ? 'w-full border border-yellow-400 rounded p-2 text-sm outline-none focus:ring-2 focus:ring-yellow-500 bg-yellow-50 shadow-inner transition-colors font-semibold text-yellow-900' 
                          : 'w-full border border-gray-200 rounded p-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors';
                      };

                      return (
                      <tr key={item.id || idx} className={`transition-colors ${searchTerms.length > 0 ? 'bg-blue-50/20' : 'hover:bg-gray-50'}`}>
                        {editingFileCategory === 'articles' ? (
                          <>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.article || ''} onChange={(e) => handleEditItemChange(idx, 'article', e.target.value)} className={getMatchClass(item.article)} /></td>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.noun || ''} onChange={(e) => handleEditItemChange(idx, 'noun', e.target.value)} className={getMatchClass(item.noun)} /></td>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleEditItemChange(idx, 'hungarian', e.target.value)} className={getMatchClass(item.hungarian)} /></td>
                            <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.example || ''} onChange={(e) => handleEditItemChange(idx, 'example', e.target.value)} className={getMatchClass(item.example)} /></td>
                          </>
                        ) : editingFileCategory === 'prepositions' ? (
                          <>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.german || ''} onChange={(e) => handleEditItemChange(idx, 'german', e.target.value)} placeholder={t('modal_german_prep_verb_placeholder' as any) || "e.g. verzichten, lemondani, felhagyni valamivel"} className={getMatchClass(item.german)} /></td>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleEditItemChange(idx, 'hungarian', e.target.value)} placeholder={t('modal_prep_case_placeholder' as any) || "e.g. auf + Akk."} className={getMatchClass(item.hungarian)} /></td>
                            <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.example || ''} onChange={(e) => handleEditItemChange(idx, 'example', e.target.value)} placeholder={t('meaning_example_placeholder' as any) || "e.g. Ich verzichte auf das Angebot."} className={getMatchClass(item.example)} /></td>
                          </>
                        ) : editingFileCategory === 'false_friends' || editingFileCategory === 'idioms' ? (
                          <>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.german || ''} onChange={(e) => handleEditItemChange(idx, 'german', e.target.value)} className={getMatchClass(item.german)} /></td>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleEditItemChange(idx, 'hungarian', e.target.value)} className={getMatchClass(item.hungarian)} /></td>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.example || ''} onChange={(e) => handleEditItemChange(idx, 'example', e.target.value)} className={getMatchClass(item.example)} /></td>
                            <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.note || ''} onChange={(e) => handleEditItemChange(idx, 'note', e.target.value)} className={getMatchClass(item.note)} /></td>
                          </>
                        ) : editingFileCategory === 'adjectives' ? (
                          <>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.german || ''} onChange={(e) => handleEditItemChange(idx, 'german', e.target.value)} className={getMatchClass(item.german)} /></td>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleEditItemChange(idx, 'hungarian', e.target.value)} className={getMatchClass(item.hungarian)} /></td>
                            <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.levels || ''} onChange={(e) => handleEditItemChange(idx, 'levels', e.target.value)} className={getMatchClass(item.levels)} /></td>
                          </>
                        ) : (
                          <>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.german || ''} onChange={(e) => handleEditItemChange(idx, 'german', e.target.value)} className={getMatchClass(item.german)} /></td>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleEditItemChange(idx, 'hungarian', e.target.value)} className={getMatchClass(item.hungarian)} /></td>
                            <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.hint || item.example || ''} onChange={(e) => handleEditItemChange(idx, editingFileCategory === 'verbs' ? 'hint' : 'example', e.target.value)} className={getMatchClass(editingFileCategory === 'verbs' ? item.hint : item.example)} /></td>
                          </>
                        )}
                        <td className="p-1 sm:p-2 align-top text-center border-l border-gray-100">
                          <button onClick={() => handleDeleteEditItem(idx)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50" title={t('delete') || 'Delete'}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 sm:p-6 md:p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={() => setEditingFile(null)} disabled={isSavingEdit} className="w-full sm:w-auto px-6 py-3 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50">{t('cancel')}</button>
              <button onClick={handleSaveFileEdits} disabled={isSavingEdit} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm disabled:opacity-50 transition-colors">{isSavingEdit ? t('saving') : t('modal_save_changes') || 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
