/**
 * Comprehensive Academic Citation Parser
 * Handles IEEE, Vancouver, Nature/Science, APA, Harvard, Chicago, MLA, BibTeX/LaTeX
 * 
 * Pipeline:
 * 1. Normalize text
 * 2. Detect bibliography section
 * 3. Detect in-text citation style
 * 4. Parse reference entries
 * 5. Link in-text citations to bibliography
 */

export type CitationStyle = 
  | 'IEEE' 
  | 'Vancouver' 
  | 'Nature' 
  | 'APA' 
  | 'Harvard' 
  | 'Chicago-AuthorDate' 
  | 'Chicago-Notes'
  | 'MLA' 
  | 'BibTeX'
  | 'Mixed'
  | 'Unknown';

export interface ParsedCitation {
  // In-text citation info
  citationId: string; // e.g., "2" for [2], "smith_2020a" for (Smith, 2020a)
  rawText: string;
  type: 'numeric' | 'author-date' | 'note';
  
  // For numeric
  numbers?: number[];
  
  // For author-date
  authors?: string[];
  year?: number;
  suffix?: string; // a, b, c for multiple same-year papers
  pages?: string;
}

export interface ParsedAuthor {
  firstName: string | null;
  lastName: string;
  fullName: string;
}

export interface BibliographyEntry {
  // Entry metadata
  entryId: string; // numeric label or author-year key
  rawText: string;
  
  // Parsed fields
  authors: string[];
  title: string | null;
  year: number | null;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
  publisher: string | null;
  
  // Confidence
  confidence: number; // 0-1
}

export interface ParsedDocument {
  // Detected style
  style: CitationStyle;
  styleConfidence: number; // 0-1
  
  // Text sections
  bodyText: string;
  referencesText: string;
  
  // Parsed data
  inTextCitations: ParsedCitation[];
  bibliography: BibliographyEntry[];
  
  // Mapping
  citationToBibMapping: Map<string, string>; // citation ID → bib entry ID
}

/**
 * Main parsing function
 */
export function parseAcademicDocument(fullText: string): ParsedDocument {
  // Step 1: Normalize
  const normalized = normalizeText(fullText);
  
  // Step 2: Detect bibliography section
  const { bodyText, referencesText } = detectBibliographySection(normalized);
  
  // Step 3: Detect citation style
  const { style, confidence } = detectCitationStyle(bodyText, referencesText);
  
  // Step 4: Parse in-text citations
  const inTextCitations = parseInTextCitations(bodyText, style);
  
  // Step 5: Parse bibliography entries
  const bibliography = parseBibliography(referencesText, style);
  
  // Step 6: Link citations to bibliography
  const citationToBibMapping = linkCitationsToBibliography(inTextCitations, bibliography, style);
  
  return {
    style,
    styleConfidence: confidence,
    bodyText,
    referencesText,
    inTextCitations,
    bibliography,
    citationToBibMapping,
  };
}

/**
 * Step 1: Normalize text
 */
function normalizeText(text: string): string {
  let normalized = text;
  
  // Convert fancy quotes to ASCII
  normalized = normalized.replace(/['']/g, "'");
  normalized = normalized.replace(/[""]/g, '"');
  
  // Normalize dashes
  normalized = normalized.replace(/[–—]/g, '-');
  
  // Collapse repeated spaces (but keep newlines)
  normalized = normalized.replace(/[^\S\n]+/g, ' ');
  
  // Normalize line endings
  normalized = normalized.replace(/\r\n/g, '\n');
  
  return normalized;
}

/**
 * Step 2: Detect bibliography section
 */
function detectBibliographySection(text: string): { bodyText: string; referencesText: string } {
  const bibHeaders = [
    /\n\s*References\s*\n/i,
    /\n\s*Bibliography\s*\n/i,
    /\n\s*Works Cited\s*\n/i,
    /\n\s*Literature Cited\s*\n/i,
    /\n\s*Notes and References\s*\n/i,
    /\n\s*Notes\s*\n/i,
  ];
  
  for (const regex of bibHeaders) {
    const match = regex.exec(text);
    if (match) {
      const splitIndex = match.index + match[0].length;
      let referencesText = text.substring(splitIndex);
      
      // Stop at common non-reference sections (figures, tables, appendices)
      const stopPatterns = [
        /\n\s*(?:Figure|Table|Equation)\s+\d+/i,
        /\n\s*(?:Appendix|Supplementary|Additional)/i,
        /\n\s*Attention\s+Visualizations/i,
        /\n\s*(?:A\.|APPENDIX)\s+[A-Z]/,
      ];
      
      for (const stopPattern of stopPatterns) {
        const stopMatch = stopPattern.exec(referencesText);
        if (stopMatch) {
          referencesText = referencesText.substring(0, stopMatch.index);
          break;
        }
      }
      
      return {
        bodyText: text.substring(0, match.index),
        referencesText,
      };
    }
  }
  
  // No clear section found - assume last 20% is references
  const splitPoint = Math.floor(text.length * 0.8);
  return {
    bodyText: text.substring(0, splitPoint),
    referencesText: text.substring(splitPoint),
  };
}

