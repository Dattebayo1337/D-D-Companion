import type { BattleData, Combatant } from "@/entities/battle";
export function startBattle(b: BattleData): BattleData {
  if (!b.participants.length) throw new Error("Добавьте участников боя.");
  return {
    ...b,
    status: "running",
    round: 1,
    turn: 0,
    participants: [...b.participants].sort(
      (a, c) => c.initiative - a.initiative,
    ),
  };
}
export function moveTurn(
  b: BattleData,
  step: "next" | "previous" | "round",
): BattleData {
  if (b.status !== "running" || !b.participants.length)
    throw new Error("Сначала начните бой.");
  let { round, turn } = b;
  if (step === "round") {
    round++;
    turn = 0;
  } else if (step === "next") {
    turn++;
    if (turn >= b.participants.length) {
      turn = 0;
      round++;
    }
  } else if (turn > 0) turn--;
  else if (round > 1) {
    round--;
    turn = b.participants.length - 1;
  }
  return { ...b, round, turn };
}
export function combatDamage(
  p: Combatant,
  amount: number,
  critical = false,
): Combatant {
  if (!Number.isInteger(amount) || amount < 0)
    throw new Error("Неверный урон.");
  if (!amount) return { ...p };
  if (p.concentration && p.concentrationDC !== null)
    throw new Error("Сначала разрешите предыдущую проверку концентрации.");
  const q = { ...p },
    unabsorbed = Math.max(0, amount - p.tempHp);
  q.tempHp = Math.max(0, p.tempHp - amount);
  q.hp = Math.max(0, p.hp - unabsorbed);
  if (p.concentration)
    q.concentrationDC = Math.max(
      p.concentrationDC ?? 10,
      Math.min(
        p.edition === "5e_2024" ? 30 : 1000000,
        Math.max(10, Math.floor(amount / 2)),
      ),
    );
  if (p.deathState === "dead") return q;
  if (q.hp === 0) {
    q.concentration = "";
    q.concentrationDC = null;
    if (!p.deathSaves || unabsorbed - p.hp >= p.maxHp) {
      q.deathState = "dead";
      q.failure = 3;
    } else {
      q.deathState = "dying";
      if (p.hp === 0) {
        q.failure = Math.min(3, p.failure + (critical ? 2 : 1));
        if (q.failure === 3) q.deathState = "dead";
      }
    }
  }
  return q;
}
export function combatHeal(p: Combatant, amount: number): Combatant {
  if (!Number.isInteger(amount) || amount < 0)
    throw new Error("Неверное лечение.");
  if (p.deathState === "dead")
    throw new Error("Для погибшего используйте воскрешение или ручную правку.");
  const hp = Math.min(p.maxHp, p.hp + amount);
  return {
    ...p,
    hp,
    ...(hp > 0 ? { deathState: "alive" as const, success: 0, failure: 0 } : {}),
  };
}
export function deathSave(p: Combatant, roll: number): Combatant {
  if (!p.deathSaves || p.hp !== 0 || p.deathState !== "dying")
    throw new Error("Спасбросок нужен только умирающему участнику.");
  if (!Number.isInteger(roll) || roll < 1 || roll > 20)
    throw new Error("Неверный бросок к20.");
  if (roll === 20)
    return { ...p, hp: 1, deathState: "alive", success: 0, failure: 0 };
  const q = { ...p };
  if (roll === 1) q.failure = Math.min(3, q.failure + 2);
  else if (roll >= 10) q.success++;
  else q.failure++;
  if (q.failure >= 3) q.deathState = "dead";
  else if (q.success >= 3) {
    q.deathState = "stable";
    q.success = 0;
    q.failure = 0;
  }
  return q;
}
