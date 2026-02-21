/**
 * PDF Text Extraction — uses pdf.js to extract text content from PDFs.
 * This enables PDFs to be opened in the editor and read aloud by TTS.
 *
 * Dynamically imported to avoid bloating the main bundle (~1MB savings).
 * The pdf.js worker loads on-demand only when a PDF is actually uploaded.
 */

let pdfjsModule: typeof import('pdfjs-dist') | null = null;

export async function getPdfjs() {
  if (!pdfjsModule) {
    pdfjsModule = await import('pdfjs-dist');
    pdfjsModule.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
  }
  return pdfjsModule;
}

/**
 * Extract all text from a PDF file or blob URL.
 * Returns plain text with page breaks as separators.
 */
export async function extractTextFromPdf(source: File | string): Promise<string> {
  const pdfjsLib = await getPdfjs();

  let data: ArrayBuffer | string;
  if (source instanceof File) {
    data = await source.arrayBuffer();
  } else {
    const response = await fetch(source);
    data = await response.arrayBuffer();
  }

  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (pageText) {
      pages.push(pageText);
    }
  }

  return pages.join('\n\n---\n\n');
}
