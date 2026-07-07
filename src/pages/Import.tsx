import { useState, useMemo, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import * as XLSX from 'xlsx';
import FileDropZone from "../components/FileDropZone";
import { ParsedImport } from "../lib/importParser";
import { useAuth } from "../AuthContext";
import { publicVocabulary, publicPhrases, publicArticles, publicPrepositions, publicFalseFriends } from '../lib/public-data';
import { useCloudVocabulary, bulkAddCloudWords, bulkDeleteCloudWords, updateCloudWord } from "../lib/firestore";
import { useI18n } from "../I18nContext";

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

  const allItems = useMemo(() => {
    const cloudItems = existingItems.map(item => ({ ...item, isCloud: true }));
    if (!saveToPublic) return cloudItems;

    const staticItems: any[] = [];
    const pushStatic = (data: any[], type: string) => {
      data.forEach((item, idx) => {
        const key = item.german.toLowerCase().trim();
        // If a tombstone or override exists in the cloud DB for this exact german key, hide the static one
        const hasTombstoneOrOverride = existingItems.some(i => (i.german || '').toLowerCase().trim() === key);
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

    return [...cloudItems.filter(i => !(i as any).deleted), ...staticItems];
  }, [existingItems, adminMode]);

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
    const items = [];

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
          lowerP0.includes(t('template_article_header').toLowerCase()) || 
          lowerP0.includes(t('template_german_mandatory_header').toLowerCase()) ||
          lowerP0.includes(t('template_german_header').toLowerCase())
        ) {
          continue;
        }

        if (destination === 'articles') {
          // Store article and noun separately for the preview, but also combine them for the quiz engine
          items.push({ article: p0, noun: p1, hungarian: p2, example: p3, german: `${p0} ${p1}`.trim() });
        } else if (destination === 'false_friends') {
          items.push({ german: p0, hungarian: p1, example: p2, note: p3 });
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

  interface ImportedFilePreview {
    fileName: string;
    fileType: string;
    destination: string;
    itemCount: number;
    wordIds: string[];
  }

  const importedFiles = useMemo(() => {
    const fileMap = new Map<string, ImportedFilePreview>();
    allItems.forEach(item => {
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
    return importedFiles.filter(f => {
      if (f.fileName.toLowerCase().includes(term)) return true;
      const itemsInFile = allItems.filter(item => (item.sourceFile || "Legacy Import (No File Name)") === f.fileName);
      return itemsInFile.some(item => 
        (item.german || '').toLowerCase().includes(term) ||
        (item.hungarian || '').toLowerCase().includes(term) ||
        (item.example || '').toLowerCase().includes(term) ||
        ((item as any).note || '').toLowerCase().includes(term)
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
    const items = allItems.filter(item => (item.sourceFile || "Legacy Import (No File Name)") === file.fileName);
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
        const cloudDeletes = deletedEditItemIds.filter(id => !id.startsWith('static_'));
        const staticDeletes = deletedEditItemIds.filter(id => id.startsWith('static_'));

        if (cloudDeletes.length > 0) await bulkDeleteCloudWords(cloudDeletes);

        if (staticDeletes.length > 0) {
          const tombstones = staticDeletes.map(id => {
            const orig = allItems.find(i => i.id === id);
            return orig ? { userId: "PUBLIC_LIBRARY", german: orig.german, hungarian: orig.hungarian, category: orig.category || "vocabulary", deleted: true, dateAdded: Date.now() } : null;
          }).filter(Boolean);
          if (tombstones.length > 0) await bulkAddCloudWords(tombstones as any[]);
        }
      }

      const newCloudItems: any[] = [];
      const originalItems = allItems.filter(item => (item.sourceFile || "Legacy Import (No File Name)") === editingFile);
      const originalMap = new Map(originalItems.map(i => [i.id, i]));

      for (const item of editFileItems) {
        if (!item.id) continue;
        const orig = originalMap.get(item.id);
        if (orig && (orig.german !== item.german || orig.hungarian !== item.hungarian || orig.example !== item.example || (orig as any).note !== item.note)) {
          if (orig.isCloud) {
            await updateCloudWord(item.id, { german: item.german?.trim() || '', hungarian: item.hungarian?.trim() || '', example: item.example?.trim() || '', note: item.note?.trim() || '' } as any);
          } else {
            // Static item modified! Tombstone old + create new cloud item
            newCloudItems.push({ userId: "PUBLIC_LIBRARY", german: orig.german, hungarian: orig.hungarian, category: orig.category || "vocabulary", deleted: true, dateAdded: Date.now() });
            newCloudItems.push({ 
              userId: "PUBLIC_LIBRARY", german: item.german?.trim() || '', hungarian: item.hungarian?.trim() || '', 
              example: item.example?.trim() || '', note: item.note?.trim() || '', category: orig.category || "vocabulary", 
              dateAdded: Date.now(), sourceFile: orig.sourceFile, sourceType: orig.sourceType 
            });
          }
        }
      }

      if (newCloudItems.length > 0) {
        await bulkAddCloudWords(newCloudItems);
      }

      setEditingFile(null);
      setDeletedEditItemIds([]);
    } catch (error) {
      console.error("Failed to save edits:", error);
      alert("An error occurred while saving edits.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteFile = async (fileName: string, wordIds: string[]) => {
    if (!confirm(t('confirm_delete_file', { fileName, count: wordIds.length }))) return;

    setSaving(true);
    try {
      const cloudDeletes = wordIds.filter(id => !id.startsWith('static_'));
      const staticDeletes = wordIds.filter(id => id.startsWith('static_'));

      if (cloudDeletes.length > 0) await bulkDeleteCloudWords(cloudDeletes);

      if (staticDeletes.length > 0) {
        const tombstones = staticDeletes.map(id => {
          const orig = allItems.find(i => i.id === id);
          return orig ? { userId: "PUBLIC_LIBRARY", german: orig.german, hungarian: orig.hungarian, category: orig.category || "vocabulary", deleted: true, dateAdded: Date.now() } : null;
        }).filter(Boolean);
        if (tombstones.length > 0) await bulkAddCloudWords(tombstones as any[]);
      }

      setSelectedFiles(prev => {
        const next = new Set(prev);
        next.delete(fileName);
        return next;
      });
    } catch (error) {
      console.error("Failed to delete file items:", error);
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
      importedFiles.forEach(f => {
        if (selectedFiles.has(f.fileName)) idsToDelete.push(...f.wordIds);
      });

      const cloudDeletes = idsToDelete.filter(id => !id.startsWith('static_'));
      const staticDeletes = idsToDelete.filter(id => id.startsWith('static_'));

      if (cloudDeletes.length > 0) await bulkDeleteCloudWords(cloudDeletes);

      if (staticDeletes.length > 0) {
        const tombstones = staticDeletes.map(id => {
          const orig = allItems.find(i => i.id === id);
          return orig ? { userId: "PUBLIC_LIBRARY", german: orig.german, hungarian: orig.hungarian, category: orig.category || "vocabulary", deleted: true, dateAdded: Date.now() } : null;
        }).filter(Boolean);
        if (tombstones.length > 0) await bulkAddCloudWords(tombstones as any[]);
      }

      setSelectedFiles(new Set());
    } catch (error) {
      console.error("Failed to bulk delete files:", error);
      alert(t('error_bulk_delete_desc'));
    } finally {
      setSaving(false);
    }
  };

  const handleDownloadFiles = (fileNames: string[]) => {
    const itemsToExport = allItems.filter(item => {
      const source = item.sourceFile || "Legacy Import (No File Name)";
      return fileNames.includes(source);
    });

    if (itemsToExport.length === 0) {
      alert(t('no_items_export'));
      return;
    }

    const exportData = itemsToExport.map(item => ({
      "German": item.german || "",
      "Hungarian": item.hungarian || "",
      "Example": item.example || "",
      "Note": (item as any).note || "",
      "Category": item.category || "",
      "Source File": item.sourceFile || "Legacy Import (No File Name)"
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    worksheet['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 40 }, { wch: 15 }, { wch: 25 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Export");

    const outName = fileNames.length === 1 
      ? `MicaLingo_Export_${fileNames[0].replace(/\.[^/.]+$/, "")}.xlsx` 
      : `MicaLingo_Bulk_Export_${fileNames.length}_files.xlsx`;

    XLSX.writeFile(workbook, outName);
  };

  const handleDownloadTemplate = (type: 'standard' | 'articles' | 'false_friends') => {
    let templateData: object[];

    if (type === 'articles') {
      templateData = [
        { [t('template_article_header')]: "der", [t('template_noun_header')]: "Mann, die Männer", [t('template_hungarian_header')]: "a férfi", [t('template_example_header')]: "Der Mann arbeitet im Büro." },
        { [t('template_article_header')]: "die", [t('template_noun_header')]: "Frau, die Frauen", [t('template_hungarian_header')]: "a nő", [t('template_example_header')]: "Die Frau trinkt einen Kaffee." }
      ];
    } else if (type === 'false_friends') {
      templateData = [
    { [t('template_german_header')]: "das Gift, die Gifte", [t('template_hungarian_header')]: "a méreg", [t('template_example_header')]: "Dieses Tier produziert ein starkes Gift.", [t('template_note_header')]: "Nem ajándék! (ajándék = das Geschenk)" }
      ];
    } else {
      templateData = [
        { [t('template_german_header')]: "der Hund", [t('template_hungarian_header')]: "a kutya", [t('template_example_header')]: "Der Hund spielt im Garten." },
        { [t('template_german_header')]: "sprechen", [t('template_hungarian_header')]: "beszélni", [t('template_example_header')]: "Ich spreche ein bisschen Deutsch." },
        { [t('template_german_header')]: "schnell", [t('template_hungarian_header')]: "gyors", [t('template_example_header')]: "" }
      ];
    }

    const worksheet = XLSX.utils.json_to_sheet(templateData);

    worksheet['!cols'] = type === 'articles' 
      ? [{ wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 50 }] 
      : type === 'false_friends'
      ? [{ wch: 25 }, { wch: 25 }, { wch: 40 }, { wch: 40 }]
      : [{ wch: 40 }, { wch: 30 }, { wch: 50 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `${type === 'articles' ? 'Articles' : type === 'false_friends' ? 'FalseFriends' : 'Vocabulary'}_Template`);

    XLSX.writeFile(workbook, `MicaLingo_${type === 'articles' ? 'Articles' : type === 'false_friends' ? 'FalseFriends' : 'Import'}_Template.xlsx`);
  };

  const handleSave = async () => {
    if (previewItems.length === 0 || !user || !data) {
      alert(t('no_items_save'));
      return;
    }

    setSaving(true);
    try {
      const existingSet = new Set(
        allItems.map(item => `${(item.german || '').toLowerCase().trim()}|${(item.hungarian || '').toLowerCase().trim()}`)
      );

      const itemsToSave = [];
      let duplicateCount = 0;

      for (const item of previewItems) {
        const german = item.german?.trim() || '';
        const hungarian = item.hungarian?.trim() || '';

        if (!german || !hungarian) continue; // Skip empty rows silently

        const key = `${german.toLowerCase()}|${hungarian.toLowerCase()}`;
        if (!existingSet.has(key)) {
          existingSet.add(key); // Prevent duplicates within the new batch itself
          itemsToSave.push({
            ...item,
            userId: saveToPublic ? "PUBLIC_LIBRARY" : user.uid,
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
        await bulkAddCloudWords(itemsToSave);
      }
      setData(null); // Clear preview after saving

      if (duplicateCount > 0) {
        alert(t('import_success_with_duplicates', { saved: itemsToSave.length, duplicates: duplicateCount }));
      } else {
        alert(t('import_success', { saved: itemsToSave.length }));
      }
    } catch (error) {
      console.error("Failed to save vocabulary:", error);
      alert(t('error_saving_db'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium px-4 py-2 rounded-lg shadow-sm transition-colors flex items-center gap-2">
            {t('back_button')}
          </Link>
          <h1 className="text-2xl font-bold">{t('import_title')}</h1>
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
              <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              <span className="ml-3 text-sm font-medium text-purple-800">
                {saveToPublic ? 'Public Library' : 'Personal Library'}
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Format Instructions */}
      <div className="bg-blue-50 p-5 rounded-xl border border-blue-200 shadow-sm">
        <h2 className="font-bold text-blue-800 mb-2">{t('accepted_format_guide')}</h2>
        <ul className="text-sm text-blue-700 list-disc list-inside space-y-1.5 ml-2">
          <li><strong>{t('vocab_phrases')}</strong> {t('format_vocab_phrases')}</li>
          <li><strong>{t('false_friends_label')}</strong> {t('format_false_friends')}</li>
          <li><strong>{t('articles_quiz_label')}</strong> {t('format_articles')}</li>
          <li><strong>{t('text_copy_paste')}</strong> {t('format_text')}</li>
        </ul>

        {/* Downloadable Template */}
        <div className="mt-4 pt-4 border-t border-blue-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-blue-800">{t('need_starting_point')}</h3>
            <p className="text-sm text-blue-600">{t('download_template_desc')}</p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full lg:w-auto">
            <button
              onClick={() => handleDownloadTemplate('standard')}
              className="whitespace-nowrap px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              {t('vocab_template')}
            </button>
            <button
              onClick={() => handleDownloadTemplate('articles')}
              className="whitespace-nowrap px-4 py-2 bg-white text-blue-600 border border-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              {t('articles_template')}
            </button>
            <button
              onClick={() => handleDownloadTemplate('false_friends')}
              className="whitespace-nowrap px-4 py-2 bg-white text-blue-600 border border-blue-600 font-medium rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center gap-2 shadow-sm w-full sm:w-auto"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
              {t('false_friends_template')}
            </button>
          </div>
        </div>
      </div>

      {/* DROP ZONE CENTER AREA */}
      <div className="relative border-2 border-dashed border-blue-300 rounded-2xl bg-white hover:bg-blue-50 transition-colors flex flex-col items-center justify-center text-center shadow-sm group cursor-pointer overflow-hidden">
        <div className="p-10 pointer-events-none flex flex-col items-center">
          <div className="mb-4 bg-blue-100 p-4 rounded-full text-blue-600 group-hover:scale-110 transition-transform">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path></svg>
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
            <div className="bg-white border border-gray-200 rounded shadow-sm max-h-[400px] overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    {destination === 'articles' ? (
                      <>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('article')} <span className="text-xs font-normal text-gray-500 block">{t('column_a')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('noun')} <span className="text-xs font-normal text-gray-500 block">{t('column_b')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('hungarian')} <span className="text-xs font-normal text-gray-500 block">{t('column_c')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('example')} <span className="text-xs font-normal text-gray-500 block">{t('column_d')}</span></th>
                      </>
                    ) : destination === 'false_friends' ? (
                      <>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('german')} <span className="text-xs font-normal text-gray-500 block">{t('column_a')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('hungarian')} <span className="text-xs font-normal text-gray-500 block">{t('column_b')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('example')} <span className="text-xs font-normal text-gray-500 block">{t('column_c')}</span></th>
                        <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('note')} <span className="text-xs font-normal text-gray-500 block">{t('column_d')}</span></th>
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
                  {previewItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      {destination === 'articles' ? (
                        <>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={(item as any).article || ''} onChange={(e) => handleItemChange(idx, 'article', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm font-medium text-gray-900 resize-y" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={(item as any).noun || ''} onChange={(e) => handleItemChange(idx, 'noun', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm font-medium text-gray-900 resize-y" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleItemChange(idx, 'hungarian', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm text-gray-600 resize-y" /></td>
                          <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.example || ''} onChange={(e) => handleItemChange(idx, 'example', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm text-gray-500 italic resize-y" /></td>
                        </>
                      ) : destination === 'false_friends' ? (
                        <>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.german || ''} onChange={(e) => handleItemChange(idx, 'german', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm font-medium text-gray-900 resize-y" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleItemChange(idx, 'hungarian', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm text-gray-600 resize-y" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.example || ''} onChange={(e) => handleItemChange(idx, 'example', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm text-gray-500 italic resize-y" /></td>
                          <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={(item as any).note || ''} onChange={(e) => handleItemChange(idx, 'note', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm text-gray-500 resize-y" /></td>
                        </>
                      ) : (
                        <>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.german || ''} onChange={(e) => handleItemChange(idx, 'german', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm font-medium text-gray-900 resize-y" /></td>
                          <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleItemChange(idx, 'hungarian', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm text-gray-600 resize-y" /></td>
                          <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.example || ''} onChange={(e) => handleItemChange(idx, 'example', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm text-gray-500 italic resize-y" /></td>
                        </>
                      )}
                      <td className="p-1 sm:p-2 align-top text-center border-l border-gray-100">
                        <button onClick={() => handleDeletePreviewItem(idx)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors" title={t('delete') || "Delete"}>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
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
              <pre className="mt-4 text-xs bg-white p-2 rounded overflow-auto max-h-32 text-gray-700">
                {data.content}
              </pre>
            </div>
          )}
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between pt-4 border-t border-gray-200 gap-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full lg:w-auto">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <label className="text-sm font-medium text-gray-700 whitespace-nowrap">{t('save_to')}</label>
                <select
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
                >
                  <option value="vocabulary">{t('vocabulary_quiz')}</option>
                  <option value="articles">{t('articles_quiz')}</option>
                  <option value="phrases">{t('phrases_quiz')}</option>
                  <option value="false_friends">{t('false_friends')}</option>
                  <option value="prepositions">{t('prepositions_quiz')}</option>
                  <option value="reading">{t('save_to_reading')}</option>
                  <option value="listening">{t('save_to_listening')}</option>
                </select>
              </div>

            </div>
            <div className="w-full lg:w-auto flex flex-col sm:flex-row gap-3 justify-end">
              <button 
                onClick={() => setData(null)}
                disabled={saving}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50 w-full sm:w-auto"
              >
                {t('cancel')}
              </button>
              <button 
                onClick={handleSave}
                disabled={saving || previewItems.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm disabled:opacity-50 w-full sm:w-auto"
              >
                {saving ? t('saving') : t('save_import')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IMPORTED FILES MANAGER */}
      {importedFiles.length > 0 && (
        <div className="pt-8 mt-8 border-t border-gray-200 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
                  className="flex items-center justify-center gap-2 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 px-4 py-2 rounded-lg font-bold transition-colors shadow-sm disabled:opacity-50 w-full sm:w-auto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                  {t('download_selected')}
                </button>
                <button
                  onClick={handleBulkDeleteFiles}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm disabled:opacity-50 w-full sm:w-auto"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  {t('delete_selected')}
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-2 sm:p-4 w-10 sm:w-12 text-center"></th>
                  <th className="p-2 sm:p-4 font-semibold text-sm text-gray-600">{t('file_name')}</th>
                  <th className="p-2 sm:p-4 font-semibold text-sm text-gray-600">{t('format')}</th>
                  <th className="p-2 sm:p-4 font-semibold text-sm text-gray-600">{t('used_in')}</th>
                  <th className="p-2 sm:p-4 font-semibold text-sm text-gray-600">{t('items')}</th>
                  <th className="p-2 sm:p-4 font-semibold text-sm text-gray-600 text-right">{t('action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredImportedFiles.map((file) => (
                  <tr key={file.fileName} className="hover:bg-gray-50 transition-colors">
                    <td className="p-2 sm:p-4 text-center">
                      <input type="checkbox" checked={selectedFiles.has(file.fileName)} onChange={() => toggleFileSelection(file.fileName)} className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer" />
                    </td>
                    <td className="p-2 sm:p-4 font-medium text-gray-900 break-words">{file.fileName}</td>
                    <td className="p-2 sm:p-4 text-gray-600 uppercase text-sm font-semibold">{file.fileType}</td>
                    <td className="p-2 sm:p-4">
                      <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-blue-100 text-blue-800 uppercase tracking-wider">{file.destination}</span>
                    </td>
                    <td className="p-2 sm:p-4 text-gray-600 font-medium">{file.itemCount}</td>
                  <td className="p-2 sm:p-4 text-right">
                    <div className="flex items-center justify-end gap-1 sm:gap-2">
                      <button onClick={() => handleEditFile(file)} disabled={saving} className="flex items-center text-green-600 hover:text-green-800 p-1.5 sm:p-2 rounded hover:bg-green-50 transition-colors disabled:opacity-50 font-medium text-sm" title="Edit File">
                        <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        <span className="hidden sm:inline">Edit</span>
                      </button>
                      <button onClick={() => handleDownloadFiles([file.fileName])} disabled={saving} className="flex items-center text-blue-600 hover:text-blue-800 p-1.5 sm:p-2 rounded hover:bg-blue-50 transition-colors disabled:opacity-50 font-medium text-sm" title="Download File">
                        <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                        <span className="hidden sm:inline">{t('download')}</span>
                      </button>
                      <button onClick={() => handleDeleteFile(file.fileName, file.wordIds)} disabled={saving} className="flex items-center text-red-600 hover:text-red-800 p-1.5 sm:p-2 rounded hover:bg-red-50 transition-colors disabled:opacity-50 font-medium text-sm" title="Delete File">
                        <svg className="w-4 h-4 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-xl">
              <h2 className="text-xl font-bold text-gray-800">{t('preview_filename', { filename: editingFile || '' })} (Edit Mode)</h2>
              <button onClick={() => setEditingFile(null)} className="text-gray-500 hover:text-gray-700 p-2 text-xl font-bold">&times;</button>
            </div>

            <div className="flex-1 overflow-auto bg-white p-4">
              {editFileItems.length === 0 ? (
                <p className="text-gray-500 italic text-center py-4">No items left. Save to delete all.</p>
              ) : (
                <table className="w-full text-left border-collapse border border-gray-200 rounded min-w-[800px] lg:min-w-full">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 shadow-sm">
                    <tr>
                      {editingFileCategory === 'articles' ? (
                        <>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('article')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('noun')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('hungarian')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('example')}</th>
                        </>
                      ) : editingFileCategory === 'false_friends' ? (
                        <>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('german')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('hungarian')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('example')}</th>
                          <th className="p-2 sm:p-3 font-semibold text-gray-700 w-1/4">{t('note')}</th>
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
                    {editFileItems.map((item, idx) => (
                      <tr key={item.id || idx} className="hover:bg-gray-50 transition-colors">
                        {editingFileCategory === 'articles' ? (
                          <>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={(item as any).article || ''} onChange={(e) => handleEditItemChange(idx, 'article', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm font-medium text-gray-900 resize-y" /></td>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={(item as any).noun || ''} onChange={(e) => handleEditItemChange(idx, 'noun', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm font-medium text-gray-900 resize-y" /></td>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleEditItemChange(idx, 'hungarian', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm text-gray-600 resize-y" /></td>
                            <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.example || ''} onChange={(e) => handleEditItemChange(idx, 'example', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm text-gray-500 italic resize-y" /></td>
                          </>
                        ) : editingFileCategory === 'false_friends' ? (
                          <>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.german || ''} onChange={(e) => handleEditItemChange(idx, 'german', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm font-medium text-gray-900 resize-y" /></td>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleEditItemChange(idx, 'hungarian', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm text-gray-600 resize-y" /></td>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.example || ''} onChange={(e) => handleEditItemChange(idx, 'example', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm text-gray-500 italic resize-y" /></td>
                            <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={(item as any).note || ''} onChange={(e) => handleEditItemChange(idx, 'note', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm text-gray-500 resize-y" /></td>
                          </>
                        ) : (
                          <>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.german || ''} onChange={(e) => handleEditItemChange(idx, 'german', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm font-medium text-gray-900 resize-y" /></td>
                            <td className="p-1 sm:p-2 border-r border-gray-100 align-top"><textarea rows={2} value={item.hungarian || ''} onChange={(e) => handleEditItemChange(idx, 'hungarian', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm text-gray-600 resize-y" /></td>
                            <td className="p-1 sm:p-2 align-top"><textarea rows={2} value={item.example || ''} onChange={(e) => handleEditItemChange(idx, 'example', e.target.value)} className="w-full bg-transparent border-none focus:ring-0 p-1 text-sm text-gray-500 italic resize-y" /></td>
                          </>
                        )}
                        <td className="p-1 sm:p-2 align-top text-center border-l border-gray-100">
                          <button onClick={() => handleDeleteEditItem(idx)} className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50" title={t('delete') || "Delete"}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-xl">
              <button onClick={() => setEditingFile(null)} disabled={isSavingEdit} className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 px-6 rounded-lg transition-colors disabled:opacity-50">
                {t('cancel')}
              </button>
              <button onClick={handleSaveFileEdits} disabled={isSavingEdit} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2">
                {isSavingEdit ? t('saving') : t('modal_save_changes') || 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}