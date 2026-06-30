import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import FileDropZone from "../components/FileDropZone";
import { ParsedImport } from "../lib/importParser";
import { db } from "../lib/db";

export default function Import() {
  const [data, setData] = useState<ParsedImport | null>(null);
  const [saving, setSaving] = useState(false);
  const [destination, setDestination] = useState("vocabulary");
  const navigate = useNavigate();

  // Automatically parse the data for the preview table
  const parsedPreview = useMemo(() => {
    if (!data || !data.content) return [];

    const lines = data.content.split('\n');
    const items = [];

    for (const line of lines) {
      const cleanLine = line.trim();
      if (!cleanLine) continue;

      // Detect columns: Tab (Excel paste), Semicolon (CSV), or Comma (CSV)
      let parts = cleanLine.split('\t');
      if (parts.length < 2) parts = cleanLine.split(';');
      if (parts.length < 2) parts = cleanLine.split(',');

      if (parts.length >= 2) {
        // Helper to remove surrounding quotes that Excel/CSV sometimes adds
        const stripQuotes = (str: string) => str.trim().replace(/^"|"$/g, '').trim();

        items.push({
          german: stripQuotes(parts[0]),
          hungarian: stripQuotes(parts[1]),
          example: parts[2] ? stripQuotes(parts[2]) : "",
        });
      }
    }
    return items;
  }, [data]);

  const handleSave = async () => {
    if (parsedPreview.length === 0) {
      alert("No valid vocabulary items to save.");
      return;
    }
    
    setSaving(true);
    try {
      // Fetch existing items to check for duplicates
      const existingItems = await db.vocabulary.toArray();
      const existingSet = new Set(
        existingItems.map(item => `${item.german.toLowerCase().trim()}|${item.hungarian.toLowerCase().trim()}`)
      );

      const itemsToSave = [];
      let duplicateCount = 0;

      for (const item of parsedPreview) {
        const key = `${item.german.toLowerCase().trim()}|${item.hungarian.toLowerCase().trim()}`;
        if (!existingSet.has(key)) {
          existingSet.add(key); // Prevent duplicates within the new batch itself
          itemsToSave.push({
            ...item,
            dateAdded: Date.now(),
            category: destination
          });
        } else {
          duplicateCount++;
        }
      }

      if (itemsToSave.length > 0) {
        await db.vocabulary.bulkAdd(itemsToSave);
      }
      setData(null); // Clear preview after saving
      
      if (duplicateCount > 0) {
        alert(`Imported ${itemsToSave.length} new items. Skipped ${duplicateCount} duplicates.`);
      }

      // Redirect to the chosen destination
      if (destination === "vocabulary") {
        navigate("/vocabulary"); 
      } else {
        navigate("/quiz"); // Fallback for quizzes and games
      }
    } catch (error) {
      console.error("Failed to save vocabulary:", error);
      alert("An error occurred while saving to the database.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Import Files</h1>

      {/* DROP ZONE CENTER AREA */}
      <div className="flex justify-center">
        <FileDropZone onFileParsed={setData} />
      </div>

      {/* OUTPUT */}
      {data && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-700">Preview: {data.fileName}</h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded">
              {parsedPreview.length} items detected
            </span>
          </div>
          
          {parsedPreview.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded shadow-sm max-h-[400px] overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                  <tr>
                    <th className="p-3 font-semibold text-gray-700">German</th>
                    <th className="p-3 font-semibold text-gray-700">Hungarian</th>
                    <th className="p-3 font-semibold text-gray-700">Example</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {parsedPreview.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                      <td className="p-3 font-medium text-gray-900">{item.german}</td>
                      <td className="p-3 text-gray-600">{item.hungarian}</td>
                      <td className="p-3 text-gray-500 text-sm italic">{item.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="bg-red-50 p-4 rounded border border-red-200 text-red-600">
              <p className="font-semibold">Could not detect valid columns.</p>
              <p className="text-sm mt-1">Make sure the file uses Tabs (Excel), Semicolons, or Commas to separate the words.</p>
              <pre className="mt-4 text-xs bg-white p-2 rounded overflow-auto max-h-32 text-gray-700">
                {data.content}
              </pre>
            </div>
          )}
          
          <div className="flex flex-col sm:flex-row items-center justify-between pt-4 border-t border-gray-200 gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Save to:</label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
              >
                <option value="vocabulary">Vocabulary List</option>
                <option value="quiz">Practice Quiz</option>
                <option value="fill-the-gap">Fill-the-gap Quiz</option>
                <option value="games">Games</option>
              </select>
            </div>
            <div className="w-full sm:w-auto flex justify-end">
              <button 
                onClick={handleSave}
                disabled={saving || parsedPreview.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 px-6 rounded-lg shadow-sm disabled:opacity-50 w-full sm:w-auto"
              >
                {saving ? "Saving..." : "Save Import"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}