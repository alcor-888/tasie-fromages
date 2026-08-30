export const MONEY_TOLERANCE = 0.01;

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export type TotalCheckItem = {
  unitPrice: number;
  quantity: number;
};

/** Total de référence : somme des lignes (prix pièce × quantité), arrondi au centime. */
export function computeItemsTotal(items: TotalCheckItem[]): number {
  return roundMoney(
    items.reduce((sum, i) => sum + roundMoney(i.unitPrice * i.quantity), 0),
  );
}

export type TotalCheck = {
  ok: boolean;
  expected: number;
  actual: number;
  diff: number;
};

/** Vérifie que deux totaux concordent à un centime près. */
export function checkTotals(expected: number, actual: number): TotalCheck {
  const e = roundMoney(expected);
  const a = roundMoney(actual);
  const diff = roundMoney(a - e);
  return { ok: Math.abs(diff) <= MONEY_TOLERANCE, expected: e, actual: a, diff };
}
