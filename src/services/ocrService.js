import Tesseract from 'tesseract.js';

/**
 * Runs OCR on an image element or URL and tries to extract a date.
 */
export async function extractDateFromImage(imageSource) {
  const result = await Tesseract.recognize(imageSource, 'spa', {
    logger: () => {},
  });
  const text = result.data.text;
  const confidence = result.data.confidence;
  const date = parseChileanDate(text);
  return { raw: text, date, confidence };
}

/**
 * Parses common Chilean date formats from raw OCR text.
 * Supported: DD/MM/YYYY, DD-MM-YYYY, MM/YYYY, DDMMYYYY, Vence: DD-MM-YY
 */
export function parseChileanDate(rawText) {
  if (!rawText) return null;

  const patterns = [
    // DD/MM/YYYY or DD-MM-YYYY
    { regex: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/, handler: (m) => new Date(+m[3], +m[2] - 1, +m[1]) },
    // DD/MM/YY or DD-MM-YY
    { regex: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})/, handler: (m) => new Date(2000 + +m[3], +m[2] - 1, +m[1]) },
    // MM/YYYY
    { regex: /(\d{1,2})[\/\-](\d{4})/, handler: (m) => new Date(+m[2], +m[1] - 1, 1) },
    // DDMMYYYY (8 digits)
    { regex: /\b(\d{2})(\d{2})(\d{4})\b/, handler: (m) => new Date(+m[3], +m[2] - 1, +m[1]) },
  ];

  for (const { regex, handler } of patterns) {
    const match = rawText.match(regex);
    if (match) {
      const date = handler(match);
      if (!isNaN(date.getTime())) return date;
    }
  }
  return null;
}

/**
 * Validates that the extracted date is reasonable (between today and 5 years from now).
 */
export function validateExtractedDate(date) {
  if (!date) return false;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const maxFuture = new Date();
  maxFuture.setFullYear(maxFuture.getFullYear() + 5);
  return date >= now && date <= maxFuture;
}
