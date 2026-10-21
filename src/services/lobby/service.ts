import { tabletopSchema } from "@/entities/tabletop";
import {
  identity,
  requireAccount,
  rateLimit,
} from "@/services/accounts/service";
import { z } from "zod";
import { db } from "@/database/client";
import { contentInclude, toContent, json } from "@/database/repository";
import { characterSchema } from "@/entities/character";
import { campaignSchema } from "@/entities/campaign";
import {
  lobbySettings,
  type LobbySettings,
  type LobbyView,
} from "@/entities/lobby";
import {
  cookieValue,
  digest,
  PLAYER_COOKIE,
  secretToken,
  SESSION_SECONDS,
} from "./auth";
export class LobbyError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
async function validateSettings(data: LobbySettings, ownerId: string | null) {
  if (
    (await db.character.count({
      where: { id: { in: data.characterIds }, archived: false, ownerId },
    })) !== data.characterIds.length
  )
    throw new LobbyError(
      "Один из персонажей отсутствует или находится в архиве.",
    );
  if (
    data.campaignId &&
    !(await db.campaign.findFirst({
      where: { id: data.campaignId, archived: false, ownerId },
    }))
  )
    throw new LobbyError("Кампания не найдена.");
}
export async function lobbyIndex(request: Request) {
  const user = await requireAccount(request);
  const ownerId = user.id;
  const [lobbies, characters, campaigns] = await Promise.all([
    db.lobby.findMany({
      where: {
        OR: [
          { ownerId },
          ...(ownerId
            ? [
                {
                  closed: false,
                  members: {
                    some: {
                      accountId: ownerId,
                      revoked: false,
                      expiresAt: { gt: new Date() },
                    },
                  },
                },
              ]
            : []),
        ],
      },
      select: { id: true, name: true, closed: true },
      orderBy: { createdAt: "desc" },
    }),
    db.character.findMany({
      where: { archived: false, ownerId },
      select: { id: true, name: true, edition: true },
      orderBy: { name: "asc" },
    }),
    db.campaign.findMany({
      where: { archived: false, ownerId },
      orderBy: { name: "asc" },
    }),
  ]);
  return {
    lobbies,
    characters,
    campaigns: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      characterIds: campaignSchema.parse(c.data).characterIds,
    })),
  };
}
export async function lobbyView(
  request: Request,
  requestedId?: string,
): Promise<LobbyView> {
  const user = await identity(request);
  const cookieMember = await db.lobbyMember.findUnique({
    where: { tokenHash: digest(cookieValue(request, PLAYER_COOKIE)) },
  });
  const id = requestedId ?? cookieMember?.lobbyId;
  if (!id) throw new LobbyError("Войдите по приглашению в лобби.", 401);
  const lobby = await db.lobby.findUnique({ where: { id } });
  if (!lobby) throw new LobbyError("Лобби закрыто или недоступно.", 404);
  const host = Boolean(user && user.id === lobby.ownerId);
  const member = user?.id
    ? await db.lobbyMember.findUnique({
        where: { lobbyId_accountId: { lobbyId: id, accountId: user.id } },
      })
    : cookieMember?.accountId
      ? null
      : cookieMember;
  if (
    !host &&
    (!member ||
      member.lobbyId !== id ||
      member.revoked ||
      member.expiresAt.getTime() <= Date.now())
  )
    throw new LobbyError("Нет доступа к этому лобби.", 403);
  if (lobby.closed && !host)
    throw new LobbyError("Лобби закрыто или недоступно.", 404);
  const ids = z.array(z.string()).parse(lobby.characterIds);
  const characters = (
    await db.character.findMany({
      where: { id: { in: ids }, archived: false, ownerId: lobby.ownerId },
    })
  ).map((c) => ({
    id: c.id,
    version: c.version,
    data: characterSchema.parse(c.data),
  }));
  const contentIds = new Set<string>();
  for (const { data: c } of characters) {
    [
      c.speciesRaceId,
      c.backgroundId,
      ...c.featIds,
      ...c.conditionIds,
      ...(c.concentrationId ? [c.concentrationId] : []),
      ...c.classes.flatMap((x) => [
        x.classId,
        ...(x.subclassId ? [x.subclassId] : []),
      ]),
      ...c.spells.map((s) => s.spellId),
      ...c.inventory.map((i) => i.contentId),
    ].forEach((id) => contentIds.add(id));
  }
  const [content, participants] = await Promise.all([
    db.content.findMany({
      where: { id: { in: [...contentIds] } },
      include: contentInclude,
    }),
    db.lobbyMember.findMany({
      where: { lobbyId: id, revoked: false, expiresAt: { gt: new Date() } },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const result: LobbyView = {
    id: lobby.id,
    name: lobby.name,
    version: lobby.version,
    role: host ? "Мастер" : "Игрок",
    memberName: host ? user!.displayName : member!.name,
    characters,
    content: content.map(toContent),
    participants,
    tabletop: (() => {
      const data = tabletopSchema.parse(lobby.tabletop);
      return {
        ...data,
        handouts: data.handouts.filter((h) => host || h.published),
      };
    })(),
  };
  // Do not fetch or serialize campaign data for players, including hidden entry fields.
  if (host) {
    const campaign = lobby.campaignId
      ? await db.campaign.findUnique({
          where: { id: lobby.campaignId, ownerId: lobby.ownerId },
        })
      : null;
    result.master = {
      settings: {
        name: lobby.name,
        campaignId: lobby.campaignId,
        characterIds: ids,
        notes: lobby.notes,
      },
      campaign: campaign ? campaignSchema.parse(campaign.data) : null,
    };
  }
  return result;
}
const command = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), data: lobbySettings }).strict(),
  z
    .object({
      action: z.literal("save"),
      id: z.string().uuid(),
      version: z.number().int().positive(),
      data: lobbySettings,
    })
    .strict(),
  z.object({ action: z.literal("invite"), id: z.string().uuid() }).strict(),
  z
    .object({
      action: z.literal("close"),
      id: z.string().uuid(),
      closed: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("kick"),
      id: z.string().uuid(),
      memberId: z.string().uuid(),
    })
    .strict(),
  z
    .object({
      action: z.literal("join"),
      invite: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
      name: z.string().trim().min(1).max(80),
    })
    .strict(),
  z
    .object({ action: z.literal("leave"), id: z.string().uuid().optional() })
    .strict(),
]);
export async function lobbyCommand(request: Request, input: unknown) {
  const b = command.parse(input);
  if (b.action === "join") {
    await rateLimit("lobby-joins", 120);
    const user = await identity(request);
    const lobby = await db.lobby.findUnique({
      where: { inviteHash: digest(b.invite) },
    });
    if (!lobby || lobby.closed)
      throw new LobbyError(
        "Приглашение недействительно или лобби закрыто.",
        404,
      );
    const token = secretToken();
    const data = {
      lobbyId: lobby.id,
      accountId: user?.id ?? null,
      name: user?.displayName ?? b.name,
      tokenHash: digest(token),
      expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000),
      revoked: false,
    };
    if (user?.id)
      await db.lobbyMember.upsert({
        where: { lobbyId_accountId: { lobbyId: lobby.id, accountId: user.id } },
        create: data,
        update: data,
      });
    else await db.lobbyMember.create({ data });
    return { id: lobby.id, token };
  }
  if (b.action === "leave") {
    const user = await identity(request);
    await db.lobbyMember.updateMany({
      where: user?.id
        ? { accountId: user.id, lobbyId: b.id ?? "" }
        : {
            accountId: null,
            tokenHash: digest(cookieValue(request, PLAYER_COOKIE)),
          },
      data: { revoked: true },
    });
    return { ok: true };
  }
  const user = await requireAccount(request);
  const ownerId = user.id;
  if (b.action === "create") {
    await validateSettings(b.data, ownerId);
    const invite = secretToken();
    const lobby = await db.lobby.create({
      data: {
        ...b.data,
        ownerId,
        characterIds: json(b.data.characterIds),
        inviteHash: digest(invite),
      },
    });
    return { id: lobby.id, invite };
  }
  const lobby = await db.lobby.findUnique({ where: { id: b.id, ownerId } });
  if (!lobby) throw new LobbyError("Лобби не найдено.", 404);
  if (b.action === "save") {
    await validateSettings(b.data, ownerId);
    const saved = await db.lobby.updateMany({
      where: { id: b.id, version: b.version, ownerId },
      data: {
        ...b.data,
        characterIds: json(b.data.characterIds),
        version: { increment: 1 },
      },
    });
    if (!saved.count)
      throw new LobbyError(
        "Лобби уже изменено. Обновите данные перед сохранением.",
        409,
      );
  } else if (b.action === "invite") {
    const invite = secretToken();
    await db.lobby.update({
      where: { id: b.id, ownerId },
      data: { inviteHash: digest(invite) },
    });
    return { id: b.id, invite };
  } else if (b.action === "close") {
    await db.lobby.update({
      where: { id: b.id, ownerId },
      data: { closed: b.closed, version: { increment: 1 } },
    });
  } else if (b.action === "kick") {
    await db.lobbyMember.updateMany({
      where: { id: b.memberId, lobbyId: b.id },
      data: { revoked: true },
    });
    // Rotate invitations as well so the removed player cannot reuse their old link.
    await db.lobby.update({
      where: { id: b.id, ownerId },
      data: { inviteHash: digest(secretToken()) },
    });
  }
  return { id: b.id };
}
