import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { db } from "@/database/client";
import {
  cookieValue,
  digest,
  equalSecret,
  hostKey,
  isHost,
  secretToken,
  SESSION_SECONDS,
} from "@/services/lobby/auth";
export const ACCOUNT_COOKIE = "dnd_account";
export class AuthError extends Error {
  constructor(
    message: string,
    public status = 401,
  ) {
    super(message);
  }
}
export type Identity = {
  id: string | null;
  username: string;
  displayName: string;
  role: string;
};
export async function identity(request: Request): Promise<Identity | null> {
  const token = cookieValue(request, ACCOUNT_COOKIE);
  if (token) {
    if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
    const session = await db.accountSession.findUnique({
      where: { tokenHash: digest(token) },
      include: { account: true },
    });
    if (
      !session ||
      session.expiresAt.getTime() <= Date.now() ||
      session.account.disabled ||
      session.authVersion !== session.account.authVersion
    )
      return null;
    const { id, username, displayName, role } = session.account;
    return { id, username, displayName, role };
  }
  // Legacy local access only until an administrator has claimed the installation.
  if (
    isHost(request) &&
    !(await db.account.count({ where: { role: "admin" } }))
  )
    return {
      id: null,
      username: "local-owner",
      displayName: "Владелец сервера",
      role: "admin",
    };
  return null;
}
export async function requireAccount(request: Request) {
  const user = await identity(request);
  if (!user) throw new AuthError("Войдите в свой аккаунт.");
  return user;
}
export async function requireAdmin(request: Request) {
  const user = await requireAccount(request);
  if (user.role !== "admin")
    throw new AuthError(
      "Управление общей библиотекой доступно администратору.",
      403,
    );
  return user;
}
let activeHashes = 0;
async function derive(password: string, salt: string): Promise<Buffer> {
  if (activeHashes >= 2)
    throw new AuthError(
      "Сервер занят. Повторите вход через несколько секунд.",
      429,
    );
  activeHashes++;
  try {
    return await new Promise<Buffer>((resolve, reject) =>
      scrypt(
        password,
        salt,
        64,
        { N: 131072, r: 8, p: 1, maxmem: 160 * 1024 * 1024 },
        (error, key) => (error ? reject(error) : resolve(key)),
      ),
    );
  } finally {
    activeHashes--;
  }
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt-v1$${salt}$${(await derive(password, salt)).toString("hex")}`;
}
export async function verifyPassword(password: string, encoded?: string) {
  const [version, salt, hash] = (encoded ?? "").split("$");
  const valid =
    version === "scrypt-v1" &&
    /^[a-f0-9]{32}$/.test(salt ?? "") &&
    /^[a-f0-9]{128}$/.test(hash ?? "");
  const actual = await derive(
    password,
    valid ? salt : "00000000000000000000000000000000",
  );
  return (
    timingSafeEqual(
      actual,
      valid ? Buffer.from(hash, "hex") : Buffer.alloc(64),
    ) && valid
  );
}
export async function rateLimit(key: string, max: number, windowMs = 60000) {
  const now = Date.now();
  const bucket = `${digest(key)}:${Math.floor(now / windowMs)}`;
  const row = await db.authLimit.upsert({
    where: { key: bucket },
    create: { key: bucket, count: 1, expiresAt: new Date(now + windowMs * 2) },
    update: { count: { increment: 1 } },
  });
  if (row.count > max)
    throw new AuthError(
      "Слишком много попыток. Подождите и попробуйте позже.",
      429,
    );
  // Expiring buckets keep the limiter bounded across restarts and multiple workers.
  await db.authLimit.deleteMany({
    where: { expiresAt: { lt: new Date(now) } },
  });
}
const username = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9_-]{2,31}$/);
const password = z.string().min(12).max(128);
const command = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("register"),
      username,
      displayName: z.string().trim().min(1).max(80),
      password,
      setupKey: z.string().max(256).optional(),
    })
    .strict(),
  z
    .object({
      action: z.literal("login"),
      username,
      password: z.string().min(1).max(128),
    })
    .strict(),
  z
    .object({
      action: z.literal("recover"),
      username,
      recoveryCode: z.string().max(128),
      password,
    })
    .strict(),
  z
    .object({
      action: z.literal("password"),
      currentPassword: z.string().min(1).max(128),
      password,
    })
    .strict(),
  z.object({ action: z.literal("logout") }).strict(),
  z.object({ action: z.literal("logoutAll") }).strict(),
]);
async function issueSession(
  accountId: string,
  expectedHash: string,
  previousToken: string,
) {
  const token = secretToken();
  await db.$transaction(async (tx) => {
    const account = await tx.account.findUnique({ where: { id: accountId } });
    if (!account || account.disabled || account.passwordHash !== expectedHash)
      throw new AuthError("Повторите вход.");
    await tx.accountSession.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          { tokenHash: digest(previousToken) },
        ],
      },
    });
    const sessions = await tx.accountSession.findMany({
      where: { accountId },
      orderBy: { createdAt: "desc" },
      skip: 19,
    });
    await tx.accountSession.deleteMany({
      where: { id: { in: sessions.map((s) => s.id) } },
    });
    await tx.accountSession.create({
      data: {
        accountId,
        authVersion: account.authVersion,
        tokenHash: digest(token),
        expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000),
      },
    });
  });
  return token;
}
export async function accountCommand(request: Request, input: unknown) {
  const b = command.parse(input);
  const oldToken = cookieValue(request, ACCOUNT_COOKIE);
  if (b.action === "logout") {
    await db.accountSession.deleteMany({
      where: { tokenHash: digest(oldToken) },
    });
    return { logout: true };
  }
  if (b.action === "logoutAll") {
    const user = await requireAccount(request);
    if (user.id)
      await db.$transaction([
        db.account.update({
          where: { id: user.id },
          data: { authVersion: { increment: 1 } },
        }),
        db.accountSession.deleteMany({ where: { accountId: user.id } }),
      ]);
    return { logout: true };
  }
  await rateLimit("auth-global", 120);
  const loginName =
    "username" in b ? b.username : (await requireAccount(request)).username;
  await rateLimit(`auth-name:${loginName}`, 12, 15 * 60000);
  if (b.action === "register") {
    if (process.env.DND_REGISTRATION === "closed" && !b.setupKey)
      throw new AuthError("Регистрация временно закрыта.", 403);
    if (b.setupKey && !equalSecret(b.setupKey.trim(), hostKey()))
      throw new AuthError("Неверный ключ первоначальной настройки.");
    const passwordHash = await hashPassword(b.password),
      recoveryCode = secretToken();
    let account;
    try {
      account = await db.$transaction(async (tx) => {
        // A unique bootstrap marker makes simultaneous administrator claims atomic.
        if (b.setupKey) {
          await tx.authLimit.create({
            data: {
              key: "installation-admin-claimed",
              count: 1,
              expiresAt: new Date("9999-01-01"),
            },
          });
        }
        const user = await tx.account.create({
          data: {
            username: b.username,
            displayName: b.displayName,
            passwordHash,
            recoveryHash: digest(recoveryCode),
            role: b.setupKey ? "admin" : "user",
          },
        });
        if (b.setupKey) {
          await tx.imageMap.updateMany({
            where: { ownerId: null },
            data: { ownerId: user.id },
          });
          await tx.adventureMap.updateMany({
            where: { ownerId: null },
            data: { ownerId: user.id },
          });
          await tx.customMonster.updateMany({
            where: { ownerId: null },
            data: { ownerId: user.id },
          });
          await tx.character.updateMany({
            where: { ownerId: null },
            data: { ownerId: user.id },
          });
          await tx.campaign.updateMany({
            where: { ownerId: null },
            data: { ownerId: user.id },
          });
          await tx.encounter.updateMany({
            where: { ownerId: null },
            data: { ownerId: user.id },
          });
          await tx.collection.updateMany({
            where: { ownerId: null },
            data: { ownerId: user.id },
          });
          await tx.lobby.updateMany({
            where: { ownerId: null },
            data: { ownerId: user.id },
          });
        }
        return user;
      });
    } catch (e) {
      if ((e as { code?: string }).code === "P2002")
        throw new AuthError(
          "Логин занят или первоначальная настройка уже выполнена.",
          409,
        );
      throw e;
    }
    return {
      token: await issueSession(account.id, passwordHash, oldToken),
      recoveryCode,
    };
  }
  const account = await db.account.findUnique({
    where: { username: loginName },
  });
  if (b.action === "login") {
    const valid = await verifyPassword(b.password, account?.passwordHash);
    if (!valid || !account || account.disabled)
      throw new AuthError("Неверный логин или пароль.");
    return {
      token: await issueSession(account.id, account.passwordHash, oldToken),
    };
  }
  if (!account || account.disabled)
    throw new AuthError("Не удалось подтвердить доступ.");
  if (
    b.action === "password" &&
    !(await verifyPassword(b.currentPassword, account.passwordHash))
  )
    throw new AuthError("Неверный текущий пароль.");
  if (
    b.action === "recover" &&
    !equalSecret(digest(b.recoveryCode.trim()), account.recoveryHash)
  )
    throw new AuthError("Не удалось подтвердить доступ.");
  const passwordHash = await hashPassword(b.password),
    recoveryCode = secretToken();
  await db.$transaction(async (tx) => {
    const changed = await tx.account.updateMany({
      where: {
        id: account.id,
        passwordHash: account.passwordHash,
        recoveryHash: account.recoveryHash,
        disabled: false,
      },
      data: {
        passwordHash,
        recoveryHash: digest(recoveryCode),
        authVersion: { increment: 1 },
      },
    });
    if (changed.count !== 1)
      throw new AuthError("Данные изменились. Повторите вход.");
    await tx.accountSession.deleteMany({ where: { accountId: account.id } });
  });
  return {
    token: await issueSession(account.id, passwordHash, oldToken),
    recoveryCode,
  };
}
