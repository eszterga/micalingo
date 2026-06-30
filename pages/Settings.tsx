import { useState } from "react";
import { db } from "../lib/db";

export default function Settings() {
  const [isClearing, setIsClearing] = useState(false);

  const handleExport = async () => {
    try {
      const words = await db.vocabulary.toArray();
      if (words.length === 0) {
        alert("Your database is empty. Nothing to export!");
        return;
      }
      
      // Create a downloadable JSON file
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(words, null, 2));
      const downloadNode = document.createElement('a');
      downloadNode.setAttribute("href", dataStr);
      downloadNode.setAttribute("download", `micalingo_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadNode);
      downloadNode.click();
      downloadNode.remove();
    } catch (error) {
      console.error("Export failed:", error);
      alert("Failed to export database.");
    }
  };

  const handleClearDatabase = async () => {
    if (confirm("⚠️ WARNING: Are you SURE you want to delete ALL your vocabulary? This cannot be undone!")) {
      setIsClearing(true);
      try {
        await db.vocabulary.clear();
        alert("Database completely cleared. You now have a fresh start!");
      } catch (error) {
        console.error("Clear failed:", error);
        alert("Failed to clear database.");
      } finally {
        setIsClearing(false);
      }
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-gray-600 mt-1">Configure your application preferences.</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 space-y-6">
        <div>
          <h3 className="text-lg font-bold text-gray-800 mb-2">Data Management</h3>
          <p className="text-sm text-gray-600 mb-4">Because MicaLingo is an offline-first app, your data lives completely in this browser. Use these tools to back up your words or reset the app.</p>
          
          <div className="flex flex-wrap gap-3">
            <button onClick={handleExport} className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-sm">Export Backup (JSON)</button>
            <button onClick={handleClearDatabase} disabled={isClearing} className="px-4 py-2 bg-white text-red-600 font-medium border border-red-200 rounded-lg hover:bg-red-50 transition-colors shadow-sm disabled:opacity-50">Erase All Data</button>
          </div>
        </div>
      </div>
    </div>
  );
}