import { randomUUID } from "node:crypto";
import { db } from "@/database/client";
import { json } from "@/database/repository";
import {
  tabletopCommandSchema,
  tabletopSchema,
  treasuryBalances,
} from "@/entities/tabletop";
import { lobbyView, LobbyError } from "./service";

export async function tabletopCommand(request: Request, input: unknown) {
  const b = tabletopCommandSchema.parse(input);
  const view = await lobbyView(request, b.id);
  const host = view.role === "Мастер";
  if (!host && b.operation.type !== "journal")
    throw new LobbyError("Это действие доступно только мастеру.", 403);
  const row = await db.lobby.findUniqueOrThrow({ where: { id: b.id } });
  if (row.closed)
    throw new LobbyError("Лобби закрыто. Откройте его перед изменением.", 409);
  if (row.version !== b.version)
    throw new LobbyError(
      "Данные изменились. Обновите лобби и повторите сохранение.",
      409,
    );
  const data = tabletopSchema.parse(row.tabletop);
  const op = b.operation;
  const stamp = {
    id: randomUUID(),
    author: view.memberName,
    at: new Date().toISOString(),
  };
  if (op.type === "handout") {
    if (
      op.data.imageMapId &&
      !(await db.imageMap.findFirst({
        where: {
          id: op.data.imageMapId,
          ownerId: row.ownerId,
          archived: false,
        },
        select: { id: true },
      }))
    )
      throw new LobbyError("Изображение недоступно.", 400);
    const at = data.handouts.findIndex((h) => h.id === op.data.id);
    if (at < 0) data.handouts.push(op.data);
    else data.handouts[at] = op.data;
  } else if (op.type === "journal")
    data.journal.push({ ...stamp, text: op.text });
  else {
    data.ledger.push({
      ...stamp,
      item: op.item,
      delta: op.delta,
      reason: op.reason,
      recipient: op.recipient,
    });
    if (treasuryBalances(data.ledger).some((v) => v.quantity < 0))
      throw new LobbyError("В казне недостаточно денег или предметов.");
  }
  tabletopSchema.parse(data);
  const saved = await db.lobby.updateMany({
    where: { id: b.id, version: b.version, closed: false },
    data: { tabletop: json(data), version: { increment: 1 } },
  });
  if (!saved.count)
    throw new LobbyError(
      "Данные изменились. Обновите лобби и повторите сохранение.",
      409,
    );
  return { id: b.id };
}

export async function handoutImage(
  request: Request,
  lobbyId: string,
  handoutId: string,
) {
  const view = await lobbyView(request, lobbyId);
  const h = view.tabletop.handouts.find((h) => h.id === handoutId);
  if (!h?.imageMapId)
    throw new LobbyError("Изображение не опубликовано или недоступно.", 404);
  const lobby = await db.lobby.findUniqueOrThrow({ where: { id: lobbyId } });
  const image = await db.imageMap.findFirst({
    where: { id: h.imageMapId, ownerId: lobby.ownerId, archived: false },
    select: { image: true },
  });
  if (!image) throw new LobbyError("Изображение недоступно.", 404);
  return new Response(new Uint8Array(image.image), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
