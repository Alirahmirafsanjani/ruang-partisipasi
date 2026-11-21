import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import { TEMPLATE_BASE64 } from './template-base64';

export interface CertificateInput {
  /** Nomor surat lengkap, misalnya 038.001/B/SERT/HIMSI/UAA/XI/2026 */
  letterNumber: string;
  fullName: string;
}

const PAGE_WIDTH = 841.89; // A4 landscape (points)
const PAGE_HEIGHT = 595.28;

const TEMPLATE_WIDTH_PX = 2000;
const PX_TO_PT = PAGE_WIDTH / TEMPLATE_WIDTH_PX;

// Posisi hasil pengukuran dari template.png (koordinat piksel dari kiri-atas).
const LETTER_NUMBER_BASELINE_Y_PX = 545; // di atas "Diberikan Kepada:" (y ≈ 567)
const NAME_BASELINE_Y_PX = 680; // di bawah "Diberikan Kepada:", di atas garis (y ≈ 700)
const NAME_MAX_WIDTH_PX = 1450;
const NAME_START_SIZE_PX = 58;
const NAME_MIN_SIZE_PX = 30;

const ink = rgb(0.161, 0.243, 0.204); // #293E34

function pxToPt(px: number): number {
  return px * PX_TO_PT;
}

function pixelYToPdfY(pixelY: number): number {
  return PAGE_HEIGHT - pxToPt(pixelY);
}

/** Standard fonts hanya mendukung WinAnsi; fallback bila ada karakter di luar itu. */
function ensureEncodable(text: string, font: PDFFont): string {
  try {
    font.encodeText(text);
    return text;
  } catch {
    return text
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7E]/g, '');
  }
}

function fitSingleLine(
  text: string,
  font: PDFFont,
  maxWidthPx: number,
  startSizePx: number,
  minSizePx: number,
): { text: string; sizePx: number } {
  const maxWidthPt = pxToPt(maxWidthPx);
  for (let sizePx = startSizePx; sizePx >= minSizePx; sizePx -= 2) {
    const sizePt = pxToPt(sizePx);
    if (font.widthOfTextAtSize(text, sizePt) <= maxWidthPt) {
      return { text, sizePx };
    }
  }

  // Nama sangat panjang: kecilkan sampai batas minimum lalu singkat dengan ellipsis.
  const sizePt = pxToPt(minSizePx);
  let shortened = text;
  while (
    shortened.length > 1 &&
    font.widthOfTextAtSize(`${shortened}...`, sizePt) > maxWidthPt
  ) {
    shortened = shortened.slice(0, -1);
  }
  return { text: `${shortened}...`, sizePx: minSizePx };
}

function drawCentered(
  page: PDFPage,
  text: string,
  font: PDFFont,
  baselinePixelY: number,
  sizePx: number,
  color: ReturnType<typeof rgb>,
): void {
  const safe = ensureEncodable(text, font);
  const sizePt = pxToPt(sizePx);
  const width = font.widthOfTextAtSize(safe, sizePt);
  page.drawText(safe, {
    x: (PAGE_WIDTH - width) / 2,
    y: pixelYToPdfY(baselinePixelY),
    size: sizePt,
    font,
    color,
  });
}

export async function generateCertificatePdf(input: CertificateInput): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Sertifikat Partisipasi — ${input.fullName}`);
  pdfDoc.setSubject(input.letterNumber);

  const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Template PNG menjadi background penuh halaman.
  const templateBytes = Buffer.from(TEMPLATE_BASE64, 'base64');
  const templateImage = await pdfDoc.embedPng(templateBytes);
  page.drawImage(templateImage, {
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
  });

  const timesBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // Nomor surat di atas kalimat "Diberikan Kepada:".
  drawCentered(page, input.letterNumber, helvetica, LETTER_NUMBER_BASELINE_Y_PX, 28, ink);

  // Nama peserta di bawah kalimat "Diberikan Kepada:" dan di atas garis.
  const fittedName = fitSingleLine(
    input.fullName,
    timesBold,
    NAME_MAX_WIDTH_PX,
    NAME_START_SIZE_PX,
    NAME_MIN_SIZE_PX,
  );
  drawCentered(page, fittedName.text, timesBold, NAME_BASELINE_Y_PX, fittedName.sizePx, ink);

  return pdfDoc.save();
}

export function certificateFileName(letterNumber: string): string {
  const safe = letterNumber.replace(/[^A-Za-z0-9._-]/g, '-');
  return `sertifikat-${safe}.pdf`;
}
