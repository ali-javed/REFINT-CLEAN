import fs from 'fs';
import path from 'path';
import { PDFParse } from 'pdf-parse';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

// Configure PDF worker
const workerPath = path.join(
  process.cwd(),
  'node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs'
);
pdfjs.GlobalWorkerOptions.workerSrc = workerPath;

/**
 * Get list of available PDFs in the repo folder
 */
export function getAvailablePdfs(): string[] {
  const repoPath = path.join(process.cwd(), '..', 'repo');
  
  try {
    const files = fs.readdirSync(repoPath);
    return files.filter((f) => f.toLowerCase().endsWith('.pdf'));
  } catch (err) {
    console.error('Error reading repo folder:', err);
    return [];
  }
}

/**
 * Extract abstract/summary from a PDF file in the repo
 */
export async function extractPdfSummary(fileName: string): Promise<string | null> {
  try {
    const repoPath = path.join(process.cwd(), '..', 'repo');
    const filePath = path.join(repoPath, fileName);
    
    // Security check: ensure file is within repo folder
    if (!path.resolve(filePath).startsWith(path.resolve(repoPath))) {
      return null;
    }

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return null;
    }

    // Extract PDF text
    const buffer = fs.readFileSync(filePath);
    const pdfParser = new PDFParse({ data: buffer });
    const textData = await pdfParser.getText();
    const rawText = textData.text || '';

    if (!rawText.trim()) {
      return null;
    }

    // Extract abstract - look for "Abstract" section
    const text = rawText.replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, ' ');
    const lower = text.toLowerCase();
    
    const abstractIndex = lower.indexOf('abstract');
    if (abstractIndex === -1) {
      // If no abstract, return first 500 characters
      return text.substring(0, 500).trim();
    }

    // Extract text after "Abstract" heading (usually 200-400 words)
    let abstractStart = abstractIndex + 'abstract'.length;
    
    // Skip the heading and find the actual abstract content
    const headingEnd = text.indexOf('\n', abstractStart);
    if (headingEnd !== -1) {
      abstractStart = headingEnd + 1;
    }

    // Find the end of abstract (usually marked by "Introduction" or "1." or similar)
    const introIndex = lower.indexOf('introduction', abstractStart);
    const methodsIndex = lower.indexOf('methods', abstractStart);
    const keywordsIndex = lower.indexOf('keywords', abstractStart);
    
    let abstractEnd = text.length;
    
    if (introIndex !== -1) {
      abstractEnd = Math.min(abstractEnd, introIndex);
    }
    if (methodsIndex !== -1) {
      abstractEnd = Math.min(abstractEnd, methodsIndex);
    }
    if (keywordsIndex !== -1) {
      abstractEnd = Math.min(abstractEnd, keywordsIndex);
    }

    const abstractText = text
      .substring(abstractStart, abstractEnd)
      .trim()
      .replace(/\s+/g, ' ')
      .substring(0, 800); // Limit to 800 characters

    return abstractText || null;
  } catch (err) {
    console.error('Error extracting PDF summary:', err);
    return null;
  }
}

/**
 * Find matching PDF in repo for a reference
 * Only matches the exact Mad River Watershed paper
 */
export function findMatchingPdf(reference: string): string | null {
  const pdfs = getAvailablePdfs();
  
  if (pdfs.length === 0) return null;

  const refLower = reference.toLowerCase();
  
  // Look for the specific Mad River Watershed paper
  const keywords = [
    'hydrological',
    'suspended sediment',
    'mad river',
    'watershed',
    'time series clustering',
  ];

  // Check if reference contains most of these keywords
  let matchCount = 0;
  for (const keyword of keywords) {
    if (refLower.includes(keyword)) {
      matchCount++;
    }
  }

  // Must match at least 3 keywords to be considered the same paper
  if (matchCount >= 3) {
    // Find the PDF file that matches
    for (const pdf of pdfs) {
      const pdfLower = pdf.toLowerCase();
      if (pdfLower.includes('mad river') || pdfLower.includes('hydrological')) {
        return pdf;
      }
    }
  }
  
  return null;
}
