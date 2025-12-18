/**
 * Reference Parser Module
 * Parses academic references in common formats (APA, IEEE, MLA, Chicago, etc.)
 * Extracts structured data: title, authors (first/last names), year, publication, etc.
 */

export interface ParsedAuthor {
  firstName: string | null;
  lastName: string;
  fullName: string;
}

export interface ParsedReference {
  // Core fields
  rawText: string;
  title: string | null;
  authors: ParsedAuthor[];
  year: number | null;
  
  // Publication details
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  publisher: string | null;
  doi: string | null;
  url: string | null;
  
  // Format detection
  detectedFormat: 'APA' | 'IEEE' | 'MLA' | 'Chicago' | 'Vancouver' | 'Harvard' | 'Unknown';
  confidence: number; // 0-100
}

/**
 * Parse a single reference string into structured data
 */
export function parseReference(referenceText: string): ParsedReference {
  const cleaned = referenceText.trim();
  
  // Detect format first
  const format = detectReferenceFormat(cleaned);
  
  // Parse based on detected format
  let parsed: ParsedReference;
  
  switch (format.type) {
    case 'APA':
      parsed = parseAPAReference(cleaned);
      break;
    case 'IEEE':
      parsed = parseIEEEReference(cleaned);
      break;
    case 'MLA':
      parsed = parseMLAReference(cleaned);
      break;
    case 'Chicago':
      parsed = parseChicagoReference(cleaned);
      break;
    case 'Vancouver':
      parsed = parseVancouverReference(cleaned);
      break;
    case 'Harvard':
      parsed = parseHarvardReference(cleaned);
      break;
    default:
      parsed = parseGenericReference(cleaned);
  }
  
  parsed.detectedFormat = format.type;
  parsed.confidence = format.confidence;
  
  return parsed;
}

/**
 * Detect the citation format of a reference
 */
function detectReferenceFormat(text: string): { type: ParsedReference['detectedFormat'], confidence: number } {
  const patterns = [
    // IEEE: [1] Author, "Title," Journal, vol. X, no. Y, pp. Z, Year
    { 
      regex: /^\[\d+\]\s+[A-Z].*?,\s+".*?"/,
      type: 'IEEE' as const,
      weight: 90
    },
    
    // APA: Author, A. B. (Year). Title. Journal, Volume(Issue), pages.
    { 
      regex: /^[A-Z][a-z]+,\s+[A-Z]\.\s*(?:[A-Z]\.)?\s*\(\d{4}\)/,
      type: 'APA' as const,
      weight: 85
    },
    
    // MLA: Author. "Title." Journal vol. issue (year): pages.
    { 
      regex: /^[A-Z][a-z]+,\s+[A-Z][a-z]+.*?\.\s+".*?"\./,
      type: 'MLA' as const,
      weight: 80
    },
    
    // Chicago: Author. "Title." Journal volume, no. issue (year): pages.
    { 
      regex: /^[A-Z][a-z]+,\s+[A-Z][a-z]+\.\s+".*?"\.\s+.*?\s+\d+,\s+no\.\s+\d+/,
      type: 'Chicago' as const,
      weight: 80
    },
    
    // Vancouver: Author AB. Title. Journal. Year;Volume(Issue):Pages.
    { 
      regex: /^[A-Z][a-z]+\s+[A-Z]{2}\.\s+.*?\.\s+.*?\.\s+\d{4};/,
      type: 'Vancouver' as const,
      weight: 85
    },
    
    // Harvard: Author, A.B. (Year) 'Title', Journal, Volume(Issue), pp. pages.
    { 
      regex: /^[A-Z][a-z]+,\s+[A-Z]\.[A-Z]\.\s+\(\d{4}\)\s+'/,
      type: 'Harvard' as const,
      weight: 85
    },
  ];
  
  let bestMatch = { type: 'Unknown' as const, confidence: 50 };
  
  for (const pattern of patterns) {
    if (pattern.regex.test(text)) {
      if (pattern.weight > bestMatch.confidence) {
        bestMatch = { type: pattern.type, confidence: pattern.weight };
      }
    }
  }
  
  return bestMatch;
}

/**
 * Parse APA format reference
 * Format: Author, A. B., & Author, C. D. (Year). Title of work. Journal Name, Volume(Issue), pages. DOI
 */