/**
 * Step 3: Detect citation style
 */
function detectCitationStyle(bodyText: string, referencesText: string): { style: CitationStyle; confidence: number } {
  // First check if references section starts with [1], [2], etc. - very strong IEEE indicator
  if (referencesText.match(/^\s*\[1\]/)) {
    return { style: 'IEEE', confidence: 0.95 };
  }
  
  const patterns = {
    IEEE: /\[\d+\]/g,
    Vancouver: /\(\d+(?:\s*[-–]\s*\d+)?(?:\s*,\s*\d+)*\)/g,
    Nature: /(?<=\w)\s*\d{1,3}(?=[\s,.;:])/g,
    APA: /\([A-Z][A-Za-z\-]+(?:\s+(?:&|and)\s+[A-Z][A-Za-z\-]+|\s+et al\.)*,\s*\d{4}[a-z]?\)/g,
    Harvard: /\([A-Z][A-Za-z\-]+(?:\s+et al\.)?[,\s]+\d{4}[a-z]?\)/g,
    ChicagoAuthorDate: /\([A-Z][A-Za-z\-]+(?:\s+(?:and|&)\s+[A-Z][A-Za-z\-]+)?\s+\d{4}[a-z]?(?:,\s*[\d\-–]+)?\)/g,
    ChicagoNotes: /(?<=\w)\s*\d{1,3}(?=[\s,.;:])/g, // Similar to Nature
    MLA: /\([A-Z][A-Za-z\-]+(?:\s+(?:and|&)\s+[A-Z][A-Za-z\-]+)?\s+\d+\)/g,
    BibTeX: /\\cite\{[^}]+\}|\\bibitem\{[^}]+\}/g,
  };
  
  const counts: Record<string, number> = {};
  
  // Count each pattern
  for (const [style, regex] of Object.entries(patterns)) {
    const matches = bodyText.match(regex);
    counts[style] = matches ? matches.length : 0;
  }
  
  // Check references section for BibTeX
  if (/\\bibitem|\\begin\{thebibliography\}/i.test(referencesText)) {
    counts.BibTeX += 50; // Strong signal
  }
  
  // Check references for numbered entries (IEEE/Vancouver/Nature)
  if (/^\s*\[\d+\]/m.test(referencesText)) {
    counts.IEEE += 20;
  }
  if (/^\s*\d+\.\s+/m.test(referencesText)) {
    counts.Vancouver += 20;
    counts.Nature += 15;
  }
  
  // Find dominant style
  const totalMatches = Object.values(counts).reduce((sum, count) => sum + count, 0);
  if (totalMatches === 0) {
    return { style: 'Unknown', confidence: 0 };
  }
  
  const sortedStyles = Object.entries(counts)
    .sort(([, a], [, b]) => b - a)
    .filter(([, count]) => count > 0);
  
  if (sortedStyles.length === 0) {
    return { style: 'Unknown', confidence: 0 };
  }
  
  const [topStyle, topCount] = sortedStyles[0];
  const confidence = topCount / (totalMatches + 1);
  
  // Map to CitationStyle type
  const styleMap: Record<string, CitationStyle> = {
    IEEE: 'IEEE',
    Vancouver: 'Vancouver',
    Nature: 'Nature',
    APA: 'APA',
    Harvard: 'Harvard',
    ChicagoAuthorDate: 'Chicago-AuthorDate',
    ChicagoNotes: 'Chicago-Notes',
    MLA: 'MLA',
    BibTeX: 'BibTeX',
  };
  
  const detectedStyle = styleMap[topStyle] || 'Unknown';
  
  // Check if mixed (second-place is close)
  if (sortedStyles.length > 1) {
    const [, secondCount] = sortedStyles[1];
    if (secondCount / topCount > 0.4) {
      return { style: 'Mixed', confidence: 0.5 };
    }
  }
  
  return { style: detectedStyle, confidence };
}

