import React, { useState, useRef, useEffect } from 'react';
import { ImageLightbox, useImageLightbox } from './ImageLightbox';

export interface MaterialData {
  id?: string;
  type: 'reading' | 'listening';
  title: string;
  author?: string; // Used for reading
  artist?: string; // Used for listening
  mediaLink?: string; // Used for listening
  content: string; // The rich text content/lyrics
  categoryId?: string; // Used for categorization
  collectionName?: string; // Used for DB target
}

export interface CategoryOption {
  id: string;
  title: string;
  collectionName: string;
}

interface CMSEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: MaterialData) => void;
  initialData?: Partial<MaterialData>;
  type: 'reading' | 'listening';
  categories?: CategoryOption[];
}

export default function CMSEditorModal({ isOpen, onClose, onSave, initialData, type, categories }: CMSEditorModalProps) {
  const [title, setTitle] = useState(initialData?.title || '');
  const [author, setAuthor] = useState(initialData?.author || initialData?.artist || '');
  const [mediaLink, setMediaLink] = useState(initialData?.mediaLink || '');
  const [content, setContent] = useState(initialData?.content || '');
  const [categoryId, setCategoryId] = useState(initialData?.categoryId || categories?.[0]?.id || '');
  const editorRef = useRef<HTMLDivElement>(null);
  const { image: lightboxImage, handleImageClick, closeLightbox } = useImageLightbox();

  // Set initial content in the contentEditable div when modal opens
  useEffect(() => {
    if (isOpen && editorRef.current && content !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = content;
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Extract embed URLs for live preview
  const getEmbedUrl = (url: string) => {
    if (!url) return null;
    
    // YouTube matching
    const ytMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }
    
    // Spotify matching
    const spotifyMatch = url.match(/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/i);
    if (spotifyMatch && spotifyMatch[1] && spotifyMatch[2]) {
      return `https://open.spotify.com/embed/${spotifyMatch[1]}/${spotifyMatch[2]}`;
    }
    
    return null;
  };

  const embedUrl = type === 'listening' ? getEmbedUrl(mediaLink) : null;

  // Store selection state
  const savedSelection = useRef<Range | null>(null);
  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      savedSelection.current = sel.getRangeAt(0);
    }
  };

  // Rich Text Formatting execution
  const executeCommand = (e: React.MouseEvent, command: string, value: string | undefined = undefined) => {
    e.preventDefault();
    if (savedSelection.current && (command === 'hiliteColor' || command === 'foreColor')) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedSelection.current);
    }
    document.execCommand(command, false, value);
    setContent(editorRef.current?.innerHTML || '');
    editorRef.current?.focus();
  };

  // Handle pasted text to format it cleanly
  const handlePaste = (e: React.ClipboardEvent) => {
    const html = e.clipboardData.getData("text/html");
    const plain = e.clipboardData.getData("text/plain");
    
    if (!html && plain) {
      e.preventDefault();
      const formatted = plain
        .split(/\r?\n\r?\n/)
        .filter(line => line.trim() !== "")
        .map(line => `<p>${line.replace(/\r?\n/g, "<br/>")}</p>`)
        .join("");
      document.execCommand("insertHTML", false, formatted);
    }
  };

  const handleSave = () => {
    const selectedCategory = categories?.find(c => c.id === categoryId);
    onSave({
      id: initialData?.id,
      type,
      title,
      author: type === 'reading' ? author : undefined,
      artist: type === 'listening' ? author : undefined,
      mediaLink: type === 'listening' ? mediaLink : undefined,
      content: editorRef.current?.innerHTML || '',
      categoryId: categoryId || undefined,
      collectionName: selectedCategory?.collectionName || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <h2 className="text-xl font-bold text-gray-800">
            {initialData?.id ? 'Edit' : 'Add'} {type === 'reading' ? 'Reading Material' : 'Listening Material'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          
          {/* Listening specific: Media Link */}
          {type === 'listening' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">YouTube or Spotify Link</label>
                <input 
                  type="text" 
                  value={mediaLink}
                  onChange={(e) => setMediaLink(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-2">Paste a valid link to automatically fetch the preview.</p>
              </div>
              <div className="bg-gray-100 rounded-xl flex items-center justify-center h-32 overflow-hidden border border-gray-200">
                {embedUrl ? (
                  <iframe 
                    src={embedUrl} 
                    className="w-full h-full" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen 
                  />
                ) : (
                  <span className="text-sm text-gray-400">Media Preview</span>
                )}
              </div>
            </div>
          )}

          {type === 'reading' && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Source URL (Optional)</label>
              <input 
                type="text" 
                value={mediaLink}
                onChange={(e) => setMediaLink(e.target.value)}
                placeholder="https://www.example.com/article"
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
              />
              <p className="text-xs text-gray-500 mt-2">Link to the original article or source.</p>
            </div>
          )}

          {/* Category Selector (if categories provided) */}
          {categories && categories.length > 0 && (
            <div className="grid grid-cols-1 mb-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>
                <select 
                  value={categoryId} 
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all bg-white"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.title}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Common Fields: Title & Author/Artist */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="Enter title..."
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                {type === 'reading' ? 'Author' : 'Artist'}
              </label>
              <input 
                type="text" 
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder={`Enter ${type === 'reading' ? 'author' : 'artist'}...`}
              />
            </div>
          </div>

          {/* Rich Text Editor */}
          <div className="flex flex-col flex-1 min-h-[300px]">
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {type === 'reading' ? 'Content / Text' : 'Lyrics / Transcript'}
            </label>
            
            <div className="border border-gray-300 rounded-xl overflow-hidden flex flex-col flex-1 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
              {/* Toolbar */}
              <div className="bg-gray-50 border-b border-gray-300 p-2 flex flex-wrap gap-2 items-center">
                <button onClick={(e) => executeCommand(e, 'bold')} className="w-8 h-8 flex items-center justify-center font-bold bg-white border border-gray-200 rounded hover:bg-gray-100" title="Bold">B</button>
                <button onClick={(e) => executeCommand(e, 'italic')} className="w-8 h-8 flex items-center justify-center italic bg-white border border-gray-200 rounded hover:bg-gray-100" title="Italic">I</button>
                <button onClick={(e) => executeCommand(e, 'underline')} className="w-8 h-8 flex items-center justify-center underline bg-white border border-gray-200 rounded hover:bg-gray-100" title="Underline">U</button>
                
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                
                {/* Highlight Colors */}
                <button onClick={(e) => executeCommand(e, 'hiliteColor', '#fef08a')} className="w-8 h-8 flex items-center justify-center bg-yellow-200 border border-gray-200 rounded hover:bg-yellow-300" title="Highlight Yellow">H</button>
                <button onClick={(e) => executeCommand(e, 'hiliteColor', '#bbf7d0')} className="w-8 h-8 flex items-center justify-center bg-green-200 border border-gray-200 rounded hover:bg-green-300" title="Highlight Green">H</button>
                <button onClick={(e) => executeCommand(e, 'hiliteColor', 'transparent')} className="px-2 h-8 text-xs font-medium bg-white border border-gray-200 rounded hover:bg-gray-100 flex items-center" title="Remove Highlight">
                  <svg className="w-4 h-4 text-red-500 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                  Clear
                </button>
                
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                
                <button onClick={(e) => executeCommand(e, 'formatBlock', 'H2')} className="px-2 h-8 font-bold text-sm bg-white border border-gray-200 rounded hover:bg-gray-100 flex items-center" title="Heading 2">H2</button>
                <button onClick={(e) => executeCommand(e, 'formatBlock', 'H3')} className="px-2 h-8 font-bold text-sm bg-white border border-gray-200 rounded hover:bg-gray-100 flex items-center" title="Heading 3">H3</button>
                <button onClick={(e) => executeCommand(e, 'formatBlock', 'P')} className="px-2 h-8 font-medium text-sm bg-white border border-gray-200 rounded hover:bg-gray-100 flex items-center" title="Paragraph">P</button>
                
                <div className="w-px h-6 bg-gray-300 mx-1"></div>
                
                <button onClick={(e) => executeCommand(e, 'justifyLeft')} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded hover:bg-gray-100" title="Align Left">⬅️</button>
                <button onClick={(e) => executeCommand(e, 'justifyCenter')} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded hover:bg-gray-100" title="Align Center">↔️</button>
                <button onClick={(e) => executeCommand(e, 'justifyRight')} className="w-8 h-8 flex items-center justify-center bg-white border border-gray-200 rounded hover:bg-gray-100" title="Align Right">➡️</button>
              </div>

              {/* Editable Area */}
              <div 
                ref={editorRef}
                className="p-4 flex-1 outline-none min-h-[250px] max-h-[400px] overflow-y-auto prose prose-blue max-w-none bg-white"
                contentEditable
                onInput={(e) => setContent(e.currentTarget.innerHTML)}
                onPaste={handlePaste}
                onMouseUp={saveSelection}
                onKeyUp={saveSelection}
                onClick={(e) => { saveSelection(); handleImageClick(e); }}
              />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 bg-gray-50 rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 font-semibold text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-6 py-2.5 font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
            Save Content
          </button>
        </div>

      </div>

      <ImageLightbox image={lightboxImage} onClose={closeLightbox} />
    </div>
  );
}