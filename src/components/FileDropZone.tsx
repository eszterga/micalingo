import React, { useRef, useState } from "react";
import { importParser, ParsedImport } from "../lib/importParser";

type Props = {
  onFileParsed: (data: ParsedImport) => void;
};

export default function FileDropZone({ onFileParsed }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = async (file: File) => {
    const result = await importParser(file);
    onFileParsed(result);
  };

  // click upload
  const handleClick = () => {
    inputRef.current?.click();
  };

  // file select
  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
  };

  // drag events
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) await handleFile(file);
  };

  return (
    <div
      className={`dropzone ${isDragging ? "dragging" : ""}`}
      onClick={handleClick}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        hidden
        onChange={handleChange}
      />

      <p>📂 Click or drop a file here</p>
      <p className="hint">PDF, Word, Excel, TXT</p>
    </div>
  );
}