function parseAPAReference(text: string): ParsedReference {
  const result: ParsedReference = {
    rawText: text,
    title: null,
    authors: [],
    year: null,
    journal: null,
    volume: null,
    issue: null,
    pages: null,
    publisher: null,
    doi: null,
    url: null,
    detectedFormat: 'APA',
    confidence: 0,
  };
  
  // Extract year (YYYY in parentheses)
  const yearMatch = text.match(/\((\d{4})\)/);
  if (yearMatch) {
    result.year = parseInt(yearMatch[1]);
  }
  
  // Extract authors (before year)
  const authorsText = text.split(/\(\d{4}\)/)[0];
  if (authorsText) {
    result.authors = parseAuthors(authorsText, 'APA');
  }
  
  // Extract title (after year, before journal - usually ends with period)
  const afterYear = text.split(/\(\d{4}\)\.?\s*/)[1];
  if (afterYear) {
    const titleMatch = afterYear.match(/^(.+?)\.\s+([A-Z]|$)/);
    if (titleMatch) {
      result.title = titleMatch[1].trim();
    }
  }
  
  // Extract journal, volume, issue
  const journalMatch = text.match(/\.\s+([A-Z][\w\s&:]+),\s*(\d+)\((\d+)\)/);
  if (journalMatch) {
    result.journal = journalMatch[1].trim();
    result.volume = journalMatch[2];
    result.issue = journalMatch[3];
  }
  
  // Extract pages
  const pagesMatch = text.match(/,\s*(\d+[-–]\d+)/);
  if (pagesMatch) {
    result.pages = pagesMatch[1];
  }
  
  // Extract DOI
  const doiMatch = text.match(/(?:https?:\/\/)?(?:doi\.org\/|DOI:?\s*)(10\.\d+\/[^\s]+)/i);
  if (doiMatch) {
    result.doi = doiMatch[1];
  }
  
  return result;
}

/**
 * Parse IEEE format reference
 * Format: [1] A. B. Author and C. D. Author, "Title," Journal, vol. X, no. Y, pp. Z-Z, Month Year.
 */
function parseIEEEReference(text: string): ParsedReference {
  const result: ParsedReference = {
    rawText: text,
    title: null,
    authors: [],
    year: null,
    journal: null,
    volume: null,
    issue: null,
    pages: null,
    publisher: null,
    doi: null,
    url: null,
    detectedFormat: 'IEEE',
    confidence: 0,
  };
  
  // Remove citation number [1]
  const cleanText = text.replace(/^\[\d+\]\s*/, '');
  
  // Extract title (in quotes)
  const titleMatch = cleanText.match(/"([^"]+)"/);
  if (titleMatch) {
    result.title = titleMatch[1];
  }
  
  // Extract authors (before title)
  const authorsText = cleanText.split('"')[0];
  if (authorsText) {
    result.authors = parseAuthors(authorsText, 'IEEE');
  }
  
  // Extract journal (after title, before vol.)
  const journalMatch = cleanText.match(/",\s*([^,]+),\s*vol\./);
  if (journalMatch) {
    result.journal = journalMatch[1].trim();
  }
  
  // Extract volume
  const volMatch = cleanText.match(/vol\.\s*(\d+)/);
  if (volMatch) {
    result.volume = volMatch[1];
  }
  
  // Extract issue
  const issueMatch = cleanText.match(/no\.\s*(\d+)/);
  if (issueMatch) {
    result.issue = issueMatch[1];
  }
  
  // Extract pages
  const pagesMatch = cleanText.match(/pp\.\s*(\d+[-–]\d+)/);
  if (pagesMatch) {
    result.pages = pagesMatch[1];
  }
  
  // Extract year
  const yearMatch = cleanText.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    result.year = parseInt(yearMatch[0]);
  }
  
  return result;
}

/**
 * Parse MLA format reference
 * Format: Author, First. "Title." Journal vol. issue (year): pages. Web.
 */
function parseMLAReference(text: string): ParsedReference {
  const result: ParsedReference = {
    rawText: text,
    title: null,
    authors: [],
    year: null,
    journal: null,
    volume: null,
    issue: null,
    pages: null,
    publisher: null,
    doi: null,
    url: null,
    detectedFormat: 'MLA',
    confidence: 0,
  };
  
  // Extract title (in quotes)
  const titleMatch = text.match(/"([^"]+)"/);
  if (titleMatch) {
    result.title = titleMatch[1];
  }
  
  // Extract authors (before title)
  const authorsText = text.split('"')[0];
  if (authorsText) {
    result.authors = parseAuthors(authorsText, 'MLA');
  }
  
  // Extract journal, volume, issue
  const journalMatch = text.match(/\.\s+([A-Z][\w\s&:]+?)\s+(\d+)\.(\d+)/);
  if (journalMatch) {
    result.journal = journalMatch[1].trim();
    result.volume = journalMatch[2];
    result.issue = journalMatch[3];
  }
  
  // Extract year
  const yearMatch = text.match(/\((\d{4})\)/);
  if (yearMatch) {
    result.year = parseInt(yearMatch[1]);
  }
  
  // Extract pages
  const pagesMatch = text.match(/:\s*(\d+[-–]\d+)/);
  if (pagesMatch) {
    result.pages = pagesMatch[1];
  }
  
  return result;
}

/**
 * Parse Chicago format reference
 */
function parseChicagoReference(text: string): ParsedReference {
  // Similar structure to MLA but with different punctuation
  return parseMLAReference(text); // Simplified for now
}

/**
 * Parse Vancouver format reference
 */
function parseVancouverReference(text: string): ParsedReference {
  // Similar to IEEE but with different author format
  return parseIEEEReference(text); // Simplified for now
}

/**
 * Parse Harvard format reference
 */
function parseHarvardReference(text: string): ParsedReference {
  // Similar to APA
  return parseAPAReference(text); // Simplified for now
}

