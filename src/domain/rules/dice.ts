export type DiceMode = "normal" | "advantage" | "disadvantage" | "critical";
export function parseDice(input: string, mode: DiceMode = "normal") {
  const match = input
    .toLowerCase()
    .replace(/к/g, "d")
    .replace(/\s/g, "")
    .match(/^(\d{0,3})d(4|6|8|10|12|20|100)(kh1|kl1)?([+-]\d{1,5})?$/);
  if (!match) throw new Error("Формат: 1d20+5, 2d6+3, 2d20kh1 или 2d20kl1.");
  let count = Number(match[1] || 1);
  const sides = Number(match[2]),
    modifier = Number(match[4] || 0);
  let keep = match[3] || "";
  if (count < 1 || count > 100)
    throw new Error("Можно бросить от 1 до 100 кубов.");
  if (mode === "advantage" || mode === "disadvantage") {
    if (sides !== 20 || count !== 1 || keep)
      throw new Error(
        "Для преимущества или помехи введите 1d20 с модификатором.",
      );
    count = 2;
    keep = mode === "advantage" ? "kh1" : "kl1";
  }
  if (mode === "critical") {
    if (sides === 20 || keep)
      throw new Error("Критический урон удваивает кубы урона, а не к20.");
    count *= 2;
    if (count > 100)
      throw new Error("После удвоения допускается до 100 кубов.");
  }
  return { count, sides, keep, modifier };
}
export function randomDie(sides: number) {
  const bound = Math.floor(2 ** 32 / sides) * sides,
    buffer = new Uint32Array(1);
  let value: number;
  do {
    crypto.getRandomValues(buffer);
    value = buffer[0];
  } while (value >= bound);
  return (value % sides) + 1;
}
export function rollDice(
  input: string,
  mode: DiceMode = "normal",
  die: (sides: number) => number = randomDie,
) {
  const parsed = parseDice(input, mode);
  const rolls = Array.from({ length: parsed.count }, () => die(parsed.sides));
  if (rolls.some((n) => !Number.isInteger(n) || n < 1 || n > parsed.sides))
    throw new Error("Неверный результат кубика.");
  const kept =
    parsed.keep === "kh1"
      ? [Math.max(...rolls)]
      : parsed.keep === "kl1"
        ? [Math.min(...rolls)]
        : rolls;
  return {
    ...parsed,
    rolls,
    kept,
    total: kept.reduce((sum, n) => sum + n, 0) + parsed.modifier,
  };
}