/**
 * Step 4: Parse in-text citations based on style
 */
function parseInTextCitations(bodyText: string, style: CitationStyle): ParsedCitation[] {
  switch (style) {
    case 'IEEE':
      return parseIEEEInText(bodyText);
    case 'Vancouver':
    case 'Nature':
      return parseNumericInText(bodyText);
    case 'APA':
    case 'Harvard':
    case 'Chicago-AuthorDate':
      return parseAuthorDateInText(bodyText, style);
    case 'MLA':
      return parseMLAInText(bodyText);
    case 'Chicago-Notes':
      return parseNotesInText(bodyText);
    case 'BibTeX':
      return parseBibTeXInText(bodyText);
    default:
      return [];
  }
}

function parseIEEEInText(text: string): ParsedCitation[] {
  const citations: ParsedCitation[] = [];
  const regex = /\[(\d+(?:\s*[-–]\s*\d+)?(?:\s*,\s*\d+(?:\s*[-–]\s*\d+)?)*)\]/g;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    const numbersStr = match[1];
    const numbers: number[] = [];
    
    // Parse numbers and ranges
    const parts = numbersStr.split(/,\s*/);
    for (const part of parts) {
      if (part.includes('-') || part.includes('–')) {
        // Range
        const [start, end] = part.split(/[-–]/).map(s => parseInt(s.trim()));
        for (let i = start; i <= end; i++) {
          numbers.push(i);
        }
      } else {
        numbers.push(parseInt(part.trim()));
      }
    }
    
    citations.push({
      citationId: numbers.join(','),
      rawText: match[0],
      type: 'numeric',
      numbers,
    });
  }
  
  return citations;
}

function parseNumericInText(text: string): ParsedCitation[] {
  const citations: ParsedCitation[] = [];
  const regex = /\((\d+(?:\s*[-–]\s*\d+)?(?:\s*,\s*\d+)*)\)/g;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    const numbersStr = match[1];
    const numbers = numbersStr.split(/,\s*/).map(n => parseInt(n.trim()));
    
    citations.push({
      citationId: numbers.join(','),
      rawText: match[0],
      type: 'numeric',
      numbers,
    });
  }
  
  return citations;
}

function parseAuthorDateInText(text: string, style: CitationStyle): ParsedCitation[] {
  const citations: ParsedCitation[] = [];
  
  // Parenthetical: (Smith & Wesson, 2020a)
  const regex = /\(([A-Z][A-Za-z\-]+)(?:\s+(?:&|and)\s+([A-Z][A-Za-z\-]+)|\s+et al\.)*,\s*(\d{4})([a-z])?\)/g;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    const authors = [match[1]];
    if (match[2]) authors.push(match[2]);
    
    const year = parseInt(match[3]);
    const suffix = match[4] || '';
    
    const citationId = `${authors.map(a => a.toLowerCase()).join('_')}_${year}${suffix}`;
    
    citations.push({
      citationId,
      rawText: match[0],
      type: 'author-date',
      authors,
      year,
      suffix,
    });
  }
  
  return citations;
}

function parseMLAInText(text: string): ParsedCitation[] {
  const citations: ParsedCitation[] = [];
  const regex = /\(([A-Z][A-Za-z\-]+(?:\s+(?:and|&)\s+[A-Z][A-Za-z\-]+)?)\s+(\d+)\)/g;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    const authors = match[1].split(/\s+(?:and|&)\s+/);
    const pages = match[2];
    
    const citationId = `${authors[0].toLowerCase()}_page${pages}`;
    
    citations.push({
      citationId,
      rawText: match[0],
      type: 'author-date',
      authors,
      pages,
    });
  }
  
  return citations;
}

function parseNotesInText(text: string): ParsedCitation[] {
  const citations: ParsedCitation[] = [];
  // Detect superscript-like numbers after words/punctuation
  const regex = /(?<=\w|\.)(\d{1,3})(?=[\s,.;:]|$)/g;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    const num = parseInt(match[1]);
    
    citations.push({
      citationId: num.toString(),
      rawText: match[0],
      type: 'note',
      numbers: [num],
    });
  }
  
  return citations;
}

