import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import { useSearchParams, Link } from "react-router-dom";
import * as XLSX from 'xlsx';
import FileDropZone from "../components/FileDropZone";
import { ParsedImport } from "../lib/importParser";
import { useAuth } from "../AuthContext";
import { publicVocabulary, publicPhrases, publicArticles, publicPrepositions, publicFalseFriends, publicAdjectives } from '../lib/public-data';
import { useCloudVocabulary, addCloudWord, bulkAddCloudWords, bulkDeleteCloudWords, updateCloudWord, purgeVocabDuplicatesKeeping, purgeSoftDeletedVocabSiblings, isActiveVocabItem, findVocabDuplicate, vocabCategoryKey } from "../lib/firestore";
import { useI18n } from "../I18nContext";

const getEditItemKey = (item: any, idx: number) => String(item?.id ?? `idx_${idx}`);

const itemMatchesModalSearch = (item: any, rawTerm: string) => {
  const term = rawTerm.toLowerCase().trim();
  if (!term) return true;
  return (
    (item.german || '').toLowerCase().includes(term) ||
    (item.hungarian || '').toLowerCase().includes(term) ||
    (item.example || '').toLowerCase().includes(term) ||
    (item.note || '').toLowerCase().includes(term) ||
    (item.article || '').toLowerCase().includes(term) ||
    (item.noun || '').toLowerCase().includes(term) ||
    (item.levels || '').toLowerCase().includes(term) ||
    (item.hint || '').toLowerCase().includes(term)
  );
};

const EDIT_FIELD_CLASS =
  "w-full border border-gray-200 rounded-xl p-3 text-base outline-none focus:ring-2 focus:ring-blue-500 bg-white min-h-[48px]";

interface ImportedFilePreview {
  fileName: string;
  fileType: string;
  destination: string;
  itemCount: number;
  wordIds: string[];
  uniqueKey: string;
}

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

