import qrcode from 'qrcode-generator';

// qrcode-generator (Kazuhiko Arase, MIT) ships a Latin-1 `stringToBytes`.
// Swap in a UTF-8 encoder once, at load, so non-ASCII payloads (URLs with
// query params, names, …) encode to the bytes a reader expects.
(qrcode as unknown as { stringToBytes: (s: string) => number[] }).stringToBytes =
  (s: string): number[] => {
    const out: number[] = [];
    for (const ch of s) {
      const cp = ch.codePointAt(0)!;
      if (cp < 0x80) out.push(cp);
      else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 0x3f));
      else if (cp < 0x10000)
        out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
      else
        out.push(
          0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f),
          0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f),
        );
    }
    return out;
  };

export type QrEcl = 'L' | 'M' | 'Q' | 'H';

export interface QrMatrix {
  /** Side length in modules, quiet-zone margin included. */
  size: number;
  /** QR version, 1..40 — each step adds 4 modules per side. */
  version: number;
  /** Quiet-zone width, in modules, added on every side. */
  margin: number;
  /** Row-major `size` × `size` grid; `true` = dark module. */
  modules: boolean[][];
}

/**
 * Encode `text` to a QR module grid — byte mode, UTF-8, smallest version that
 * fits. Throws on empty input or a payload too large for version 40 at `ecl`.
 */
export function toQrMatrix(
  text: string,
  opts: { ecl?: QrEcl; margin?: number } = {},
): QrMatrix {
  const body = (text ?? '').trim();
  if (!body) throw new Error('juel-qr: nothing to encode');

  const ecl: QrEcl = opts.ecl ?? 'M';
  const margin = Math.max(0, Math.trunc(opts.margin ?? 4));

  const qr = qrcode(0, ecl); // 0 => auto-pick the smallest fitting version
  qr.addData(body);          // default Byte mode
  qr.make();

  const count = qr.getModuleCount();
  const size = count + margin * 2;
  const modules: boolean[][] = [];
  for (let r = 0; r < size; r++) {
    const row: boolean[] = new Array(size).fill(false);
    if (r >= margin && r < margin + count)
      for (let c = 0; c < count; c++) row[c + margin] = qr.isDark(r - margin, c);
    modules.push(row);
  }
  return { size, version: (count - 17) / 4, margin, modules };
}
