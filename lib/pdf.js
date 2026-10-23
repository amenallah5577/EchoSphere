const { PDFParse } = require('pdf-parse');

async function extractPdfText(buffer) {
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  try {
    const result = await parser.getText();
    if (!result.text.trim()) throw new Error('PDF contains no extractable text');
    return result.text.slice(0, 5000);
  } finally {
    await parser.destroy();
  }
}

module.exports = { extractPdfText };
