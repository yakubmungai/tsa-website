import { createHash } from 'node:crypto';
import { parseUSDToCents } from '../money';

/**
 * Reading the Treasurer's bank-statement download.
 *
 * Wells Fargo's "Download Account Activity" as comma-separated values gives
 * five quoted columns and no header row:
 *
 *   "09/12/2026","19.61","*","","ZELLE FROM AMINA MRISHO ON 09/12 REF # WFCT0ABC TSA-101"
 *
 * i.e. date, amount (negative for money out), a marker, a check number, and
 * the description. That layout is the whole of WELLS_FARGO_COLUMNS below — if
 * the bank changes it, that one object is what changes.
 *
 * A file with a header row (Date, Amount, Description, …) from another bank or
 * a spreadsheet is also accepted, by column name.
 *
 * TODO(treasurer): confirm against a real (redacted) export from TSA's account
 * before relying on sender-name matching; the Zelle description wording is the
 * part most likely to differ.
 */

export const WELLS_FARGO_COLUMNS = { date: 0, amount: 1, description: 4 } as const;

export interface BankRow {
  postedOn: Date;
  amountCents: number;
  description: string;
  senderName: string | null;
  memo: string | null;
  rowHash: string;
}

export interface ParseResult {
  rows: BankRow[];
  /** Money-out lines, skipped: only deposits can be member payments. */
  skippedDebits: number;
  errors: { line: number; message: string }[];
}

/** Split one CSV line, honouring quotes and doubled quotes. */
export function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function parseDate(value: string): Date | null {
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(value);
  if (us) {
    const year = us[3].length === 2 ? 2000 + Number(us[3]) : Number(us[3]);
    return new Date(Date.UTC(year, Number(us[1]) - 1, Number(us[2]), 18));
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (iso) return new Date(Date.UTC(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), 18));
  return null;
}

/**
 * The sender, from a Zelle or CashApp description, e.g.
 * "ZELLE FROM AMINA MRISHO ON 09/12 REF # …" → "AMINA MRISHO".
 */
export function senderFrom(description: string): string | null {
  const zelle = /ZELLE (?:PAYMENT )?FROM\s+(.+?)(?:\s+ON\s+\d{1,2}\/\d{1,2}|\s+REF\b|\s+CONF\b|$)/i.exec(description);
  if (zelle) return zelle[1].trim();
  const cash = /(?:CASH APP|SQUARE INC).*?(?:FROM|\*)\s*([A-Z][A-Z .'-]+)/i.exec(description);
  if (cash) return cash[1].trim();
  return null;
}

/** "TSA-147" (or "tsa 147") in the memo is how a member marks their payment. */
export function referenceIn(text: string): number | null {
  const m = /\bTSA[\s-]?(\d{1,5})\b/i.exec(text);
  return m ? Number(m[1]) : null;
}

export function parseBankCsv(text: string): ParseResult {
  const lines = text.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim() !== '');
  const result: ParseResult = { rows: [], skippedDebits: 0, errors: [] };
  if (lines.length === 0) return result;

  let cols: { date: number; amount: number; description: number } = WELLS_FARGO_COLUMNS;
  let start = 0;
  const first = splitCsvLine(lines[0]).map((c) => c.toLowerCase());
  if (first.some((c) => c.includes('date')) && first.some((c) => c.includes('amount'))) {
    cols = {
      date: first.findIndex((c) => c.includes('date')),
      amount: first.findIndex((c) => c.includes('amount')),
      description: Math.max(
        first.findIndex((c) => c.includes('description') || c.includes('memo') || c.includes('details')),
        0
      ),
    };
    start = 1;
  }

  // The same deposit can legitimately appear twice on one day (two members,
  // same amount). Count repeats so each gets its own hash.
  const seen = new Map<string, number>();
  for (let i = start; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]);
    const date = parseDate(cells[cols.date] ?? '');
    const description = (cells[cols.description] ?? '').replace(/\s+/g, ' ').trim();
    let amountCents: number;
    try {
      amountCents = parseUSDToCents(cells[cols.amount] ?? '');
    } catch {
      result.errors.push({ line: i + 1, message: 'Amount not readable' });
      continue;
    }
    if (!date) {
      result.errors.push({ line: i + 1, message: 'Date not readable' });
      continue;
    }
    if (amountCents <= 0) {
      result.skippedDebits++;
      continue;
    }
    const base = `${date.toISOString().slice(0, 10)}|${amountCents}|${description}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    result.rows.push({
      postedOn: date,
      amountCents,
      description,
      senderName: senderFrom(description),
      memo: referenceIn(description) !== null ? `TSA-${referenceIn(description)}` : null,
      rowHash: createHash('sha256').update(`${base}|${n}`).digest('hex'),
    });
  }
  return result;
}