export default function Import() {
  const { user, isAdmin, adminMode } = useAuth();
  const [saveToPublic, setSaveToPublic] = useState(isAdmin ? adminMode : false);
  
  // Keep personal and public items completely isolated to prevent false duplicates when toggling
  const personalItems = useCloudVocabulary(user?.uid) || [];
  const publicItems = useCloudVocabulary("PUBLIC_LIBRARY") || [];
  const existingItems = saveToPublic ? publicItems : personalItems;
  
  const [data, setData] = useState<ParsedImport | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchParams] = useSearchParams();
  const initialDestination = searchParams.get('destination') || 'vocabulary';
  const [destination, setDestination] = useState(initialDestination);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const { t } = useI18n();
  const [previewItems, setPreviewItems] = useState<any[]>([]);

  const [editingFile, setEditingFile] = useState<string | null>(null);
  const [editingFileCategory, setEditingFileCategory] = useState<string>('vocabulary');
  const [editFileItems, setEditFileItems] = useState<any[]>([]);
  const [deletedEditItemIds, setDeletedEditItemIds] = useState<string[]>([]);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [fileSearchTerm, setFileSearchTerm] = useState("");
  const [isFilesListOpen, setIsFilesListOpen] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState("");
  // Pin which rows stay visible while editing — live re-filter on every keystroke
  // was hiding the focused word (felt like the modal "collapsing") on mobile.
  const [pinnedEditMatchKeys, setPinnedEditMatchKeys] = useState<Set<string> | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // State for the "Add Content" modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newGerman, setNewGerman] = useState("");
  const [newArticle, setNewArticle] = useState("der");
  const [newNoun, setNewNoun] = useState("");
  const [newHungarian, setNewHungarian] = useState("");
  const [newExample, setNewExample] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newCategory, setNewCategory] = useState("vocabulary");

  // State for overwrite confirmation
  const [isOverwriteModalOpen, setIsOverwriteModalOpen] = useState(false);
  const [itemsToOverwrite, setItemsToOverwrite] = useState<any[]>([]);
  const [itemsToAddNew, setItemsToAddNew] = useState<any[]>([]);

  useEffect(() => {
    setSaveToPublic(isAdmin ? adminMode : false);
  }, [isAdmin, adminMode]);

  useEffect(() => {
    if (!saveToPublic && (destination === 'false_friends' || destination === 'idioms')) {
      setDestination('vocabulary');
    }
    if (!saveToPublic && (newCategory === 'false_friends' || newCategory === 'idioms')) {
      setNewCategory('vocabulary');
    }
  }, [saveToPublic, destination, newCategory]);

  const allItems = useMemo(() => {
    const cloudItems = existingItems.map((item: any) => ({ ...item, isCloud: true }));
    if (!saveToPublic) return cloudItems;

    const staticItems: any[] = [];
    const pushStatic = (data: any[], type: string) => {
      data.forEach((item: any, idx: number) => {
        const key = String(item.german || '').toLowerCase().trim();
        // Only hide static quiz items when the same word exists in the *same* quiz category
        // (reading/to-read entries must not suppress quiz static libraries, and vice versa)
        const hasTombstoneOrOverride = existingItems.some(
          (i: any) =>
            (i.german || '').toLowerCase().trim() === key &&
            vocabCategoryKey(i.category) === type
        );
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
  }, [existingItems, saveToPublic]);

  useEffect(() => {
    setDestination(initialDestination);
  }, [initialDestination]);

  // Automatically parse the data for the preview table
  useEffect(() => {
    if (!data || !data.content) {
      setPreviewItems([]);
      return;
    }

    const lines = data.content.split('\n');
    const items: any[] = [];

    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine) continue;

      let parts: string[] = [];
      
      // Robust state machine to parse CSV correctly, handling commas inside quotes natively
      const parseCSVLine = (lineStr: string, delimiter: string) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < lineStr.length; i++) {
          const char = lineStr[i];
          if (char === '"') {
            if (inQuotes && lineStr[i + 1] === '"') {
              current += '"';
              i++; // Skip escaped quote
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === delimiter && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      if (cleanLine.includes('\t')) {
        parts = cleanLine.split('\t').map(p => {
          let str = p.trim();
          if (str.startsWith('"') && str.endsWith('"')) {
            str = str.substring(1, str.length - 1).replace(/""/g, '"');
          }
          return str;
        });
      } else {
        const semiParts = parseCSVLine(cleanLine, ';');
        const commaParts = parseCSVLine(cleanLine, ',');
        parts = semiParts.length >= commaParts.length ? semiParts : commaParts;
      }

      if (parts.length >= 2) {
        const p0 = parts[0] || "";
        const p1 = parts[1] || "";
        const p2 = parts[2] || "";
        const p3 = parts[3] || "";

        // Skip template header rows
        const lowerP0 = p0.toLowerCase();
        if (
          lowerP0.includes("article (a)") ||
          lowerP0.includes("german (mandatory") ||
          lowerP0.includes("german") ||
          lowerP0.includes("adjective (mandatory") ||
          lowerP0.includes(t('template_article_header').toLowerCase()) ||
          lowerP0.includes(t('template_german_mandatory_header').toLowerCase()) ||
          lowerP0.includes(t('template_german_header').toLowerCase()) ||
          lowerP0.includes((t('template_adjective_header') || "adjective (mandatory)").toLowerCase())
        ) {
          continue;
        }

        if (destination === 'articles') {
          // Per user request, strictly parse 3 columns for articles: Article, Noun, Hungarian.
          if (!p0.trim() || !p1.trim() || !p2.trim()) {
            console.warn(`Skipping incomplete article row: article="${p0}" | noun="${p1}" | hungarian="${p2}"`);
            continue;
          }
          items.push({ article: p0, noun: p1, hungarian: p2, example: '', german: `${p0} ${p1}`.trim() });
        } else if (destination === 'false_friends' || destination === 'idioms') {
          items.push({ german: p0, hungarian: p1, example: p2, note: p3 });
        } else if (destination === 'verbs') {
          items.push({ german: p0, hungarian: p1, hint: p2 });
        } else if (destination === 'adjectives') {
          items.push({ german: p0, hungarian: p1, levels: p2 });
        } else if (destination === 'prepositions') {
          items.push({ german: p0, hungarian: p1, example: p2 });
        } else {
          items.push({ german: p0, hungarian: p1, example: p2 });
        }
      }
    }
    setPreviewItems(items);
  }, [data, destination, t]);

  const handleItemChange = (index: number, field: string, value: string) => {
    setPreviewItems(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      if (destination === 'articles' && (field === 'article' || field === 'noun')) {
        next[index].german = `${next[index].article || ''} ${next[index].noun || ''}`.trim();
      }
      return next;
    });
  };

  const handleDeletePreviewItem = (index: number) => {
    setPreviewItems(prev => prev.filter((_, i) => i !== index));
  };

  const importedFiles = useMemo(() => {
    const fileMap = new Map<string, ImportedFilePreview>();
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

  const filteredImportedFiles = useMemo(() => {
    if (!fileSearchTerm.trim()) return importedFiles;
    const searchTerms = fileSearchTerm.toLowerCase().trim().split(/\s+/).filter(Boolean);
    return importedFiles.filter((f: ImportedFilePreview) => {
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

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const toggleFileSelection = (uniqueKey: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(uniqueKey)) next.delete(uniqueKey);
      else next.add(uniqueKey);
      return next;
    });
  };

  const pinEditMatches = (items: any[], term: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setPinnedEditMatchKeys(null);
      return;
    }
    const keys = new Set<string>();
    items.forEach((item, idx) => {
      if (itemMatchesModalSearch(item, trimmed)) {
        keys.add(getEditItemKey(item, idx));
      }
    });
    setPinnedEditMatchKeys(keys);
  };

  const handleEditFile = (file: ImportedFilePreview) => {
    const items = allItems.filter((item: any) => 
      (item.sourceFile || "Legacy Import (No File Name)") === file.fileName &&
      (item.category || 'mixed') === file.destination
    );
    const cloned = JSON.parse(JSON.stringify(items));
    setEditFileItems(cloned);
    setEditingFileCategory(file.destination);
    setEditingFile(file.fileName);
    setDeletedEditItemIds([]);
    setModalSearchTerm(fileSearchTerm);
    pinEditMatches(cloned, fileSearchTerm);
  };

  const visibleEditEntries = useMemo(() => {
    return editFileItems
      .map((item, idx) => ({ item, idx, key: getEditItemKey(item, idx) }))
      .filter(({ key }) => !pinnedEditMatchKeys || pinnedEditMatchKeys.has(key));
  }, [editFileItems, pinnedEditMatchKeys]);

  // Keep background page from scrolling / jumping when the mobile keyboard opens
  useEffect(() => {
    if (!editingFile) return;
    const main = document.querySelector("main");
    const prevBodyOverflow = document.body.style.overflow;
    const prevMainOverflow = main instanceof HTMLElement ? main.style.overflow : "";
    document.body.style.overflow = "hidden";
    if (main instanceof HTMLElement) main.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      if (main instanceof HTMLElement) main.style.overflow = prevMainOverflow;
    };
  }, [editingFile]);

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

        const softPurgeTargets = cloudDeletes
          .map((id) => existingItems.find((i: any) => i.id === id))
          .filter(Boolean)
          .map((w: any) => ({ german: w.german, category: w.category }));

        if (cloudDeletes.length > 0) await bulkDeleteCloudWords(cloudDeletes);

        for (const target of softPurgeTargets) {
          if (target?.german) {
            await purgeSoftDeletedVocabSiblings(
              existingItems as any[],
              target.german,
              target.category
            );
          }
        }

        if (staticDeletes.length > 0) {
          const tombstones = staticDeletes.map((id: string) => {
            const orig: any = allItems.find((i: any) => i.id === id);
            return orig
              ? {
                  userId: 'PUBLIC_LIBRARY',
                  german: orig.german,
                  hungarian: orig.hungarian,
                  category: orig.category || 'vocabulary',
                  deleted: true,
                  dateAdded: Date.now()
                }
              : null;
          }).filter(Boolean);
          if (tombstones.length > 0) await bulkAddCloudWords(tombstones as any[]);
          for (const t of tombstones as any[]) {
            await purgeSoftDeletedVocabSiblings(existingItems as any[], t.german, t.category);
          }
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
          (orig.german !== item.german ||
            orig.hungarian !== item.hungarian ||
            orig.example !== item.example ||
            (orig as any).note !== item.note ||
            (orig as any).levels !== item.levels ||
            (orig as any).hint !== item.hint ||
            (orig as any).article !== item.article ||
            (orig as any).noun !== item.noun)
        ) {
          if (orig.isCloud) {
            const updatePayload: any = {
              german: item.german?.trim() || '',
              hungarian: item.hungarian?.trim() || '',
              deleted: false,
            };
            if (item.example !== undefined) updatePayload.example = item.example.trim();
            if (item.note !== undefined) updatePayload.note = item.note.trim();
            if (item.levels !== undefined) updatePayload.levels = item.levels.trim();
            if (item.hint !== undefined) updatePayload.hint = item.hint.trim();
            if (item.article !== undefined) updatePayload.article = item.article.trim();
            if (item.noun !== undefined) updatePayload.noun = item.noun.trim();

            await updateCloudWord(
              item.id,
              updatePayload
            );
            await purgeVocabDuplicatesKeeping(
              existingItems as any[],
              updatePayload.german,
              orig.category || 'vocabulary',
              item.id
            );
          } else {
            // Static item modified! Tombstone old + create new cloud item
            newCloudItems.push({
              userId: 'PUBLIC_LIBRARY',
              german: orig.german,
              hungarian: orig.hungarian,
              category: orig.category || 'vocabulary',
              deleted: true,
              dateAdded: Date.now()
            });
            const newCloudItem: any = {
              userId: 'PUBLIC_LIBRARY',
              german: item.german?.trim() || '',
              hungarian: item.hungarian?.trim() || '',
              category: orig.category || 'vocabulary',
              dateAdded: Date.now(),
              sourceFile: orig.sourceFile,
              sourceType: orig.sourceType
            };
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
      setPinnedEditMatchKeys(null);
      setModalSearchTerm("");
    } catch (error) {
      console.error('Failed to save edits:', error);
      alert('An error occurred while saving edits.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteFile = async (uniqueKey: string) => {
    const fileInfo = importedFiles.find(f => f.uniqueKey === uniqueKey);
    if (!fileInfo) return;

    if (!confirm(t('confirm_delete_file', { fileName: fileInfo.fileName, count: fileInfo.itemCount }))) return;

    setSaving(true);
    try {
      // Re-determine the items to delete at the moment of action to avoid stale state.
      const itemsInFile = allItems.filter((item: any) => 
        (item.sourceFile || "Legacy Import (No File Name)") === fileInfo.fileName &&
        (item.category || 'mixed') === fileInfo.destination
      );
      const wordIdsToDelete = itemsInFile.map((item: any) => item.id).filter(Boolean);

      const cloudDeletes = wordIdsToDelete.filter((id: string) => !id.startsWith('static_'));
      const staticDeletes = wordIdsToDelete.filter((id: string) => id.startsWith('static_'));

      if (cloudDeletes.length > 0) {
        await bulkDeleteCloudWords(cloudDeletes);
      }

      if (staticDeletes.length > 0) {
        const tombstones = staticDeletes.map((id: string) => {
          const orig: any = allItems.find((i: any) => i.id === id);
          return orig
            ? {
                userId: 'PUBLIC_LIBRARY',
                german: orig.german,
                hungarian: orig.hungarian,
                category: orig.category || 'vocabulary',
                deleted: true,
                dateAdded: Date.now()
              }
            : null;
        }).filter(Boolean);
        if (tombstones.length > 0) await bulkAddCloudWords(tombstones as any[]);
      }

      setSelectedFiles(prev => {
        const next = new Set(prev);
        next.delete(uniqueKey);
        return next;
      });
    } catch (error) {
      console.error('Failed to delete file items:', error);
      alert(t('error_delete_file_desc'));
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDeleteFiles = async () => {
    if (selectedFiles.size === 0) return;
    if (!confirm(t('confirm_bulk_delete', { count: selectedFiles.size }))) return;

    setSaving(true);
    try {
      let allIdsToDelete: string[] = [];
      importedFiles.forEach((f: ImportedFilePreview) => {
        if (selectedFiles.has(f.uniqueKey)) {
          // Re-calculate IDs to ensure freshness
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
          return orig
            ? {
                userId: 'PUBLIC_LIBRARY',
                german: orig.german,
                hungarian: orig.hungarian,
                category: orig.category || 'vocabulary',
                deleted: true,
                dateAdded: Date.now()
              }
            : null;
        }).filter(Boolean);
        if (tombstones.length > 0) await bulkAddCloudWords(tombstones as any[]);
      }

      setSelectedFiles(new Set());
    } catch (error) {
      console.error('Failed to bulk delete files:', error);
      alert(t('error_bulk_delete_desc'));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadFiles = (uniqueKeys: string[]) => {
    const keysSet = new Set(uniqueKeys);
    const itemsToExport = allItems.filter((item: any) => {
      const key = `${item.sourceFile || 'Legacy Import (No File Name)'}_${item.category || 'mixed'}`;
      return keysSet.has(key);
    });

    if (itemsToExport.length === 0) {
      alert(t('no_items_export'));
      return;
    }

    const exportData = itemsToExport.map((item: any) => ({
      German: item.german || '',
      Hungarian: item.hungarian || '',
      Example: item.example || '',
      Note: item.note || '',
      Category: item.category || '',
      'Source File': item.sourceFile || 'Legacy Import (No File Name)'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 25 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Export');

    const firstItem = importedFiles.find(f => f.uniqueKey === uniqueKeys[0]);
    const outName =
      uniqueKeys.length === 1 && firstItem
        ? `MicaLingo_Export_${firstItem.fileName.replace(/\.[^/.]+$/, '')}_${firstItem.destination}.xlsx`
        : `MicaLingo_Bulk_Export_${uniqueKeys.length}_files.xlsx`;

    XLSX.writeFile(workbook, outName);
  };

  const handleDownloadTemplate = (type: 'standard' | 'articles' | 'adjectives' | 'verbs' | 'false_friends' | 'idioms' | 'prepositions') => {
    let templateData: object[];

    if (type === 'articles') {
      templateData = [
        {
          [t('template_article_header')]: 'der',
          [t('template_noun_header')]: 'Mann, die Männer',
          [t('template_hungarian_header')]: 'a férfi',
          [t('template_example_header')]: 'Der Mann arbeitet.'
        },
        {
          [t('template_article_header')]: 'die',
          [t('template_noun_header')]: 'Frau, die Frauen',
          [t('template_hungarian_header')]: 'a nő',
          [t('template_example_header')]: 'Die Frau trinkt einen Kaffee.'
        }
      ];
    } else if (type === 'adjectives') {
      templateData = [
        {
          [t('template_adjective_header')]: 'gut',
          [t('template_hungarian_header')]: 'jó',
          [t('template_levels_header')]: 'besser, am besten'
        },
        {
          [t('template_adjective_header')]: 'schnell',
          [t('template_hungarian_header')]: 'gyors',
          [t('template_levels_header')]: 'schneller, am schnellsten'
        }
      ];
    } else if (type === 'verbs') {
      templateData = [
        {
          [t('template_german_header') || 'German']: 'machen',
          [t('template_hungarian_header') || 'Hungarian']: 'csinálni',
          [t('template_example_header') || 'Example (or hint)']: 'machte, hat gemacht'
        },
        {
          [t('template_german_header') || 'German']: 'gehen',
          [t('template_hungarian_header') || 'Hungarian']: 'menni',
          [t('template_example_header') || 'Example (or hint)']: 'ging, ist gegangen'
        }
      ];
    } else if (type === 'false_friends' || type === 'idioms') {
      templateData = [
        {
          [t('template_german_header') || 'German']: type === 'idioms' ? 'Ich verstehe nur Bahnhof' : 'das Gift, die Gifte',
          [t('template_hungarian_header') || 'Hungarian']: type === 'idioms' ? 'Nekem ez kínai' : 'a méreg',
          [type === 'idioms' ? (t('explanation_label') || 'Explanation') : (t('template_example_header') || 'Example')]: type === 'idioms' ? 'Als er über Quantenphysik sprach, verstand ich nur Bahnhof.' : 'Dieses Tier produziert ein starkes Gift.',
          [t('note') || 'Note']: type === 'idioms' ? 'Literal meaning: I only understand train station.' : 'False friend: gift != ajándék'
        }
      ];
    } else if (type === 'prepositions') {
      templateData = [
        {
          [t('template_german_verb_header') || 'German Verb + Hungarian']: 'verzichten, lemondani valamiről/felhagyni valamivel',
          [t('template_prep_case_header') || 'Preposition + Case']: 'auf + Akk.',
          [t('template_meaning_example_header') || 'Example Sentence']: 'Ich verzichte auf das Angebot.'
        }
      ];
    } else {
      templateData = [
        {
          [t('template_german_header')]: 'der Hund',
          [t('template_hungarian_header')]: 'a kutya',
          [t('template_example_header')]: 'Der Hund spielt im Garten.'
        },
        {
          [t('template_german_header')]: 'sprechen',
          [t('template_hungarian_header')]: 'beszélni',
          [t('template_example_header')]: 'Ich spreche ein bisschen Deutsch.'
        },
        {
          [t('template_german_header')]: 'schnell',
          [t('template_hungarian_header')]: 'gyors',
          [t('template_example_header')]: ''
        }
      ];
    }

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    worksheet['!cols'] =
      type === 'articles'
        ? [{ wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 50 }]
        : type === 'adjectives'
        ? [{ wch: 25 }, { wch: 25 }, { wch: 40 }]
        : type === 'false_friends' || type === 'idioms'
        ? [{ wch: 30 }, { wch: 30 }, { wch: 50 }, { wch: 40 }]
        : type === 'prepositions'
        ? [{ wch: 30 }, { wch: 30 }, { wch: 60 }]
        : [{ wch: 30 }, { wch: 30 }, { wch: 50 }];
        
    const sheetName = type === 'articles' ? 'Articles' : type === 'adjectives' ? 'Adjectives' : type === 'verbs' ? 'Verbs' : type === 'false_friends' ? 'False_Friends' : type === 'idioms' ? 'Idioms' : type === 'prepositions' ? 'Prepositions' : 'Vocabulary';

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      workbook,
      worksheet,
      `${sheetName}_Template`
    );

    XLSX.writeFile(
      workbook,
      `MicaLingo_${sheetName}_Template.xlsx`
    );
  };

  const handleSave = () => {
    if (previewItems.length === 0 || !user || !data) {
      alert(t('no_items_save'));
      return;
    }

    const newItems: any[] = [];
    const duplicates: any[] = [];
    const existingSet = new Map(
      allItems
        .filter((item: any) => isActiveVocabItem(item) && vocabCategoryKey(item.category) === vocabCategoryKey(destination))
        .map((item: any) => [(item.german || '').toLowerCase().trim(), item])
    );

    for (const item of previewItems) {
      const german = item.german?.trim() || '';
      const hungarian = item.hungarian?.trim() || '';
      if (!german || !hungarian) continue;

      const key = german.toLowerCase();
      const existingItem = existingSet.get(key);

      if (existingItem) {
        duplicates.push({ ...item, idToUpdate: existingItem.id, isStatic: !existingItem.isCloud });
      } else {
        newItems.push(item);
      }
    }

    setItemsToAddNew(newItems);
    setItemsToOverwrite(duplicates);

    if (duplicates.length > 0) {
      setIsOverwriteModalOpen(true);
    } else {
      // No duplicates, proceed to save directly.
      executeSave(false, newItems, duplicates);
    }
  };

  const executeSave = async (overwrite = false, currentNewItems = itemsToAddNew, currentDuplicates = itemsToOverwrite) => {
    setSaving(true);
    setIsOverwriteModalOpen(false);

    try {
      let savedCount = 0;
      let overwrittenCount = 0;

      // 1. Save brand new items
      if (currentNewItems.length > 0) {
        const newItemsPayload = currentNewItems.map(item => {
          const payload: any = { ...item, userId: saveToPublic ? 'PUBLIC_LIBRARY' : user?.uid, dateAdded: Date.now(), category: vocabCategoryKey(destination) };
          if (data?.fileName) payload.sourceFile = data.fileName;
          if (data?.fileType) payload.sourceType = data.fileType;
          Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);
          return payload;
        });
        await bulkAddCloudWords(newItemsPayload);
        // Scrub soft-deleted leftovers so they cannot block later edits
        for (const item of newItemsPayload) {
          if (item.german) {
            await purgeSoftDeletedVocabSiblings(
              existingItems as any[],
              item.german,
              destination
            );
          }
        }
        savedCount = newItemsPayload.length;
      }

      // 2. Handle duplicates if overwrite is true
      if (overwrite && currentDuplicates.length > 0) {
        const cloudUpdates: Promise<void>[] = [];
        const newCloudItems: any[] = [];

        for (const item of currentDuplicates) {
          const { idToUpdate, isStatic, ...newItemData } = item;
          
          const payload: any = { ...newItemData, userId: saveToPublic ? 'PUBLIC_LIBRARY' : user?.uid, updatedAt: Date.now(), category: destination, deleted: false };
          if (data?.fileName) payload.sourceFile = data.fileName;
          if (data?.fileType) payload.sourceType = data.fileType;
          Object.keys(payload).forEach(k => payload[k] === undefined && delete payload[k]);

          if (isStatic) {
            newCloudItems.push(payload);
          } else if (idToUpdate) {
            cloudUpdates.push(
              updateCloudWord(idToUpdate, payload).then(() =>
                purgeVocabDuplicatesKeeping(
                  existingItems as any[],
                  payload.german || newItemData.german,
                  destination,
                  idToUpdate
                ).then(() => undefined)
              )
            );
          }
        }

        if (newCloudItems.length > 0) {
          await bulkAddCloudWords(newCloudItems);
          for (const item of newCloudItems) {
            if (item.german) {
              await purgeSoftDeletedVocabSiblings(existingItems as any[], item.german, destination);
            }
          }
        }
        if (cloudUpdates.length > 0) await Promise.all(cloudUpdates);
        overwrittenCount = currentDuplicates.length;
      }

      setData(null);
      let alertMessage = t('import_success', { saved: savedCount });
      if (overwrittenCount > 0) {
        alertMessage += `\n${t('import_overwritten', { count: overwrittenCount })}`;
      } else if (currentDuplicates.length > 0) {
        alertMessage += `\n${t('import_skipped', { count: currentDuplicates.length })}`;
      }
      alert(alertMessage);

    } catch (error) {
      console.error('Failed to save vocabulary:', error);
      const message = error instanceof Error ? error.message : JSON.stringify(error);
      alert(`Database error:\n${message}`);
    } finally {
      setSaving(false);
    }
  };

  const openAddContentModal = () => {
    setNewGerman("");
    setNewArticle("der");
    setNewNoun("");
    setNewHungarian("");
    setNewExample("");
    setNewNote("");
    setNewCategory(destination); // Default to the currently selected import destination
    setIsAddModalOpen(true);
  };

  const handleSaveNewWord = async () => {
    const finalGerman = newCategory === 'articles' ? `${newArticle} ${newNoun.trim()}` : newGerman.trim();

    if (!finalGerman || !newHungarian.trim()) {
      alert(t('alert_fill_fields_login'));
      return;
    }

    // Same-topic only: reading (to read) never conflicts with vocabulary quiz
    const duplicate = findVocabDuplicate(
      existingItems || [],
      finalGerman,
      newCategory
    );

    if (duplicate) {
      const catKey = vocabCategoryKey(duplicate.category);
      let catName = t(`dropdown_${catKey}`);
      if (catName === `dropdown_${catKey}`) catName = catKey;
      alert(t('alert_word_exists', { category: catName }));
      return;
    }

    try {
        const payload: any = {
          userId: saveToPublic ? "PUBLIC_LIBRARY" : user?.uid,
          german: finalGerman,
          hungarian: newHungarian.trim(),
          example: newExample.trim(),
          note: newCategory === 'false_friends' || newCategory === 'idioms' ? newNote.trim() : "",
          dateAdded: Date.now(),
          category: vocabCategoryKey(newCategory),
          sourceFile: "Manual CMS Entry",
          sourceType: "cms"
        };

        const docRef = await addCloudWord(payload);
        await purgeVocabDuplicatesKeeping(
          existingItems as any[],
          finalGerman,
          vocabCategoryKey(newCategory),
          docRef.id
        );
        setIsAddModalOpen(false);
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/" className="bg-white/70 backdrop-blur-md border border-white text-gray-700 hover:bg-white font-bold px-5 py-2.5 rounded-xl shadow-sm transition-all flex items-center gap-2">
              {t('back_button')}
            </Link>
            <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-blue-950 via-blue-800 to-blue-600 tracking-tight pb-2">{t('import_title')}</h1>
          </div>

        {isAdmin && adminMode && (
          <div className="flex items-center gap-2 bg-purple-50 px-4 py-2 rounded-xl border border-purple-200 shadow-sm w-full sm:w-auto">
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
      </div>

      {/* Format Instructions */}
      <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-6">
        <div className="bg-blue-50/80 p-5 rounded-2xl border border-blue-100 shadow-sm">
        <h2 className="font-bold text-blue-800 mb-2">{t('accepted_format_guide')}</h2>
        <ul className="text-sm text-blue-700 list-disc list-inside space-y-1.5 ml-2">
          <li><strong>{t('vocab_phrases')}</strong> {t('format_vocab_phrases')}</li>
          <li><strong>{t('articles_quiz_label') || 'Articles Quiz:'}</strong> {t('format_articles')}</li>
          <li><strong>{t('verbs_quiz_format_title') || 'Verbs Quiz:'}</strong> {t('verbs_quiz_format_desc') || 'Column A = German (verb), Column B = Hungarian (Meaning), Column C = Past forms or Examples.'}</li>
          <li><strong>{t('adjectives_quiz_label') || 'Adjectives Quiz:'}</strong> {t('format_adjectives') || 'Column A: German, Column B: Hungarian, Column C: Levels (e.g., besser, am besten).'}</li>
          <li><strong>{t('prepositions_quiz_format_title') || 'Prepositions Quiz:'}</strong> {t('prepositions_quiz_format_desc') || 'Column A = German verb + Hungarian meaning, Column B = Preposition + case, Column C = Example sentence.'}</li>
        </ul>

        {/* Downloadable Template */}
        <div className="mt-4 pt-4 border-t border-blue-200/60 flex flex-col gap-4">
          <div className="mb-2">
            <h3 className="font-semibold text-blue-800">{t('need_starting_point')}</h3>
            <p className="text-sm text-blue-600">{t('download_template_desc')}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 w-full">
            <button
              onClick={() => handleDownloadTemplate('standard')}
              className="w-full px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
              </svg>
              <span>{t('vocab_template')}</span>
            </button>
            <button
              onClick={() => handleDownloadTemplate('articles')}
              className="w-full px-4 py-2.5 bg-white text-blue-600 border border-blue-200 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
              </svg>
              <span>{t('articles_template')}</span>
            </button>
            <button
              onClick={() => handleDownloadTemplate('adjectives')}
              className="w-full px-4 py-2.5 bg-white text-blue-600 border border-blue-200 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
              </svg>
              <span>{t('adjectives_template')}</span>
            </button>
            <button
              onClick={() => handleDownloadTemplate('verbs')}
              className="w-full px-4 py-2.5 bg-white text-blue-600 border border-blue-200 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
              </svg>
              <span>{t('verbs_template') || 'Verbs Template'}</span>
            </button>
            <button
              onClick={() => handleDownloadTemplate('prepositions')}
              className="w-full px-4 py-2.5 bg-white text-blue-600 border border-blue-200 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
              </svg>
              <span>{t('prepositions_template') || 'Prepositions Template'}</span>
            </button>
            {isAdmin && adminMode && (
              <>
                <button
                  onClick={() => handleDownloadTemplate('false_friends')}
                  className="w-full px-4 py-2.5 bg-white text-blue-600 border border-blue-200 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
                  </svg>
                  <span>{t('false_friends') || 'False Friends Template'}</span>
                </button>
                <button
                  onClick={() => handleDownloadTemplate('idioms')}
                  className="w-full px-4 py-2.5 bg-white text-blue-600 border border-blue-200 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm text-sm"
                >
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
                  </svg>
                  <span>{t('idioms') || 'Idioms Template'}</span>
                </button>
              </>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* DROP ZONE CENTER AREA */}
      {user ? (
      <div className="relative border-2 border-dashed border-blue-300 rounded-[2rem] bg-white/50 hover:bg-blue-50/50 backdrop-blur-md transition-all duration-300 flex flex-col items-center justify-center text-center shadow-inner group py-8">
        <div className="p-10 pointer-events-none flex flex-col items-center">
          <div className="mb-4 bg-blue-100 p-4 rounded-full text-blue-600 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
            </svg>
          </div>
          <p className="mt-4 text-sm text-gray-500 font-medium">{t('drag_and_drop')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('supported_files')}</p>
        </div>
        <div className="absolute inset-0 opacity-0 cursor-pointer flex items-stretch justify-stretch [&>*]:flex-grow [&>*]:w-full [&>*]:h-full">
          <FileDropZone onFileParsed={setData} />
        </div>
      </div>
      ) : (
        <div className="bg-blue-50/80 p-6 rounded-[2rem] text-center border border-blue-200 mt-4">
          <p className="text-blue-800 font-medium">{t('login_required_import') || 'Please log in to import data or add manual entries.'}</p>
        </div>
      )}

      {/* MANUAL ADD CONTENT BUTTON */}
      <div className="flex justify-end mt-4 mb-2">
        {user && (
          <button onClick={openAddContentModal} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-sm transition-colors flex items-center gap-2">
            <span className="text-xl leading-none">+</span> {t('add_content') || 'Add Content'}
          </button>
        )}
      </div>

      {/* OUTPUT */}
      {data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-700">{t('preview_filename', { filename: data.fileName })}</h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
              {t('items_detected', { count: previewItems.length })}
            </span>
          </div>

          {previewItems.length > 0 ? (
            <div className="bg-white border border-blue-50 rounded-2xl shadow-sm max-h-[60vh] md:max-h-[400px] overflow-auto">
              <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
                <thead className="bg-blue-50/50 border-b border-blue-100 sticky top-0 backdrop-blur-md z-10">
                  <tr>
                    {destination === 'articles' ? (
                      <>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('article')} <span className="text-xs font-normal text-gray-500 block">{t('column_a')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('noun')} <span className="text-xs font-normal text-gray-500 block">{t('column_b')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('hungarian')} <span className="text-xs font-normal text-gray-500 block">{t('column_c')}</span></th>
                      </>
                    ) : destination === 'false_friends' || destination === 'idioms' ? (
                      <>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{destination === 'idioms' ? (t('idiom_german_label') || 'German Idiom') : t('german')} <span className="text-xs font-normal text-gray-500 block">{t('column_a')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{destination === 'idioms' ? (t('idiom_hungarian_label') || 'Hungarian Meaning') : t('hungarian')} <span className="text-xs font-normal text-gray-500 block">{t('column_b')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{destination === 'idioms' ? (t('explanation_label') || 'Explanation') : t('example')} <span className="text-xs font-normal text-gray-500 block">{t('column_c')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{destination === 'idioms' ? (t('idiom_note_label') || 'Note (Explanation)') : t('note')} <span className="text-xs font-normal text-gray-500 block">{t('column_d')}</span></th>
                      </>
                    ) : destination === 'prepositions' ? (
                      <>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('template_german_verb_header') || 'German Verb + Hungarian'} <span className="text-xs font-normal text-gray-500 block">{t('column_a')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('prep_case_label') || 'Preposition + Case'} <span className="text-xs font-normal text-gray-500 block">{t('column_b')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('template_meaning_example_header') || 'Example Sentence'} <span className="text-xs font-normal text-gray-500 block">{t('column_c')}</span></th>
                      </>
                    ) : destination === 'adjectives' ? (
                      <>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('adjective') || 'Adjective'} <span className="text-xs font-normal text-gray-500 block">{t('column_a')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('hungarian')} <span className="text-xs font-normal text-gray-500 block">{t('column_b')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('levels') || 'Levels'} <span className="text-xs font-normal text-gray-500 block">{t('column_c')}</span></th>
                      </>
                    ) : destination === 'verbs' ? (
                      <>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('german')} <span className="text-xs font-normal text-gray-500 block">{t('column_a')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('hungarian')} <span className="text-xs font-normal text-gray-500 block">{t('column_b')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('hint') || 'Hint / Past Form'} <span className="text-xs font-normal text-gray-500 block">{t('column_c')}</span></th>
                      </>
                    ) : (
                      <>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('german')} <span className="text-xs font-normal text-gray-500 block">{t('column_a')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('hungarian')} <span className="text-xs font-normal text-gray-500 block">{t('column_b')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('example')} <span className="text-xs font-normal text-gray-500 block">{t('column_c_d')}</span></th>
                      </>
                    )}
                    <th className="p-2 sm:p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {previewItems.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      {destination === 'articles' ? (
                        <>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.article || ''} onChange={(e) => handleItemChange(idx, 'article', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.noun || ''} onChange={(e) => handleItemChange(idx, 'noun', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleItemChange(idx, 'hungarian', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                        </>
                      ) : destination === 'prepositions' ? (
                        <>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.german || ''} onChange={(e) => handleItemChange(idx, 'german', e.target.value)} placeholder={t('modal_german_prep_verb_placeholder') || "e.g. verzichten, lemondani, felhagyni valamivel"} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleItemChange(idx, 'hungarian', e.target.value)} placeholder={t('modal_prep_case_placeholder') || "e.g. auf + Akk."} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                          <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.example || ''} onChange={(e) => handleItemChange(idx, 'example', e.target.value)} placeholder={t('meaning_example_placeholder') || "e.g. Ich verzichte auf das Angebot."} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                        </>
                      ) : destination === 'false_friends' || destination === 'idioms' ? (
                        <>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.german || ''} onChange={(e) => handleItemChange(idx, 'german', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleItemChange(idx, 'hungarian', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.example || ''} onChange={(e) => handleItemChange(idx, 'example', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                          <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.note || ''} onChange={(e) => handleItemChange(idx, 'note', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                        </>
                      ) : destination === 'adjectives' ? (
                        <>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.german || ''} onChange={(e) => handleItemChange(idx, 'german', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleItemChange(idx, 'hungarian', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                          <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.levels || ''} onChange={(e) => handleItemChange(idx, 'levels', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                        </>
                      ) : destination === 'verbs' ? (
                        <>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.german || ''} onChange={(e) => handleItemChange(idx, 'german', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleItemChange(idx, 'hungarian', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                          <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.hint || ''} onChange={(e) => handleItemChange(idx, 'hint', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                        </>
                      ) : (
                        <>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.german || ''} onChange={(e) => handleItemChange(idx, 'german', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleItemChange(idx, 'hungarian', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                          <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.example || ''} onChange={(e) => handleItemChange(idx, 'example', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-base sm:text-sm" /></td>
                        </>
                      )}
                      <td className="p-1 sm:p-2 align-top text-center border-l border-gray-100">
                        <button onClick={() => handleDeletePreviewItem(idx)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors" title={t('delete') || 'Delete'}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-red-50 p-4 rounded border border-red-200 text-red-600">
              <p className="font-semibold">{t('invalid_columns')}</p>
              <p className="text-sm mt-1">{t('invalid_columns_desc')}</p>
              <pre className="mt-4 text-xs bg-white p-2 rounded overflow-auto max-h-32 text-gray-700">{data.content}</pre>
            </div>
          )}

          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pt-4 border-t border-gray-200 gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">{t('save_to')}</label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="bg-white border border-gray-200 text-gray-900 font-medium rounded-xl focus:ring-2 focus:ring-blue-500 block w-full p-3 shadow-sm outline-none"
                >
                  <option value="vocabulary">{t('dropdown_vocabulary') || 'Vocabulary quiz'}</option>
                  <option value="reading">{t('dropdown_reading') || 'Vocabulary (to read)'}</option>
                  <option value="articles">{t('dropdown_articles') || 'Articles quiz'}</option>
                  <option value="phrases">{t('dropdown_phrases') || 'Phrases and sentences quiz'}</option>
                  <option value="prepositions">{t('dropdown_prepositions') || 'Prepositions quiz'}</option>
                  <option value="adjectives">{t('dropdown_adjectives') || 'Adjectives quiz'}</option>
                  <option value="verbs">{t('dropdown_verbs') || 'Verbs quiz'}</option>
                  {isAdmin && adminMode && saveToPublic && (
                    <>
                      <option value="false_friends">{t('false_friends') || 'False Friends'}</option>
                      <option value="idioms">{t('idioms') || 'Idioms'}</option>
                    </>
                  )}
                </select>
              </div>
            </div>
            <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3 justify-end">
              <button
                onClick={() => setData(null)}
                disabled={saving}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-xl transition-colors disabled:opacity-50 w-full sm:w-auto"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving || previewItems.length === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors disabled:opacity-50 w-full sm:w-auto"
              >
                {saving ? t('saving') : t('save_import')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD CONTENT MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-extrabold text-blue-950">{t('modal_add_word_title')}</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="p-6 md:p-8 overflow-y-auto space-y-6">
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
                  {isAdmin && adminMode && saveToPublic && (
                    <>
                      <option value="false_friends">{t('false_friends') || 'False Friends'}</option>
                      <option value="idioms">{t('idioms') || 'Idioms'}</option>
                    </>
                  )}
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
                germanLabel = t('modal_german_prep_verb_label') || "German Verb + Hungarian *";
                germanPlaceholder = t('modal_german_prep_verb_placeholder') || "e.g. verzichten, lemondani, felhagyni valamivel";
                hungarianPlaceholder = t('modal_prep_case_placeholder') || "e.g. auf + Akk.";
              } else if (newCategory === 'verbs') {
                germanLabel = t('modal_german_verb_label') || "German Verb *";
                germanPlaceholder = t('modal_german_verb_placeholder') || "e.g. machen";
                hungarianPlaceholder = t('modal_hungarian_verb_placeholder') || "e.g. csinálni";
              } else if (newCategory === 'false_friends') {
                germanLabel = t('modal_german_ff_label') || "German False Friend *";
                germanPlaceholder = t('modal_german_ff_placeholder') || "e.g. das Gift, die Gifte";
                hungarianPlaceholder = t('modal_hungarian_ff_placeholder') || "e.g. a méreg";
              } else if (newCategory === 'idioms') {
                germanLabel = t('idiom_german_label') || "German Idiom *";
                germanPlaceholder = t('idiom_german_placeholder') || "e.g. Ich verstehe nur Bahnhof";
                hungarianPlaceholder = t('idiom_hungarian_placeholder') || "e.g. Nekem ez kínai";
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{newCategory === 'idioms' ? (t('idiom_hungarian_label') || 'Hungarian Meaning *') : newCategory === 'prepositions' ? (t('prep_case_label') || 'Preposition + Case *') : t('modal_hungarian_label')}</label>
                <input
                  type="text"
                  value={newHungarian}
                  onChange={(e) => setNewHungarian(e.target.value)}
                  placeholder={hungarianPlaceholder}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{newCategory === 'idioms' ? (t('explanation_label') || 'Explanation') : newCategory === 'prepositions' ? (t('meaning_example_label') || 'Example Sentence') : t('modal_example_label')}</label>
                <input
                  type="text"
                  value={newExample}
                  onChange={(e) => setNewExample(e.target.value)}
                  placeholder={newCategory === 'idioms' ? (t('explanation_placeholder') || 'Explanation') : newCategory === 'prepositions' ? (t('meaning_example_placeholder') || 'e.g. Ich verzichte auf das Angebot.') : t('modal_example_placeholder')}
                  className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {(newCategory === 'false_friends' || newCategory === 'idioms') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{newCategory === 'idioms' ? (t('idiom_note_label') || 'Note (Explanation)') : (t('note') || 'Note')} *</label>
                  <input
                    type="text"
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder={newCategory === 'idioms' ? (t('idiom_note_placeholder') || 'Literal meaning...') : (t('template_note_header') || 'Note')}
                    className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
              );
            })()}
            </div>

            <div className="p-3 sm:p-6 md:p-8 border-t border-gray-100 bg-gray-50/50 flex flex-row justify-end gap-2 sm:gap-3">
              <button onClick={() => setIsAddModalOpen(false)} className="flex-1 sm:flex-none px-4 py-2 sm:px-6 sm:py-3 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">{t('cancel')}</button>
              <button onClick={handleSaveNewWord} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 sm:py-3 sm:px-8 rounded-xl shadow-sm transition-colors">{t('modal_save_word') || 'Save Word'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Overwrite Confirmation Modal */}
      {isOverwriteModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-extrabold text-blue-950">{t('overwrite_confirm_title') || 'Overwrite Duplicates?'}</h2>
              <button onClick={() => setIsOverwriteModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6 md:p-8 text-center">
              <div className="w-16 h-16 bg-yellow-50 text-yellow-500 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
              <p className="text-gray-600 font-medium">
                {t('overwrite_confirm_desc', { count: itemsToOverwrite.length })}
              </p>
            </div>
            <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-end gap-3">
              <button onClick={() => setIsOverwriteModalOpen(false)} className="w-full sm:w-auto px-6 py-3 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors">{t('cancel')}</button>
              <button onClick={() => executeSave(false)} className="w-full sm:w-auto px-6 py-3 font-bold text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-xl transition-colors">
                {t('skip_button') || 'Skip Duplicates'}
              </button>
              <button onClick={() => executeSave(true)} className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm transition-colors">
                {t('overwrite_button') || 'Overwrite'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORTED FILES MANAGER */}
      {importedFiles.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white mt-8 overflow-hidden transition-all duration-300">
          <div 
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-6 md:p-8 gap-4 cursor-pointer hover:bg-white/50 transition-colors"
            onClick={() => setIsFilesListOpen(!isFilesListOpen)}
          >
            <div className="flex-1 text-left">
              <h2 className="text-2xl font-extrabold text-blue-950">
                {t('manage_imported_files')} {isAdmin && adminMode && <span className="text-purple-600 ml-2">({saveToPublic ? 'Public' : 'Private'})</span>}
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
          {selectedFiles.size > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
              <span className="text-blue-800 font-medium text-center sm:text-left">{t('files_selected', { count: selectedFiles.size })}</span>
              <div className="flex flex-col sm:flex-row w-full sm:w-auto gap-2">
                <button
                  onClick={() => handleDownloadFiles(Array.from(selectedFiles))}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 bg-white border border-blue-200 text-blue-600 hover:bg-blue-50 px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
                  </svg>
                  {t('download_selected')}
                </button>
                <button
                  onClick={handleBulkDeleteFiles}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-xl font-bold transition-colors shadow-sm disabled:opacity-50 w-full sm:w-auto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-3h4m-6 3h8" />
                  </svg>
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
                {filteredImportedFiles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((file: ImportedFilePreview) => (
                  <tr key={file.uniqueKey} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 sm:p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.uniqueKey)}
                        onChange={() => toggleFileSelection(file.uniqueKey)}
                        className="w-5 h-5 text-blue-600 rounded border-blue-200 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 sm:p-5 font-bold text-blue-950 break-all">{file.fileName}</td>
                    <td className="p-3 sm:p-5 text-gray-600 uppercase text-sm font-bold">{file.fileType}</td>
                    <td className="p-3 sm:p-5">
                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">{file.destination}</span>
                    </td>
                    <td className="p-3 sm:p-5 text-gray-700 font-medium">{file.itemCount}</td>
                    <td className="p-3 sm:p-5 text-right">
                      <div className="flex flex-nowrap items-center justify-end gap-1.5 opacity-100 transition-opacity">
                        <button
                          onClick={() => handleEditFile(file)}
                          disabled={saving}
                          className="flex items-center text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 font-bold text-sm"
                        >
                          <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536M9 11l6.768-6.768a2.5 2.5 0 113.536 3.536L12.536 14.536A4 4 0 019.172 15.9L6 16l.1-3.172A4 4 0 017.464 9.464z" />
                          </svg>
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          onClick={() => handleDownloadFiles([file.uniqueKey])}
                          disabled={saving}
                          className="flex items-center text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50 font-bold text-sm"
                        >
                          <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
                          </svg>
                          <span className="hidden sm:inline">{t('download')}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.uniqueKey)}
                          disabled={saving}
                          className="flex items-center text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50 font-bold text-sm"
                        >
                          <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-3h4m-6 3h8" />
                          </svg>
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
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-blue-600 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-2"
              >
                &larr; <span className="hidden sm:inline">Previous</span>
              </button>
              <span className="text-gray-600 font-medium text-sm bg-white px-4 py-2 rounded-xl border border-gray-100 shadow-sm">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-blue-600 font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-50 transition-colors shadow-sm flex items-center gap-2"
              >
                <span className="hidden sm:inline">Next</span> &rarr;
              </button>
            </div>
          )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT UPLOADED FILE MODAL — portaled to body so Layout scroll/keyboard can't collapse it */}
      {editingFile && createPortal(
        <div className="fixed inset-0 z-[100] flex items-stretch justify-center bg-blue-950/40 backdrop-blur-sm md:p-4 md:items-center">
          <div
            className="bg-white shadow-2xl w-full h-full max-h-full overflow-hidden flex flex-col md:h-auto md:max-h-[90vh] md:max-w-6xl md:rounded-[2rem]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 sm:p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 flex-wrap gap-2 sm:gap-4 shrink-0">
              <h2 className="text-lg sm:text-2xl font-extrabold text-blue-950">{t('preview_filename', { filename: editingFile || '' })} (Edit Mode)</h2>

              <div className="flex-1 max-w-md mx-auto w-full order-3 sm:order-none basis-full sm:basis-auto">
                <input
                  type="search"
                  enterKeyHint="search"
                  placeholder="Highlight specific word..."
                  value={modalSearchTerm}
                  onChange={(e) => {
                    const value = e.target.value;
                    setModalSearchTerm(value);
                    pinEditMatches(editFileItems, value);
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm text-base"
                />
              </div>

              <button
                type="button"
                onClick={() => setEditingFile(null)}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-200"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain bg-white p-3 sm:p-6 md:p-8">
              {editFileItems.length === 0 ? (
                <p className="text-gray-500 italic text-center py-4">{t("no_items_left") || "No items left. Save to delete all."}</p>
              ) : visibleEditEntries.length === 0 ? (
                <p className="text-gray-500 italic text-center py-4">{t("no_items_left") || "No matching words."}</p>
              ) : (
                <>
                  {/* Mobile / app: stacked cards — wide tables + keyboard were collapsing the editor */}
                  <div className="md:hidden space-y-4 pb-[env(safe-area-inset-bottom)]">
                    {visibleEditEntries.map(({ item, idx, key }) => (
                      <div key={key} className="rounded-2xl border border-blue-100 bg-yellow-50/40 p-4 space-y-3 shadow-sm">
                        {editingFileCategory === 'articles' ? (
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">{t('article')}</label>
                              <textarea rows={2} value={item.article || ''} onChange={(e) => handleEditItemChange(idx, 'article', e.target.value)} className={EDIT_FIELD_CLASS} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">{t('noun')}</label>
                              <textarea rows={2} value={item.noun || ''} onChange={(e) => handleEditItemChange(idx, 'noun', e.target.value)} className={EDIT_FIELD_CLASS} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">{t('hungarian')}</label>
                              <textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleEditItemChange(idx, 'hungarian', e.target.value)} className={EDIT_FIELD_CLASS} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">{t('example')}</label>
                              <textarea rows={2} value={item.example || ''} onChange={(e) => handleEditItemChange(idx, 'example', e.target.value)} className={EDIT_FIELD_CLASS} />
                            </div>
                          </>
                        ) : editingFileCategory === 'prepositions' ? (
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">{t('template_german_verb_header') || 'German Verb + Hungarian'}</label>
                              <textarea rows={2} value={item.german || ''} onChange={(e) => handleEditItemChange(idx, 'german', e.target.value)} className={EDIT_FIELD_CLASS} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">{t('prep_case_label') || 'Preposition + Case'}</label>
                              <textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleEditItemChange(idx, 'hungarian', e.target.value)} className={EDIT_FIELD_CLASS} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">{t('template_meaning_example_header') || 'Example Sentence'}</label>
                              <textarea rows={2} value={item.example || ''} onChange={(e) => handleEditItemChange(idx, 'example', e.target.value)} className={EDIT_FIELD_CLASS} />
                            </div>
                          </>
                        ) : editingFileCategory === 'false_friends' || editingFileCategory === 'idioms' ? (
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">{editingFileCategory === 'idioms' ? (t('idiom_german_label') || 'German Idiom') : t('german')}</label>
                              <textarea rows={2} value={item.german || ''} onChange={(e) => handleEditItemChange(idx, 'german', e.target.value)} className={EDIT_FIELD_CLASS} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">{editingFileCategory === 'idioms' ? (t('idiom_hungarian_label') || 'Hungarian Meaning') : t('hungarian')}</label>
                              <textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleEditItemChange(idx, 'hungarian', e.target.value)} className={EDIT_FIELD_CLASS} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">{editingFileCategory === 'idioms' ? (t('explanation_label') || 'Explanation') : t('example')}</label>
                              <textarea rows={2} value={item.example || ''} onChange={(e) => handleEditItemChange(idx, 'example', e.target.value)} className={EDIT_FIELD_CLASS} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">{editingFileCategory === 'idioms' ? (t('idiom_note_label') || 'Note') : t('note')}</label>
                              <textarea rows={2} value={item.note || ''} onChange={(e) => handleEditItemChange(idx, 'note', e.target.value)} className={EDIT_FIELD_CLASS} />
                            </div>
                          </>
                        ) : editingFileCategory === 'adjectives' ? (
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">{t('adjective') || 'Adjective'}</label>
                              <textarea rows={2} value={item.german || ''} onChange={(e) => handleEditItemChange(idx, 'german', e.target.value)} className={EDIT_FIELD_CLASS} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">{t('hungarian')}</label>
                              <textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleEditItemChange(idx, 'hungarian', e.target.value)} className={EDIT_FIELD_CLASS} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">{t('levels') || 'Levels'}</label>
                              <textarea rows={2} value={item.levels || ''} onChange={(e) => handleEditItemChange(idx, 'levels', e.target.value)} className={EDIT_FIELD_CLASS} />
                            </div>
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">{t('german')}</label>
                              <textarea rows={2} value={item.german || ''} onChange={(e) => handleEditItemChange(idx, 'german', e.target.value)} className={EDIT_FIELD_CLASS} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">{t('hungarian')}</label>
                              <textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleEditItemChange(idx, 'hungarian', e.target.value)} className={EDIT_FIELD_CLASS} />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-gray-500 mb-1">{editingFileCategory === 'verbs' ? (t('hint') || 'Hint / Past Form') : t('example')}</label>
                              <textarea
                                rows={2}
                                value={item.hint || item.example || ''}
                                onChange={(e) => handleEditItemChange(idx, editingFileCategory === 'verbs' ? 'hint' : 'example', e.target.value)}
                                className={EDIT_FIELD_CLASS}
                              />
                            </div>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteEditItem(idx)}
                          className="w-full text-red-600 font-semibold py-2 rounded-xl border border-red-100 hover:bg-red-50"
                        >
                          {t('delete') || 'Delete'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Desktop: table editor */}
                  <div className="hidden md:block overflow-x-auto">
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
                              <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{editingFileCategory === 'idioms' ? (t('idiom_german_label') || 'German Idiom') : t('german')}</th>
                              <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{editingFileCategory === 'idioms' ? (t('idiom_hungarian_label') || 'Hungarian Meaning') : t('hungarian')}</th>
                              <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{editingFileCategory === 'idioms' ? (t('explanation_label') || 'Explanation') : t('example')}</th>
                              <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{editingFileCategory === 'idioms' ? (t('idiom_note_label') || 'Note (Explanation)') : t('note')}</th>
                            </>
                          ) : editingFileCategory === 'prepositions' ? (
                            <>
                              <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('template_german_verb_header') || 'German Verb + Hungarian'}</th>
                              <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('prep_case_label') || 'Preposition + Case'}</th>
                              <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('template_meaning_example_header') || 'Example Sentence'}</th>
                            </>
                          ) : editingFileCategory === 'adjectives' ? (
                            <>
                              <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('adjective') || 'Adjective'}</th>
                              <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('hungarian')}</th>
                              <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('levels') || 'Levels'}</th>
                            </>
                          ) : editingFileCategory === 'verbs' ? (
                            <>
                              <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('german')}</th>
                              <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('hungarian')}</th>
                              <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/3">{t('hint') || 'Hint / Past Form'}</th>
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
                        {visibleEditEntries.map(({ item, idx, key }) => (
                          <tr key={key} className={`transition-colors ${pinnedEditMatchKeys ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                            {editingFileCategory === 'articles' ? (
                              <>
                                <td className="p-1 sm:p-2 border-r border-gray-100 align-top">
                                  <textarea rows={2} value={item.article || ''} onChange={(e) => handleEditItemChange(idx, 'article', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" />
                                </td>
                                <td className="p-1 sm:p-2 border-r border-gray-100 align-top">
                                  <textarea rows={2} value={item.noun || ''} onChange={(e) => handleEditItemChange(idx, 'noun', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" />
                                </td>
                                <td className="p-1 sm:p-2 border-r border-gray-100 align-top">
                                  <textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleEditItemChange(idx, 'hungarian', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" />
                                </td>
                                <td className="p-1 sm:p-2 align-top">
                                  <textarea rows={2} value={item.example || ''} onChange={(e) => handleEditItemChange(idx, 'example', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" />
                                </td>
                              </>
                            ) : editingFileCategory === 'prepositions' ? (
                              <>
                                <td className="p-1 sm:p-2 border-r border-gray-100 align-top">
                                  <textarea rows={2} value={item.german || ''} onChange={(e) => handleEditItemChange(idx, 'german', e.target.value)} placeholder={t('modal_german_prep_verb_placeholder') || "e.g. verzichten, lemondani, felhagyni valamivel"} className="w-full border border-gray-200 rounded p-2 text-sm" />
                                </td>
                                <td className="p-1 sm:p-2 border-r border-gray-100 align-top">
                                  <textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleEditItemChange(idx, 'hungarian', e.target.value)} placeholder={t('modal_prep_case_placeholder') || "e.g. auf + Akk."} className="w-full border border-gray-200 rounded p-2 text-sm" />
                                </td>
                                <td className="p-1 sm:p-2 align-top">
                                  <textarea rows={2} value={item.example || ''} onChange={(e) => handleEditItemChange(idx, 'example', e.target.value)} placeholder={t('meaning_example_placeholder') || "e.g. Ich verzichte auf das Angebot."} className="w-full border border-gray-200 rounded p-2 text-sm" />
                                </td>
                              </>
                            ) : editingFileCategory === 'false_friends' || editingFileCategory === 'idioms' ? (
                              <>
                                <td className="p-1 sm:p-2 border-r border-gray-100 align-top">
                                  <textarea rows={2} value={item.german || ''} onChange={(e) => handleEditItemChange(idx, 'german', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" />
                                </td>
                                <td className="p-1 sm:p-2 border-r border-gray-100 align-top">
                                  <textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleEditItemChange(idx, 'hungarian', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" />
                                </td>
                                <td className="p-1 sm:p-2 border-r border-gray-100 align-top">
                                  <textarea rows={2} value={item.example || ''} onChange={(e) => handleEditItemChange(idx, 'example', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" />
                                </td>
                                <td className="p-1 sm:p-2 align-top">
                                  <textarea rows={2} value={item.note || ''} onChange={(e) => handleEditItemChange(idx, 'note', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" />
                                </td>
                              </>
                            ) : editingFileCategory === 'adjectives' ? (
                              <>
                                <td className="p-1 sm:p-2 border-r border-gray-100 align-top">
                                  <textarea rows={2} value={item.german || ''} onChange={(e) => handleEditItemChange(idx, 'german', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" />
                                </td>
                                <td className="p-1 sm:p-2 border-r border-gray-100 align-top">
                                  <textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleEditItemChange(idx, 'hungarian', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" />
                                </td>
                                <td className="p-1 sm:p-2 align-top">
                                  <textarea rows={2} value={item.levels || ''} onChange={(e) => handleEditItemChange(idx, 'levels', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" />
                                </td>
                              </>
                            ) : (
                              <>
                                <td className="p-1 sm:p-2 border-r border-gray-100 align-top">
                                  <textarea rows={2} value={item.german || ''} onChange={(e) => handleEditItemChange(idx, 'german', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" />
                                </td>
                                <td className="p-1 sm:p-2 border-r border-gray-100 align-top">
                                  <textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleEditItemChange(idx, 'hungarian', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" />
                                </td>
                                <td className="p-1 sm:p-2 align-top">
                                  <textarea rows={2} value={item.hint || item.example || ''} onChange={(e) => handleEditItemChange(idx, editingFileCategory === 'verbs' ? 'hint' : 'example', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" />
                                </td>
                              </>
                            )}
                            <td className="p-1 sm:p-2 align-top text-center border-l border-gray-100">
                              <button type="button" onClick={() => handleDeleteEditItem(idx)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50" title={t('delete') || 'Delete'}>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>

            <div className="p-3 sm:p-6 md:p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-end gap-3 shrink-0 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => setEditingFile(null)}
                disabled={isSavingEdit}
                className="w-full sm:w-auto px-6 py-3 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSaveFileEdits}
                disabled={isSavingEdit}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm disabled:opacity-50 transition-colors"
              >
                {isSavingEdit ? t('saving') : t('modal_save_changes') || 'Save Changes'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      </div>
    </div>
  );
}
