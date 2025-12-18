/**
 * Test suite for comprehensive citation parser
 */

import { parseAcademicDocument, runAcceptanceTests } from './citation-parser';

console.log('\n🔬 Running Acceptance Tests...\n');
runAcceptanceTests();

console.log('\n📄 Full Document Parsing Examples\n');

// Example 1: IEEE Style Document
const ieeeDoc = `
Introduction

Deep learning has revolutionized many fields [1], [2]. Recent work on transformers [3-5] 
has shown promising results. The attention mechanism [6] is key to these improvements.

References

[1] Y. LeCun, Y. Bengio, and G. Hinton, "Deep learning," Nature, vol. 521, no. 7553, pp. 436-444, 2015.
[2] I. Goodfellow, Y. Bengio, and A. Courville, "Deep Learning," MIT Press, 2016.
[3] A. Vaswani et al., "Attention is all you need," in Advances in Neural Information Processing Systems, 2017, pp. 5998-6008.
[4] J. Devlin et al., "BERT: Pre-training of deep bidirectional transformers," in Proc. NAACL, 2019, pp. 4171-4186.
[5] T. Brown et al., "Language models are few-shot learners," in Advances in NeurIPS, 2020.
[6] D. Bahdanau, K. Cho, and Y. Bengio, "Neural machine translation by jointly learning to align and translate," arXiv preprint arXiv:1409.0473, 2014.
`;

console.log('=== IEEE Style Document ===');
const ieeeParsed = parseAcademicDocument(ieeeDoc);
console.log(`Detected Style: ${ieeeParsed.style} (confidence: ${ieeeParsed.styleConfidence.toFixed(2)})`);
console.log(`In-text citations found: ${ieeeParsed.inTextCitations.length}`);
console.log(`Bibliography entries: ${ieeeParsed.bibliography.length}`);
console.log('\nSample citation:', ieeeParsed.inTextCitations[0]);
console.log('\nSample bibliography entry:');
console.log(JSON.stringify(ieeeParsed.bibliography[0], null, 2));

// Example 2: APA Style Document
const apaDoc = `
Introduction

Previous research has demonstrated the importance of attention mechanisms (Vaswani et al., 2017). 
Building on this work, transformer models have become dominant (Brown et al., 2020; Devlin et al., 2019).
The original work by Bahdanau, Cho, and Bengio (2014) laid the foundation for these advances.

References

Bahdanau, D., Cho, K., & Bengio, Y. (2014). Neural machine translation by jointly learning to align and translate. arXiv preprint arXiv:1409.0473.

Brown, T., Mann, B., Ryder, N., Subbiah, M., Kaplan, J., Dhariwal, P., ... & Amodei, D. (2020). Language models are few-shot learners. Advances in Neural Information Processing Systems, 33, 1877-1901.

Devlin, J., Chang, M. W., Lee, K., & Toutanova, K. (2019). BERT: Pre-training of deep bidirectional transformers for language understanding. In Proceedings of NAACL-HLT (pp. 4171-4186).

Vaswani, A., Shazeer, N., Parmar, N., Uszkoreit, J., Jones, L., Gomez, A. N., ... & Polosukhin, I. (2017). Attention is all you need. In Advances in Neural Information Processing Systems (pp. 5998-6008).
`;

console.log('\n\n=== APA Style Document ===');
const apaParsed = parseAcademicDocument(apaDoc);
console.log(`Detected Style: ${apaParsed.style} (confidence: ${apaParsed.styleConfidence.toFixed(2)})`);
console.log(`In-text citations found: ${apaParsed.inTextCitations.length}`);
console.log(`Bibliography entries: ${apaParsed.bibliography.length}`);
console.log('\nSample citation:', apaParsed.inTextCitations[0]);
console.log('\nSample bibliography entry:');
console.log(JSON.stringify(apaParsed.bibliography[0], null, 2));

// Example 3: Vancouver Style Document
const vancouverDoc = `
Background

Recent studies (1,2) have shown the effectiveness of deep learning. The transformer 
architecture (3) has become the standard approach.

References

1. LeCun Y, Bengio Y, Hinton G. Deep learning. Nature. 2015;521(7553):436-444. doi: 10.1038/nature14539

2. Goodfellow I, Bengio Y, Courville A. Deep Learning. MIT Press; 2016.

3. Vaswani A, Shazeer N, Parmar N, et al. Attention is all you need. In: Advances in Neural Information Processing Systems. 2017:5998-6008.
`;

console.log('\n\n=== Vancouver Style Document ===');
const vancouverParsed = parseAcademicDocument(vancouverDoc);
console.log(`Detected Style: ${vancouverParsed.style} (confidence: ${vancouverParsed.styleConfidence.toFixed(2)})`);
console.log(`In-text citations found: ${vancouverParsed.inTextCitations.length}`);
console.log(`Bibliography entries: ${vancouverParsed.bibliography.length}`);
console.log('\nSample citation:', vancouverParsed.inTextCitations[0]);
console.log('\nSample bibliography entry:');
console.log(JSON.stringify(vancouverParsed.bibliography[0], null, 2));

// Example 4: Summary Statistics
console.log('\n\n=== Summary Statistics ===');
console.log('\nIEEE Document:');
console.log(`  - Total citations in text: ${ieeeParsed.inTextCitations.length}`);
console.log(`  - Unique numbers cited: ${new Set(ieeeParsed.inTextCitations.flatMap(c => c.numbers || [])).size}`);
console.log(`  - Bibliography entries with authors: ${ieeeParsed.bibliography.filter(e => e.authors.length > 0).length}`);
console.log(`  - Entries with DOI: ${ieeeParsed.bibliography.filter(e => e.doi).length}`);

console.log('\nAPA Document:');
console.log(`  - Total citations in text: ${apaParsed.inTextCitations.length}`);
console.log(`  - Unique author-year keys: ${new Set(apaParsed.inTextCitations.map(c => c.citationId)).size}`);
console.log(`  - Bibliography entries with year: ${apaParsed.bibliography.filter(e => e.year).length}`);
console.log(`  - Average authors per entry: ${(apaParsed.bibliography.reduce((sum, e) => sum + e.authors.length, 0) / apaParsed.bibliography.length).toFixed(1)}`);
