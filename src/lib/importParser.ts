// src/lib/importParser.ts

import mammoth from "mammoth";
import * as XLSX from "xlsx";

export type ParsedImport = {
  fileName: string;
  fileType: "pdf" | "docx" | "xlsx" | "txt" | "unknown";
  content: string;
};

/**
 * MAIN ENTRY
 * Takes any uploaded file and converts it into raw text
 */
export async function importParser(file: File): Promise<ParsedImport> {
  const fileName = file.name.toLowerCase();
  const mime = file.type.toLowerCase();

  // --- PDF ---
  if (mime.includes("pdf") || fileName.endsWith(".pdf")) {
    return {
      fileName: file.name,
      fileType: "pdf",
      content: await parsePDF(file),
    };
  }

  // --- DOCX ---
  if (mime.includes("word") || fileName.endsWith(".docx")) {
    return {
      fileName: file.name,
      fileType: "docx",
      content: await parseDocx(file),
    };
  }

  // --- XLSX ---
  if (
    mime.includes("sheet") ||
    fileName.endsWith(".xlsx") ||
    fileName.endsWith(".xls")
  ) {
    return {
      fileName: file.name,
      fileType: "xlsx",
      content: await parseXlsx(file),
    };
  }

  // --- TXT fallback ---
  return {
    fileName: file.name,
    fileType: "txt",
    content: await file.text(),
  };
}

/**
 * -------------------------
 * PDF PARSER (pdf.js style placeholder)
 * Install: npm i pdfjs-dist
 * -------------------------
 */
async function parsePDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  // NOTE:
  // You will plug pdfjs-dist here.
  // Keeping it simple so your app compiles first.

  try {
    const pdfjsLib = await import("pdfjs-dist");

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(" ");

      fullText += pageText + "\n";
    }

    return fullText.trim();
  } catch (err) {
    console.error("PDF parse error:", err);
    return "PDF parsing failed.";
  }
}

/**
 * DOCX PARSER
 */
async function parseDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

/**
 * XLSX PARSER
 */
async function parseXlsx(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer);

  let output = "";

  workbook.SheetNames.forEach((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet);
    output += `\n--- ${sheetName} ---\n${csv}`;
  });

  return output.trim();
}