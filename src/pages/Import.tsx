import { useState, useMemo, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import * as XLSX from 'xlsx';
import FileDropZone from "../components/FileDropZone";
import { ParsedImport } from "../lib/importParser";
import { useAuth } from "../AuthContext";
import { publicVocabulary, publicPhrases, publicArticles, publicPrepositions, publicFalseFriends, publicAdjectives } from '../lib/public-data';
import { useCloudVocabulary, bulkAddCloudWords, bulkDeleteCloudWords, updateCloudWord } from "../lib/firestore";
import { useI18n } from "../I18nContext";

interface ImportedFilePreview {
  fileName: string;
  fileType: string;
  destination: string;
  itemCount: number;
  wordIds: string[];
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
  const existingItems = useCloudVocabulary(saveToPublic ? "PUBLIC_LIBRARY" : user?.uid) || [];
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

  useEffect(() => {
    setSaveToPublic(isAdmin ? adminMode : false);
  }, [isAdmin, adminMode]);

  const allItems = useMemo(() => {
    const cloudItems = existingItems.map((item: any) => ({ ...item, isCloud: true }));
    if (!saveToPublic) return cloudItems;

    const staticItems: any[] = [];
    const pushStatic = (data: any[], type: string) => {
      data.forEach((item: any, idx: number) => {
        const key = String(item.german || '').toLowerCase().trim();
        // If a tombstone or override exists in the cloud DB for this exact german key, hide the static one
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

      // Detect columns: Tab (Excel paste), Semicolon (CSV), or Comma (CSV)
      let parts = cleanLine.split('\t');
      // Use regex to split by semicolon or comma, but securely ignore them if they are inside double quotes!
      if (parts.length < 2) parts = cleanLine.split(/;(?=(?:(?:[^"]*"){2})*[^"]*$)/);
      if (parts.length < 2) parts = cleanLine.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);

      if (parts.length >= 2) {
        // Helper to remove surrounding quotes that Excel/CSV sometimes adds
        const stripQuotes = (str: string | undefined) => str ? str.trim().replace(/^"|"$/g, '').trim() : "";

        const p0 = stripQuotes(parts[0]);
        const p1 = stripQuotes(parts[1]);
        const p2 = stripQuotes(parts[2]);
        const p3 = stripQuotes(parts[3]);

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
          // Validate that article and noun are not empty
          if (!p0.trim() || !p1.trim()) {
            console.warn(`Skipping incomplete article row: article="${p0}" | noun="${p1}"`);
            continue;
          }
          // Store article and noun separately for the preview, but also combine them for the quiz engine
          items.push({ article: p0, noun: p1, hungarian: p2, example: p3, german: `${p0} ${p1}`.trim() });
        } else if (destination === 'false_friends' || destination === 'idioms') {
          items.push({ german: p0, hungarian: p1, example: p2, note: p3 });
        } else if (destination === 'verbs') {
          items.push({ german: p0, hungarian: p1, example: p2 });
        } else if (destination === 'adjectives') {
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
      if (!fileMap.has(source)) {
        fileMap.set(source, {
          fileName: source,
          fileType: item.sourceType || (item.sourceFile ? item.sourceFile.split('.').pop() || 'unknown' : 'unknown'),
          destination: item.category || 'mixed',
          itemCount: 0,
          wordIds: []
        });
      }
      const fileData = fileMap.get(source)!;
      fileData.itemCount++;
      if (item.id) fileData.wordIds.push(item.id);
    });
    return Array.from(fileMap.values()).sort((a, b) => a.fileName.localeCompare(b.fileName));
  }, [allItems]);

  const filteredImportedFiles = useMemo(() => {
    if (!fileSearchTerm.trim()) return importedFiles;
    const term = fileSearchTerm.toLowerCase();
    return importedFiles.filter((f: ImportedFilePreview) => {
      if (f.fileName.toLowerCase().includes(term)) return true;
      const itemsInFile = allItems.filter((item: any) => (item.sourceFile || "Legacy Import (No File Name)") === f.fileName);
      return itemsInFile.some((item: any) =>
        (item.german || '').toLowerCase().includes(term) ||
        (item.hungarian || '').toLowerCase().includes(term) ||
        (item.example || '').toLowerCase().includes(term) ||
        (item.note || '').toLowerCase().includes(term)
      );
    });
  }, [importedFiles, allItems, fileSearchTerm]);

  const toggleFileSelection = (fileName: string) => {
    setSelectedFiles(prev => {
      const next = new Set(prev);
      if (next.has(fileName)) next.delete(fileName);
      else next.add(fileName);
      return next;
    });
  };

  const handleEditFile = (file: ImportedFilePreview) => {
    const items = allItems.filter((item: any) => (item.sourceFile || "Legacy Import (No File Name)") === file.fileName);
    setEditFileItems(JSON.parse(JSON.stringify(items)));
    setEditingFileCategory(file.destination);
    setEditingFile(file.fileName);
    setDeletedEditItemIds([]);
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
      }

      const newCloudItems: any[] = [];
      const originalItems = allItems.filter((item: any) => (item.sourceFile || 'Legacy Import (No File Name)') === editingFile);
      const originalMap = new Map<string, any>(originalItems.map((i: any) => [i.id, i]));

      for (const item of editFileItems) {
        if (!item.id) continue;
        const orig = originalMap.get(item.id);
        if (
          orig &&
          (orig.german !== item.german ||
            orig.hungarian !== item.hungarian ||
            orig.example !== item.example ||
            (orig as any).note !== item.note)
        ) {
          if (orig.isCloud) {
            await updateCloudWord(
              item.id,
              {
                german: item.german?.trim() || '',
                hungarian: item.hungarian?.trim() || '',
                example: item.example?.trim() || '',
                note: item.note?.trim() || ''
              } as any
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
            newCloudItems.push({
              userId: 'PUBLIC_LIBRARY',
              german: item.german?.trim() || '',
              hungarian: item.hungarian?.trim() || '',
              example: item.example?.trim() || '',
              note: item.note?.trim() || '',
              category: orig.category || 'vocabulary',
              dateAdded: Date.now(),
              sourceFile: orig.sourceFile,
              sourceType: orig.sourceType
            });
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
      alert('An error occurred while saving edits.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteFile = async (fileName: string, wordIds: string[]) => {
    if (!confirm(t('confirm_delete_file', { fileName, count: wordIds.length }))) return;

    setSaving(true);
    try {
      const cloudDeletes = wordIds.filter((id: string) => !id.startsWith('static_'));
      const staticDeletes = wordIds.filter((id: string) => id.startsWith('static_'));

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

      setSelectedFiles(prev => {
        const next = new Set(prev);
        next.delete(fileName);
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
      const idsToDelete: string[] = [];
      importedFiles.forEach((f: ImportedFilePreview) => {
        if (selectedFiles.has(f.fileName)) idsToDelete.push(...f.wordIds);
      });

      const cloudDeletes = idsToDelete.filter((id: string) => !id.startsWith('static_'));
      const staticDeletes = idsToDelete.filter((id: string) => id.startsWith('static_'));

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

  const handleDownloadFiles = (fileNames: string[]) => {
    const itemsToExport = allItems.filter((item: any) => {
      const source = item.sourceFile || 'Legacy Import (No File Name)';
      return fileNames.includes(source);
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

    const outName =
      fileNames.length === 1
        ? `MicaLingo_Export_${fileNames[0].replace(/\.[^/.]+$/, '')}.xlsx`
        : `MicaLingo_Bulk_Export_${fileNames.length}_files.xlsx`;

    XLSX.writeFile(workbook, outName);
  };

  const handleDownloadTemplate = (type: 'standard' | 'articles' | 'adjectives' | 'verbs' | 'false_friends' | 'idioms') => {
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
          [t('template_example_header') || 'Example']: type === 'idioms' ? 'Als er über Quantenphysik sprach, verstand ich nur Bahnhof.' : 'Dieses Tier produziert ein starkes Gift.',
          [t('note') || 'Note']: type === 'idioms' ? 'Literal meaning: I only understand train station.' : 'False friend: gift != ajándék'
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
        : [{ wch: 30 }, { wch: 30 }, { wch: 50 }];
        
    const sheetName = type === 'articles' ? 'Articles' : type === 'adjectives' ? 'Adjectives' : type === 'verbs' ? 'Verbs' : type === 'false_friends' ? 'False_Friends' : type === 'idioms' ? 'Idioms' : 'Vocabulary';

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

  const handleSave = async () => {
    if (previewItems.length === 0 || !user || !data) {
      alert(t('no_items_save'));
      return;
    }

    setSaving(true);
    try {
      // Check for duplicates based on the German word within the target destination category
      const existingSet = new Set(
        allItems
          .filter((item: any) => (item.category || 'vocabulary') === destination)
          .map((item: any) => (item.german || '').toLowerCase().trim())
      );

      const itemsToSave: any[] = [];
      let duplicateCount = 0;

      for (const item of previewItems) {
        const german = item.german?.trim() || '';
        const hungarian = item.hungarian?.trim() || '';

        if (!german || !hungarian) continue; // Skip empty rows silently

        const key = german.toLowerCase();
        if (!existingSet.has(key)) {
          existingSet.add(key); // Prevent duplicates within the new batch itself
          itemsToSave.push({
            ...item,
            userId: saveToPublic ? 'PUBLIC_LIBRARY' : user.uid,
            dateAdded: Date.now(),
            category: destination,
            sourceFile: data.fileName,
            sourceType: data.fileType
          });
        } else {
          duplicateCount++;
        }
      }

      if (itemsToSave.length > 0) {
        await bulkAddCloudWords(itemsToSave as any[]);
      }
      setData(null); // Clear preview after saving

      if (duplicateCount > 0) {
        alert(t('import_success_with_duplicates', { saved: itemsToSave.length, duplicates: duplicateCount }));
      } else {
        alert(t('import_success', { saved: itemsToSave.length }));
      }
    } catch (error) {
      console.error('Failed to save vocabulary:', error);

      const message = error instanceof Error ? error.message : JSON.stringify(error);

      alert(`Database error:\n${message}`);
    } finally {
      setSaving(false);
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

        {isAdmin && (
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
          <li><strong>{t('articles_quiz')}</strong> {t('format_articles')}</li>
          <li><strong>{t('adjectives_quiz')}</strong> {t('format_adjectives')}</li>
        </ul>

        {/* Downloadable Template */}
          <div className="mt-4 pt-4 border-t border-blue-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-blue-800">{t('need_starting_point')}</h3>
            <p className="text-sm text-blue-600">{t('download_template_desc')}</p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full lg:w-auto">
            <button
              onClick={() => handleDownloadTemplate('standard')}
                className="whitespace-nowrap px-5 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
              </svg>
              {t('vocab_template')}
            </button>
            <button
              onClick={() => handleDownloadTemplate('articles')}
                className="whitespace-nowrap px-5 py-2.5 bg-white text-blue-600 border border-blue-200 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
              </svg>
              {t('articles_template')}
            </button>
            <button
              onClick={() => handleDownloadTemplate('adjectives')}
              className="whitespace-nowrap px-5 py-2.5 bg-white text-blue-600 border border-blue-200 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
              </svg>
              {t('adjectives_template')}
            </button>
            <button
              onClick={() => handleDownloadTemplate('verbs')}
              className="whitespace-nowrap px-5 py-2.5 bg-white text-blue-600 border border-blue-200 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
              </svg>
              {t('verbs_template') || 'Verbs Template'}
            </button>
            <button
              onClick={() => handleDownloadTemplate('false_friends')}
              className="whitespace-nowrap px-5 py-2.5 bg-white text-blue-600 border border-blue-200 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
              </svg>
              {t('false_friends') || 'False Friends Template'}
            </button>
            <button
              onClick={() => handleDownloadTemplate('idioms')}
              className="whitespace-nowrap px-5 py-2.5 bg-white text-blue-600 border border-blue-200 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
              </svg>
              {t('idioms') || 'Idioms Template'}
            </button>
          </div>
        </div>
        </div>

      {/* DROP ZONE CENTER AREA */}
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
            <div className="bg-white border border-blue-50 rounded-2xl shadow-sm max-h-[400px] overflow-auto">
              <table className="w-full text-left border-collapse table-fixed">
                <thead className="bg-blue-50/50 border-b border-blue-100 sticky top-0 backdrop-blur-md z-10">
                  <tr>
                    {destination === 'articles' ? (
                      <>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('article')} <span className="text-xs font-normal text-gray-500 block">{t('column_a')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('noun')} <span className="text-xs font-normal text-gray-500 block">{t('column_b')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('hungarian')} <span className="text-xs font-normal text-gray-500 block">{t('column_c')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('example')} <span className="text-xs font-normal text-gray-500 block">{t('column_d')}</span></th>
                      </>
                    ) : destination === 'false_friends' || destination === 'idioms' ? (
                      <>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('german')} <span className="text-xs font-normal text-gray-500 block">{t('column_a')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('hungarian')} <span className="text-xs font-normal text-gray-500 block">{t('column_b')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('example')} <span className="text-xs font-normal text-gray-500 block">{t('column_c')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('note')} <span className="text-xs font-normal text-gray-500 block">{t('column_d')}</span></th>
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
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.article || ''} onChange={(e) => handleItemChange(idx, 'article', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.noun || ''} onChange={(e) => handleItemChange(idx, 'noun', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleItemChange(idx, 'hungarian', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" /></td>
                          <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.example || ''} onChange={(e) => handleItemChange(idx, 'example', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" /></td>
                        </>
                      ) : destination === 'false_friends' || destination === 'idioms' ? (
                        <>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.german || ''} onChange={(e) => handleItemChange(idx, 'german', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleItemChange(idx, 'hungarian', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.example || ''} onChange={(e) => handleItemChange(idx, 'example', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" /></td>
                          <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.note || ''} onChange={(e) => handleItemChange(idx, 'note', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" /></td>
                        </>
                      ) : destination === 'adjectives' ? (
                        <>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.german || ''} onChange={(e) => handleItemChange(idx, 'german', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleItemChange(idx, 'hungarian', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" /></td>
                          <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.example || ''} onChange={(e) => handleItemChange(idx, 'example', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" /></td>
                        </>
                      ) : destination === 'verbs' ? (
                        <>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.german || ''} onChange={(e) => handleItemChange(idx, 'german', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleItemChange(idx, 'hungarian', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" /></td>
                          <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.example || ''} onChange={(e) => handleItemChange(idx, 'example', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" /></td>
                        </>
                      ) : (
                        <>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.german || ''} onChange={(e) => handleItemChange(idx, 'german', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleItemChange(idx, 'hungarian', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" /></td>
                          <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.example || ''} onChange={(e) => handleItemChange(idx, 'example', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" /></td>
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
                  <option value="false_friends">{t('false_friends') || 'False Friends'}</option>
                  <option value="idioms">{t('idioms') || 'Idioms'}</option>
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
      </div>

      {/* IMPORTED FILES MANAGER */}
      {importedFiles.length > 0 && (
        <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white space-y-6 mt-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-2xl font-extrabold text-blue-950">
                {t('manage_imported_files')} {isAdmin && <span className="text-purple-600 ml-2">({saveToPublic ? 'Public' : 'Private'})</span>}
              </h2>
              <p className="text-gray-600 text-sm">{t('manage_imported_files_desc')}</p>
            </div>
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder={t('search_files') || 'Search files or keywords...'}
                value={fileSearchTerm}
                onChange={(e) => setFileSearchTerm(e.target.value)}
                className="w-full px-5 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
              />
            </div>
          </div>

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
            <table className="w-full text-left border-collapse">
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
                {filteredImportedFiles.map((file: ImportedFilePreview) => (
                  <tr key={file.fileName} className="hover:bg-gray-50 transition-colors">
                    <td className="p-3 sm:p-4 text-center">
                      <input
                        type="checkbox"
                        checked={selectedFiles.has(file.fileName)}
                        onChange={() => toggleFileSelection(file.fileName)}
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
                      <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-2">
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
                          onClick={() => handleDownloadFiles([file.fileName])}
                          disabled={saving}
                          className="flex items-center text-green-600 hover:text-green-800 p-2 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50 font-bold text-sm"
                        >
                          <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
                          </svg>
                          <span className="hidden sm:inline">{t('download')}</span>
                        </button>
                        <button
                          onClick={() => handleDeleteFile(file.fileName, file.wordIds)}
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
        </div>
      )}

      {/* EDIT UPLOADED FILE MODAL */}
      {editingFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/40 backdrop-blur-sm transition-opacity">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
            <div className="p-6 md:p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-2xl font-extrabold text-blue-950">{t('preview_filename', { filename: editingFile || '' })} (Edit Mode)</h2>
              <button onClick={() => setEditingFile(null)} className="text-gray-400 hover:text-gray-600 transition-colors p-2 rounded-full hover:bg-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>

            <div className="flex-1 overflow-auto bg-white p-6 md:p-8">
              {editFileItems.length === 0 ? (
                <p className="text-gray-500 italic text-center py-4">{t("no_items_left") || "No items left. Save to delete all."}</p>
              ) : (
                <table className="w-full text-left border-collapse table-fixed border border-blue-50 rounded-xl shadow-sm">
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
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('german')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('hungarian')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('example')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('note')}</th>
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
                    {editFileItems.map((item: any, idx: number) => (
                      <tr key={item.id || idx} className="hover:bg-gray-50 transition-colors">
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
                              <textarea rows={2} value={item.example || ''} onChange={(e) => handleEditItemChange(idx, 'example', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" />
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
                              <textarea rows={2} value={item.example || ''} onChange={(e) => handleEditItemChange(idx, 'example', e.target.value)} className="w-full border border-gray-200 rounded p-2 text-sm" />
                            </td>
                          </>
                        )}
                        <td className="p-1 sm:p-2 align-top text-center border-l border-gray-100">
                          <button onClick={() => handleDeleteEditItem(idx)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50" title={t('delete') || 'Delete'}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-6 md:p-8 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row justify-end gap-3">
              <button
                onClick={() => setEditingFile(null)}
                disabled={isSavingEdit}
                className="w-full sm:w-auto px-6 py-3 font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors disabled:opacity-50"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSaveFileEdits}
                disabled={isSavingEdit}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-xl shadow-sm disabled:opacity-50 transition-colors"
              >
                {isSavingEdit ? t('saving') : t('modal_save_changes') || 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
