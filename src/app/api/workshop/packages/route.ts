import { requireAdmin } from "@/services/accounts/service";
import { z } from "zod";
import { authorDataset } from "@/services/workshop";
import {
  csvToDataset,
  datasetToCsv,
  packDataset,
  unpackDataset,
  manifestSchema,
} from "@/imports/packages";
import {
  parseDataset,
  importDataset,
  validateAgainstDatabase,
  DatasetError,
} from "@/imports/pipeline";
import { readBody, errorResponse } from "@/shared/http";
import { db } from "@/database/client";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  try {
    await requireAdmin(req);
    const input = z
      .object({
        action: z.enum(["export", "validate", "import"]),
        format: z.enum(["json", "csv", "dndpack"]),
        payload: z.string().optional(),
        manifest: manifestSchema.optional(),
        ids: z.array(z.string().uuid()).max(10000).optional(),
      })
      .strict()
      .parse(JSON.parse(await readBody(req)));
    if (input.action === "export") {
      const data = await authorDataset(input.ids);
      const dependencies = [
        ...new Set(
          data.entries.flatMap((e) =>
            e.kind === "Reference" &&
            e.reference.parentId &&
            !data.entries.some((x) => x.id === e.reference.parentId)
              ? [e.reference.parentId]
              : [],
          ),
        ),
      ];
      const manifest = {
        ...(input.manifest ?? {
          name: "Авторские материалы",
          author: "",
          version: "1.0.0",
          description: "",
          edition: "Mixed" as const,
          dependencies: [],
        }),
        dependencies,
      };
      if (
        manifest.edition !== "Mixed" &&
        data.entries.some((e) => e.edition !== manifest.edition)
      )
        throw new DatasetError([
          {
            path: "edition",
            message: "В наборе несколько редакций. Выберите смешанный пакет.",
          },
        ]);
      const bytes =
        input.format === "dndpack"
          ? packDataset(data, manifest)
          : Buffer.from(
              input.format === "csv"
                ? datasetToCsv(data)
                : JSON.stringify(data, null, 2),
            );
      return new Response(new Uint8Array(bytes), {
        headers: {
          "Content-Type":
            input.format === "dndpack"
              ? "application/zip"
              : "text/plain;charset=utf-8",
          "Content-Disposition": `attachment; filename="homebrew.${input.format}"`,
        },
      });
    }
    let data;
    let dependencies: string[] = [];
    if (input.format === "dndpack") {
      const unpacked = unpackDataset(
        Buffer.from(input.payload ?? "", "base64"),
      );
      data = unpacked.data;
      dependencies = unpacked.manifest.dependencies;
    } else
      data =
        input.format === "csv"
          ? csvToDataset(input.payload ?? "")
          : parseDataset(input.payload ?? "");
    if (
      data.entries.some((e) => e.contentOrigin !== "Homebrew") ||
      data.sources.some((s) => s.contentType !== "Homebrew") ||
      data.terms.length ||
      data.relations.length
    )
      throw new DatasetError([
        {
          path: "package",
          message:
            "Мастерская принимает только авторские карточки и источники без изменений словаря и связей. Другие наборы проверяйте в менеджере данных.",
        },
      ]);
    if (
      (await db.content.count({ where: { id: { in: dependencies } } })) !==
      dependencies.length
    )
      throw new DatasetError([
        {
          path: "dependencies",
          message: "Не установлены необходимые карточки пакета.",
        },
      ]);
    return Response.json(
      input.action === "validate"
        ? await validateAgainstDatabase(data)
        : await importDataset(data),
    );
  } catch (e) {
    if (e instanceof SyntaxError)
      return Response.json({ error: "Некорректный JSON." }, { status: 400 });
    return errorResponse(e);
  }
}