/**
 * Parse generic/unknown format reference
 */
function parseGenericReference(text: string): ParsedReference {
  const result: ParsedReference = {
    rawText: text,
    title: null,
    authors: [],
    year: null,
    journal: null,
    volume: null,
    issue: null,
    pages: null,
    publisher: null,
    doi: null,
    url: null,
    detectedFormat: 'Unknown',
    confidence: 30,
  };
  
  // Try to extract year
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) {
    result.year = parseInt(yearMatch[0]);
  }
  
  // Try to extract title (usually in quotes or first capitalized phrase)
  const titleMatch = text.match(/"([^"]+)"|'([^']+)'|\.([A-Z][^.]+)\./);
  if (titleMatch) {
    result.title = (titleMatch[1] || titleMatch[2] || titleMatch[3] || '').trim();
  }
  
  // Try to extract authors (usually at the beginning)
  const firstPart = text.substring(0, Math.min(200, text.length));
  result.authors = parseAuthors(firstPart, 'Unknown');
  
  return result;
}

/**
 * Parse author names from text based on format
 */
function parseAuthors(text: string, format: string): ParsedAuthor[] {
  const authors: ParsedAuthor[] = [];
  
  // Clean up common separators
  text = text.replace(/\s+and\s+/gi, ', ').replace(/\s+&\s+/g, ', ');
  
  // Split by commas or semicolons
  const parts = text.split(/[,;]/).map(p => p.trim()).filter(p => p.length > 0);
  
  for (const part of parts) {
    const author = parseAuthorName(part, format);
    if (author) {
      authors.push(author);
    }
  }
  
  return authors;
}

/**
 * Parse a single author name
 */
function parseAuthorName(name: string, format: string): ParsedAuthor | null {
  name = name.trim();
  
  // Skip if it's not a name (too short, has numbers, etc.)
  if (name.length < 2 || /\d/.test(name) || /^(vol|no|pp|ed|eds)\./i.test(name)) {
    return null;
  }
  
  // Remove titles
  name = name.replace(/\b(Dr|Mr|Ms|Mrs|Prof|Professor)\.\s*/gi, '');
  
  let firstName: string | null = null;
  let lastName: string = '';
  
  // APA/IEEE: Last, F. M. or Last, First M.
  if (/^[A-Z][a-z]+,\s+[A-Z]/.test(name)) {
    const parts = name.split(',').map(p => p.trim());
    lastName = parts[0];
    
    if (parts[1]) {
      // Extract first name from initials or full name
      const firstPart = parts[1].replace(/\./g, ' ').trim();
      const initials = firstPart.match(/[A-Z][a-z]*/g);
      if (initials && initials.length > 0) {
        firstName = initials[0];
      }
    }
  }
  // MLA: Last, First Middle
  else if (/^[A-Z][a-z]+,\s+[A-Z][a-z]+/.test(name)) {
    const parts = name.split(',').map(p => p.trim());
    lastName = parts[0];
    if (parts[1]) {
      firstName = parts[1].split(/\s+/)[0];
    }
  }
  // IEEE: F. M. Last
  else if (/^[A-Z]\.\s*(?:[A-Z]\.\s*)?[A-Z][a-z]+/.test(name)) {
    const parts = name.split(/\s+/);
    lastName = parts[parts.length - 1];
    if (parts[0].length <= 3) { // Likely an initial
      firstName = parts[0].replace('.', '');
    }
  }
  // First Last format
  else {
    const parts = name.split(/\s+/);
    if (parts.length >= 2) {
      firstName = parts[0];
      lastName = parts[parts.length - 1];
    } else if (parts.length === 1) {
      lastName = parts[0];
    }
  }
  
  if (!lastName) {
    return null;
  }
  
  return {
    firstName,
    lastName,
    fullName: name,
  };
}

/**
 * Batch parse multiple references
 */
export function parseReferences(referenceTexts: string[]): ParsedReference[] {
  return referenceTexts.map(text => parseReference(text));
}

/**
 * Extract metadata summary from parsed references
 */
export function getReferenceSummary(parsed: ParsedReference[]): {
  totalReferences: number;
  formatsDetected: Record<string, number>;
  averageConfidence: number;
  referencesWithDOI: number;
  uniqueAuthors: number;
} {
  const formatsDetected: Record<string, number> = {};
  let totalConfidence = 0;
  let doiCount = 0;
  const uniqueAuthors = new Set<string>();
  
  for (const ref of parsed) {
    formatsDetected[ref.detectedFormat] = (formatsDetected[ref.detectedFormat] || 0) + 1;
    totalConfidence += ref.confidence;
    if (ref.doi) doiCount++;
    
    for (const author of ref.authors) {
      uniqueAuthors.add(author.lastName.toLowerCase());
    }
  }
  
  return {
    totalReferences: parsed.length,
    formatsDetected,
    averageConfidence: parsed.length > 0 ? totalConfidence / parsed.length : 0,
    referencesWithDOI: doiCount,
    uniqueAuthors: uniqueAuthors.size,
  };
}