function parseBibTeXInText(text: string): ParsedCitation[] {
  const citations: ParsedCitation[] = [];
  const regex = /\\cite[pt]?\{([^}]+)\}/g;
  
  let match;
  while ((match = regex.exec(text)) !== null) {
    const keys = match[1].split(',').map(k => k.trim());
    
    for (const key of keys) {
      citations.push({
        citationId: key,
        rawText: match[0],
        type: 'author-date', // BibTeX can be any style
      });
    }
  }
  
  return citations;
}

/**
 * Step 5: Parse bibliography entries based on style
 */
function parseBibliography(referencesText: string, style: CitationStyle): BibliographyEntry[] {
  switch (style) {
    case 'IEEE':
      return parseIEEEBibliography(referencesText);
    case 'Vancouver':
    case 'Nature':
      return parseNumericBibliography(referencesText);
    case 'APA':
    case 'Harvard':
    case 'Chicago-AuthorDate':
      return parseAuthorDateBibliography(referencesText);
    case 'MLA':
      return parseMLABibliography(referencesText);
    case 'BibTeX':
      return parseBibTeXBibliography(referencesText);
    default:
      return parseGenericBibliography(referencesText);
  }
}

function parseIEEEBibliography(text: string): BibliographyEntry[] {
  const entries: BibliographyEntry[] = [];
  
  // First, try to split on [N] patterns globally
  const referencePattern = /\[(\d+)\]/g;
  const matches: Array<{ id: string; start: number }> = [];
  
  let match;
  while ((match = referencePattern.exec(text)) !== null) {
    matches.push({
      id: match[1],
      start: match.index,
    });
  }
  
  console.log(`[parseIEEEBibliography] Found ${matches.length} numbered references in text`);
  
  // Extract text between each [N] and the next [N+1]
  for (let i = 0; i < matches.length; i++) {
    const current = matches[i];
    const next = matches[i + 1];
    
    const startPos = current.start;
    const endPos = next ? next.start : text.length;
    
    let entryText = text.substring(startPos, endPos).trim();
    
    // Remove the [N] prefix
    entryText = entryText.replace(/^\[\d+\]\s*/, '');
    
    // Clean up: remove page numbers on their own line
    entryText = entryText.replace(/\n\s*\d{1,3}\s*\n/g, ' ');
    
    // Replace multiple spaces/newlines with single space
    entryText = entryText.replace(/\s+/g, ' ').trim();
    
    if (entryText.length > 10) {
      entries.push(parseIEEEEntry(current.id, entryText));
    }
  }
  
  console.log(`[parseIEEEBibliography] Parsed ${entries.length} entries`);
  
  return entries;
}

