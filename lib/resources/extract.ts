import type { ResourceExtractionMethod, ResourceFileType } from "@/lib/types";

const MAX_EXTRACTED_TEXT_LENGTH = 24000;
const MAX_PDF_PAGES = 20;
const MAX_OCR_PDF_PAGES = 8;
const DIRECT_TEXT_THRESHOLD = 80;
const OCR_SCALE = 1.5;

function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function trimExtractedText(value: string, maxLength = MAX_EXTRACTED_TEXT_LENGTH) {
  const normalized = collapseWhitespace(value);
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trim()}...`;
}

function stripRtf(value: string) {
  return value
    .replace(/\\par[d]?/g, "\n")
    .replace(/\\tab/g, "\t")
    .replace(/\\'[0-9a-f]{2}/gi, " ")
    .replace(/\\[a-z]+-?\d* ?/gi, " ")
    .replace(/[{}]/g, " ");
}

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error || new Error("No se pudo leer el archivo"));
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

async function extractTextFromPdf(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }

  const pdfData = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: pdfData });
  const pdf = await loadingTask.promise;

  try {
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, MAX_PDF_PAGES); pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      const normalized = collapseWhitespace(pageText);

      if (normalized) {
        pages.push(`Pagina ${pageNumber}: ${normalized}`);
      }

      if (pages.join("\n\n").length >= MAX_EXTRACTED_TEXT_LENGTH) {
        break;
      }
    }

    return trimExtractedText(pages.join("\n\n"));
  } finally {
    await pdf.destroy();
  }
}

async function createOcrWorker() {
  const { createWorker } = await import("tesseract.js");

  return createWorker(["spa", "eng"], 1, {
    logger: () => undefined,
  });
}

async function renderPdfPageToCanvas(
  pdfjs: typeof import("pdfjs-dist/legacy/build/pdf.mjs"),
  file: File,
  maxPages: number
) {
  if (typeof document === "undefined") {
    return [];
  }

  if (!pdfjs.GlobalWorkerOptions.workerSrc) {
    pdfjs.GlobalWorkerOptions.workerSrc = new URL(
      "pdfjs-dist/legacy/build/pdf.worker.min.mjs",
      import.meta.url
    ).toString();
  }

  const pdfData = new Uint8Array(await file.arrayBuffer());
  const loadingTask = pdfjs.getDocument({ data: pdfData });
  const pdf = await loadingTask.promise;

  try {
    const canvases: HTMLCanvasElement[] = [];

    for (let pageNumber = 1; pageNumber <= Math.min(pdf.numPages, maxPages); pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: OCR_SCALE });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");

      if (!context) {
        continue;
      }

      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);

      await page.render({
        canvas,
        canvasContext: context,
        viewport,
      }).promise;

      canvases.push(canvas);
    }

    return canvases;
  } finally {
    await pdf.destroy();
  }
}

async function extractTextFromPdfWithOcr(file: File) {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const canvases = await renderPdfPageToCanvas(pdfjs, file, MAX_OCR_PDF_PAGES);

  if (canvases.length === 0) {
    return "";
  }

  const worker = await createOcrWorker();

  try {
    const pages: string[] = [];

    for (let index = 0; index < canvases.length; index += 1) {
      const result = await worker.recognize(canvases[index]);
      const normalized = trimExtractedText(result.data.text, 2600);

      if (normalized) {
        pages.push(`Pagina ${index + 1}: ${normalized}`);
      }

      if (pages.join("\n\n").length >= MAX_EXTRACTED_TEXT_LENGTH) {
        break;
      }
    }

    return trimExtractedText(pages.join("\n\n"));
  } finally {
    await worker.terminate();
  }
}

async function extractTextFromTextFile(file: File) {
  const rawText = await file.text();
  const normalized =
    file.name.toLowerCase().endsWith(".rtf") ? stripRtf(rawText) : rawText;

  return trimExtractedText(normalized);
}

export async function prepareResourcePayload(
  file: File,
  fileType: ResourceFileType
): Promise<{
  fileData?: string;
  extractedContent?: string;
  extractionMethod?: ResourceExtractionMethod;
}> {
  switch (fileType) {
    case "pdf": {
      const directText = await extractTextFromPdf(file);

      if (directText.trim().length >= DIRECT_TEXT_THRESHOLD) {
        return {
          fileData: undefined,
          extractedContent: directText,
          extractionMethod: "text",
        };
      }

      const ocrText = await extractTextFromPdfWithOcr(file);
      const extractedContent =
        ocrText.trim().length > directText.trim().length ? ocrText : directText;

      return {
        fileData: undefined,
        extractedContent,
        extractionMethod: extractedContent ? (ocrText.trim().length > directText.trim().length ? "ocr" : "text") : undefined,
      };
    }
    case "text":
      return {
        fileData: undefined,
        extractedContent: await extractTextFromTextFile(file),
        extractionMethod: "text",
      };
    case "image":
      return {
        fileData: await readFileAsDataUrl(file),
        extractedContent: undefined,
      };
    default:
      return {
        fileData: undefined,
        extractedContent: undefined,
      };
  }
}
