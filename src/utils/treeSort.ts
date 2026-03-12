import type { TreeNode } from '../types/TreeNode';

function normalizeCode(code?: string | null): string {
  return (code ?? '').trim();
}

function compareText(a: string, b: string): number {
  return a.localeCompare(b, undefined, {
    numeric: true,
    sensitivity: 'base',
  });
}

function compareDefaultNodeOrder(a: TreeNode, b: TreeNode): number {
  const sortOrderDiff = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
  if (sortOrderDiff !== 0) {
    return sortOrderDiff;
  }

  const nameDiff = compareText(a.name, b.name);
  if (nameDiff !== 0) {
    return nameDiff;
  }

  return compareText(normalizeCode(a.code), normalizeCode(b.code));
}

function parseLevel2Code(code: string) {
  const normalized = normalizeCode(code).toUpperCase();
  const digitsMatch = normalized.match(/\d+/);

  return {
    number: digitsMatch ? Number.parseInt(digitsMatch[0], 10) : Number.MAX_SAFE_INTEGER,
    letters: normalized.replace(/\d+/g, ''),
    raw: normalized,
  };
}

function parseNumericCode(code: string) {
  const normalized = normalizeCode(code);
  const parsed = Number.parseInt(normalized, 10);

  return {
    number: Number.isNaN(parsed) ? Number.MAX_SAFE_INTEGER : parsed,
    raw: normalized,
  };
}

function parseLevel5Code(code: string) {
  const normalized = normalizeCode(code).toUpperCase();
  const [system = '', discipline = '', sequencePart = ''] = normalized.split('-');
  const sequenceMatch = sequencePart.match(/\d+/);

  return {
    system,
    discipline,
    sequence: sequenceMatch ? Number.parseInt(sequenceMatch[0], 10) : Number.MAX_SAFE_INTEGER,
    raw: normalized,
  };
}

function compareLevelSpecificCode(level: number, aCode: string, bCode: string): number {
  if (level === 1) {
    const aEmpty = aCode.length === 0;
    const bEmpty = bCode.length === 0;

    if (aEmpty && !bEmpty) return 1;
    if (!aEmpty && bEmpty) return -1;
    return compareText(aCode, bCode);
  }

  if (level === 2) {
    const parsedA = parseLevel2Code(aCode);
    const parsedB = parseLevel2Code(bCode);

    if (parsedA.number !== parsedB.number) {
      return parsedA.number - parsedB.number;
    }

    const letterDiff = compareText(parsedA.letters, parsedB.letters);
    if (letterDiff !== 0) {
      return letterDiff;
    }

    return compareText(parsedA.raw, parsedB.raw);
  }

  if (level === 3 || level === 4) {
    const parsedA = parseNumericCode(aCode);
    const parsedB = parseNumericCode(bCode);

    if (parsedA.number !== parsedB.number) {
      return parsedA.number - parsedB.number;
    }

    return compareText(parsedA.raw, parsedB.raw);
  }

  if (level === 5) {
    const parsedA = parseLevel5Code(aCode);
    const parsedB = parseLevel5Code(bCode);

    if (parsedA.sequence !== parsedB.sequence) {
      return parsedA.sequence - parsedB.sequence;
    }

    const disciplineDiff = compareText(parsedA.discipline, parsedB.discipline);
    if (disciplineDiff !== 0) {
      return disciplineDiff;
    }

    const systemDiff = compareText(parsedA.system, parsedB.system);
    if (systemDiff !== 0) {
      return systemDiff;
    }

    return compareText(parsedA.raw, parsedB.raw);
  }

  return compareText(aCode, bCode);
}

export function compareTreeNodes(a: TreeNode, b: TreeNode): number {
  if (a.level !== b.level) {
    return a.level - b.level;
  }

  if (a.level >= 1 && a.level <= 5) {
    const codeDiff = compareLevelSpecificCode(a.level, normalizeCode(a.code), normalizeCode(b.code));
    if (codeDiff !== 0) {
      return codeDiff;
    }
  }

  return compareDefaultNodeOrder(a, b);
}