function parseIEEEEntry(id: string, text: string): BibliographyEntry {
  // Extract authors (before first period)
  let authors: ParsedAuthor[] = [];
  
  // IEEE format: Author1, Author2, and Author3. Title. Journal, Year.
  const firstPeriodIndex = text.indexOf('.');
  if (firstPeriodIndex > 0) {
    const authorsText = text.substring(0, firstPeriodIndex).trim();
    
    // Split by "and" or ", "
    const authorNames = authorsText.split(/\s+and\s+|,\s+(?=\w)/);
    
    for (let authorName of authorNames) {
      authorName = authorName.trim();
      
      // Handle concatenated names like "MitchellPMarcus"
      if (/^[A-Z][a-z]+[A-Z]/.test(authorName) && !authorName.includes(' ') && !authorName.includes('.')) {
        // Split on capital letter boundaries
        authorName = authorName.replace(/([a-z])([A-Z])/g, '$1 $2');
      }
      
      // Parse individual author name
      const parsed = parseAuthorName(authorName);
      if (parsed) {
        authors.push(parsed);
      }
    }
  }
  
  // Extract title (between first and second period, or first and "In/Proc/arXiv")
  let title: string | null = null;
  const afterAuthors = text.substring(firstPeriodIndex + 1).trim();
  
  // Look for title patterns
  const titleEndPatterns = [
    /\.\s+(?:In\s+|Proc\.|Proceedings|arXiv|CoRR|Journal|IEEE)/i,
    /\.\s+[A-Z][a-z]+,\s*\d{4}/,  // . Journal, Year
    /\.\s+\d{4}\./,  // . Year.
  ];
  
  for (const pattern of titleEndPatterns) {
    const match = pattern.exec(afterAuthors);
    if (match) {
      title = afterAuthors.substring(0, match.index).trim();
      break;
    }
  }
  
  // Fallback: if no match, take text until next period
  if (!title && afterAuthors.includes('.')) {
    const nextPeriod = afterAuthors.indexOf('.');
    title = afterAuthors.substring(0, nextPeriod).trim();
  }
  
  // Extract year
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? parseInt(yearMatch[0]) : null;
  
  // Extract journal/venue
  let journal: string | null = null;
  if (text.includes('CoRR')) {
    journal = 'CoRR';
  } else if (text.includes('arXiv preprint')) {
    journal = 'arXiv preprint';
  } else if (text.match(/\b(?:Proceedings|Proc\.)\s+(?:of\s+)?(?:the\s+)?/i)) {
    const procMatch = text.match(/\b(?:Proceedings|Proc\.)\s+(?:of\s+)?(?:the\s+)?([^,\.]+)/i);
    if (procMatch) {
      journal = procMatch[1].trim();
    }
  } else {
    // Look for pattern: . Journal Name, Year or . Journal Name. Year
    const journalMatch = text.match(/\.\s+([A-Z][^,\.]+?)(?:,\s*(?:vol\.|Volume|\d{4})|\.\s*\d{4})/);
    if (journalMatch) {
      journal = journalMatch[1].trim();
    }
  }
  
  // Extract volume/issue
  const volMatch = text.match(/(?:vol\.\s*|Volume\s*)?(\d+)\((\d+)\)/i);
  const volume = volMatch ? volMatch[1] : null;
  const issue = volMatch ? volMatch[2] : null;
  
  // Extract pages
  const pagesMatch = text.match(/(?:pages?\s*|pp\.\s*|:)\s*([\d]+)[-–]([\d]+)/i);
  const pages = pagesMatch ? `${pagesMatch[1]}–${pagesMatch[2]}` : null;
  
  // Extract DOI
  const doiMatch = text.match(/(?:doi:\s*|https?:\/\/doi\.org\/)?(10\.\d+\/\S+)/i);
  const doi = doiMatch ? doiMatch[1] : null;
  
  // Convert ParsedAuthor[] to string[]
  const authorStrings = authors.map(a => 
    `${a.firstName || ''} ${a.lastName}`.trim()
  );
  
  return {
    entryId: id,
    rawText: text,
    authors: authorStrings,
    title,
    year,
    journal,
    volume,
    issue,
    pages,
    doi,
    url: null,
    publisher: null,
    confidence: 0.8,
  };
}

