import { newStemmer } from "snowball-stemmers";
const russian = newStemmer("russian");
const translit: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ъ: "",
  ы: "y",
  ь: "",
  э: "e",
  ю: "yu",
  я: "ya",
};
export const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKC")
    .replace(/ё/g, "е")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
export const transliterate = (value: string) =>
  [...normalize(value)].map((c) => translit[c] ?? c).join("");
export function searchDocument(values: string[]) {
  const normalized = normalize(values.join(" "));
  return `${normalized} ${normalized
    .split(" ")
    .map((v) => russian.stem(v))
    .join(" ")} ${transliterate(normalized)}`;
}
function oneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0,
    j = 0,
    edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length >= b.length) i++;
    if (b.length >= a.length) j++;
  }
  return edits + (i < a.length || j < b.length ? 1 : 0) <= 1;
}
export function searchScore(document: string, query: string): number {
  const tokens = normalize(query).split(" ").filter(Boolean);
  if (!tokens.length) return 1;
  const words = document.split(" ");
  let score = 0;
  for (const token of tokens) {
    const stem = russian.stem(token);
    if (words.includes(token)) score += 10;
    else if (words.includes(stem)) score += 8;
    else if (words.some((w) => w.startsWith(token))) score += 5;
    else if (token.length >= 4 && words.some((w) => oneEdit(w, token)))
      score += 2;
    else return 0;
  }
  return score;
}
