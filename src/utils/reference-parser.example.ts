/**
 * Example usage of the reference parser module
 * Run this file to see how the parser works with different citation formats
 */

import { parseReference, parseReferences, getReferenceSummary } from './reference-parser';

// Example references in different formats
const exampleReferences = [
  // APA Format
  `Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., ... & Polosukhin, I. (2017). Attention is all you need. In Advances in neural information processing systems (pp. 5998-6008).`,
  
  // IEEE Format
  `[1] A. Vaswani et al., "Attention is all you need," in Advances in Neural Information Processing Systems, 2017, pp. 5998-6008.`,
  
  // MLA Format
  `Vaswani, Ashish, et al. "Attention is all you need." Advances in neural information processing systems 30 (2017).`,
  
  // Another APA
  `Bahdanau, D., Cho, K., & Bengio, Y. (2014). Neural machine translation by jointly learning to align and translate. arXiv preprint arXiv:1409.0473.`,
  
  // IEEE with DOI
  `[2] K. Cho et al., "Learning phrase representations using RNN encoder-decoder for statistical machine translation," in Proc. EMNLP, 2014, pp. 1724-1734, doi: 10.3115/v1/D14-1179.`,
];

// Parse all references
console.log('=== Parsing References ===\n');

const parsedReferences = parseReferences(exampleReferences);

parsedReferences.forEach((parsed, idx) => {
  console.log(`\n--- Reference ${idx + 1} ---`);
  console.log(`Format: ${parsed.detectedFormat} (confidence: ${parsed.confidence}%)`);
  console.log(`Title: ${parsed.title || 'Not found'}`);
  console.log(`Year: ${parsed.year || 'Not found'}`);
  console.log(`Authors (${parsed.authors.length}):`);
  
  parsed.authors.slice(0, 3).forEach(author => {
    console.log(`  - ${author.lastName}, ${author.firstName || '(no first name)'}`);
  });
  
  if (parsed.authors.length > 3) {
    console.log(`  ... and ${parsed.authors.length - 3} more`);
  }
  
  if (parsed.journal) console.log(`Journal: ${parsed.journal}`);
  if (parsed.volume) console.log(`Volume: ${parsed.volume}`);
  if (parsed.pages) console.log(`Pages: ${parsed.pages}`);
  if (parsed.doi) console.log(`DOI: ${parsed.doi}`);
});

// Get summary
console.log('\n\n=== Summary ===');
const summary = getReferenceSummary(parsedReferences);
console.log(`Total references: ${summary.totalReferences}`);
console.log(`Average confidence: ${summary.averageConfidence.toFixed(1)}%`);
console.log(`Unique authors: ${summary.uniqueAuthors}`);
console.log(`References with DOI: ${summary.referencesWithDOI}`);
console.log('\nFormats detected:');
Object.entries(summary.formatsDetected).forEach(([format, count]) => {
  console.log(`  ${format}: ${count}`);
});

// Example: Parse a single reference
console.log('\n\n=== Single Reference Example ===');
const singleRef = parseReference(
  `Smith, J. A., & Johnson, B. C. (2023). Deep learning approaches for natural language processing. Journal of AI Research, 45(2), 123-145. https://doi.org/10.1234/jair.2023.123`
);

console.log(JSON.stringify(singleRef, null, 2));