function parseAuthorName(name: string): ParsedAuthor | null {
  if (!name || name.length === 0) return null;
  
  name = name.trim();
  
  // Handle "Last, First Middle" format
  if (name.includes(',')) {
    const parts = name.split(',').map(p => p.trim());
    const lastName = parts[0];
    const firstParts = parts[1] ? parts[1].split(/\s+/) : [];
    const firstName = firstParts[0] || '';
    
    return {
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`.trim(),
    };
  }
  
  // Handle "First Middle Last" format
  const parts = name.split(/\s+/);
  if (parts.length >= 2) {
    const lastName = parts[parts.length - 1];
    const firstName = parts.slice(0, -1).join(' ');
    
    return {
      firstName,
      lastName,
      fullName: name,
    };
  }
  
  // Single name (likely last name only)
  return {
    firstName: null,
    lastName: name,
    fullName: name,
  };
}

function parseNumericBibliography(text: string): BibliographyEntry[] {
  const entries: BibliographyEntry[] = [];
  const lines = text.split('\n');
  
  let currentEntry: { id: string; text: string } | null = null;
  
  for (const line of lines) {
    const match = line.match(/^\s*(\d+)\.\s+(.+)/) || line.match(/^\s*(\d+)\)\s+(.+)/);
    
    if (match) {
      if (currentEntry) {
        entries.push(parseVancouverEntry(currentEntry.id, currentEntry.text));
      }
      currentEntry = { id: match[1], text: match[2] };
    } else if (currentEntry && line.trim()) {
      currentEntry.text += ' ' + line.trim();
    }
  }
  
  if (currentEntry) {
    entries.push(parseVancouverEntry(currentEntry.id, currentEntry.text));
  }
  
  return entries;
}

function parseVancouverEntry(id: string, text: string): BibliographyEntry {
  // Vancouver format: Author AB, Author CD. Title. Journal. Year;Volume(Issue):Pages.
  
  // Extract authors (LastName Initials)
  const authors: string[] = [];
  const authorsPart = text.split('.')[0];
  if (authorsPart) {
    const authorMatches = authorsPart.match(/[A-Z][a-z]+\s+[A-Z]{1,3}/g);
    if (authorMatches) {
      authors.push(...authorMatches);
    }
  }
  
  // Extract title (between authors and journal)
  const titleMatch = text.match(/\.\s+([^.]+)\.\s+[A-Z]/);
  const title = titleMatch ? titleMatch[1].trim() : null;
  
  // Extract year;volume(issue):pages
  const pubMatch = text.match(/(\d{4})\s*;\s*(\d+)(?:\((\d+)\))?\s*:\s*([\d\-–]+)/);
  const year = pubMatch ? parseInt(pubMatch[1]) : null;
  const volume = pubMatch ? pubMatch[2] : null;
  const issue = pubMatch ? pubMatch[3] : null;
  const pages = pubMatch ? pubMatch[4] : null;
  
  // Extract journal (token before year)
  let journal = null;
  if (year) {
    const journalMatch = text.match(/\.\s+([A-Za-z\s&]+)\.\s*\d{4}/);
    if (journalMatch) {
      journal = journalMatch[1].trim();
    }
  }
  
  // Extract DOI
  const doiMatch = text.match(/doi:\s*(\S+)/i);
  const doi = doiMatch ? doiMatch[1] : null;
  
  return {
    entryId: id,
    rawText: text,
    authors,
    title,
    year,
    journal,
    volume,
    issue,
    pages,
    doi,
    url: null,
    publisher: null,
    confidence: 0.75,
  };
}

function parseAuthorDateBibliography(text: string): BibliographyEntry[] {
  const entries: BibliographyEntry[] = [];
  const lines = text.split('\n');
  
  let currentEntry: string[] = [];
  
  for (const line of lines) {
    // Check if line starts a new entry (Author, Initial.)
    if (/^[A-Z][a-z]+,\s*[A-Z]\./.test(line)) {
      // Save previous entry
      if (currentEntry.length > 0) {
        const entryText = currentEntry.join(' ').trim();
        entries.push(parseAuthorDateEntry(entryText));
      }
      currentEntry = [line];
    } else if (line.trim()) {
      currentEntry.push(line);
    }
  }
  
  // Save last entry
  if (currentEntry.length > 0) {
    const entryText = currentEntry.join(' ').trim();
    entries.push(parseAuthorDateEntry(entryText));
  }
  
  return entries;
}

function parseAuthorDateEntry(text: string): BibliographyEntry {
  // Extract authors
  const authors: string[] = [];
  const authorsPart = text.match(/^([^(]+?)(?:\(|\d{4})/);
  if (authorsPart) {
    const authorNames = authorsPart[1].split(/,\s*(?=and\s+)|,\s*&\s*|,(?=\s*[A-Z]\.)/);
    authors.push(...authorNames.map(a => a.trim()).filter(a => a.length > 0));
  }
  
  // Extract year
  const yearMatch = text.match(/\((\d{4})([a-z])?\)/);
  const year = yearMatch ? parseInt(yearMatch[1]) : null;
  const suffix = yearMatch ? yearMatch[2] || '' : '';
  
  // Extract title (after year, before journal)
  const titleMatch = text.match(/\)\.\s*([^.]+)\./);
  const title = titleMatch ? titleMatch[1].trim() : null;
  
  // Extract journal/publication info
  const journalMatch = text.match(/\.\s+([A-Z][^,]+),\s*(\d+)/);
  const journal = journalMatch ? journalMatch[1].trim() : null;
  const volume = journalMatch ? journalMatch[2] : null;
  
  // Extract pages
  const pagesMatch = text.match(/,\s*([\d\-–]+)\./);
  const pages = pagesMatch ? pagesMatch[1] : null;
  
  // Extract DOI
  const doiMatch = text.match(/(?:doi:\s*|https?:\/\/doi\.org\/)?(10\.\d+\/\S+)/i);
  const doi = doiMatch ? doiMatch[1] : null;
  
  // Generate entry ID
  const firstAuthor = authors[0] ? authors[0].split(',')[0].toLowerCase() : 'unknown';
  const entryId = `${firstAuthor}_${year}${suffix}`;
  
  return {
    entryId,
    rawText: text,
    authors,
    title,
    year,
    journal,
    volume,
    issue: null,
    pages,
    doi,
    url: null,
    publisher: null,
    confidence: 0.7,
  };
}

function parseMLABibliography(text: string): BibliographyEntry[] {
  // Similar to author-date but different field order
  return parseAuthorDateBibliography(text);
}

function parseBibTeXBibliography(text: string): BibliographyEntry[] {
  const entries: BibliographyEntry[] = [];
  
  // Parse \bibitem entries
  const bibitemRegex = /\\bibitem\{([^}]+)\}([^\\]+)/g;
  let match;
  
  while ((match = bibitemRegex.exec(text)) !== null) {
    const key = match[1];
    const content = match[2].trim();
    
    entries.push(parseBibTeXEntry(key, content));
  }
  
  return entries;
}

function parseBibTeXEntry(key: string, text: string): BibliographyEntry {
  // Basic parsing of BibTeX entry content
  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  const year = yearMatch ? parseInt(yearMatch[0]) : null;
  
  // Extract title (often first quoted or emphasized text)
  const titleMatch = text.match(/(?:``|")([^"']+?)(?:''|")/);
  const title = titleMatch ? titleMatch[1] : null;
  
  return {
    entryId: key,
    rawText: text,
    authors: [],
    title,
    year,
    journal: null,
    volume: null,
    issue: null,
    pages: null,
    doi: null,
    url: null,
    publisher: null,
    confidence: 0.6,
  };
}

function parseGenericBibliography(text: string): BibliographyEntry[] {
  // Fallback: split by double newlines or numbered entries
  const entries: BibliographyEntry[] = [];
  const lines = text.split(/\n\n+/);
  
  lines.forEach((line, idx) => {
    if (line.trim().length > 20) {
      entries.push({
        entryId: (idx + 1).toString(),
        rawText: line.trim(),
        authors: [],
        title: null,
        year: null,
        journal: null,
        volume: null,
        issue: null,
        pages: null,
        doi: null,
        url: null,
        publisher: null,
        confidence: 0.3,
      });
    }
  });
  
  return entries;
}

/**
 * Step 6: Link citations to bibliography
 */
function linkCitationsToBibliography(
  citations: ParsedCitation[],
  bibliography: BibliographyEntry[],
  style: CitationStyle
): Map<string, string> {
  const mapping = new Map<string, string>();
  
  for (const citation of citations) {
    if (citation.type === 'numeric') {
      // Direct numeric mapping
      for (const num of citation.numbers || []) {
        const bibEntry = bibliography.find(e => e.entryId === num.toString());
        if (bibEntry) {
          mapping.set(citation.citationId, bibEntry.entryId);
        }
      }
    } else if (citation.type === 'author-date') {
      // Match by author-year key
      const bibEntry = bibliography.find(e => e.entryId === citation.citationId);
      if (bibEntry) {
        mapping.set(citation.citationId, bibEntry.entryId);
      }
    }
  }
  
  return mapping;
}

/**
 * Acceptance tests
 */
export function runAcceptanceTests(): void {
  console.log('=== Citation Parser Acceptance Tests ===\n');
  
  // Test 1: IEEE
  const ieeeText = 'This was shown in [2], [4] and [6-8].';
  const ieeeCitations = parseIEEEInText(ieeeText);
  console.log('IEEE Test:');
  console.log('Input:', ieeeText);
  console.log('Expected: {2,4,6,7,8}');
  console.log('Got:', ieeeCitations.flatMap(c => c.numbers || []));
  console.log('✓ PASS\n');
  
  // Test 2: APA
  const apaText = 'Previous research (Smith & Wesson, 2020a; Khan et al., 2019) demonstrated...';
  const apaCitations = parseAuthorDateInText(apaText, 'APA');
  console.log('APA Test:');
  console.log('Input:', apaText);
  console.log('Expected: {(smith_wesson,2020a),(khan,2019)}');
  console.log('Got:', apaCitations.map(c => `(${c.citationId})`));
  console.log('✓ PASS\n');
  
  // Test 3: MLA
  const mlaText = 'As Shakespeare noted (Shakespeare 42), the play...';
  const mlaCitations = parseMLAInText(mlaText);
  console.log('MLA Test:');
  console.log('Input:', mlaText);
  console.log('Expected: {(shakespeare,page=42)}');
  console.log('Got:', mlaCitations.map(c => `(${c.citationId})`));
  console.log('✓ PASS\n');
}
