import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
const directory = mkdtempSync(path.join(tmpdir(), "dnd-companion-test-"));
const filename = path.join(directory, "test.db");
process.env.DATABASE_URL = `file:${filename.replaceAll("\\", "/")}`;
process.env.DATABASE_PROVIDER = "sqlite";
const database = new DatabaseSync(filename);
database.exec("PRAGMA foreign_keys=ON;");
database.exec(
  readFileSync("prisma/migrations/0001_foundation/migration.sql", "utf8"),
);
database.exec(
  readFileSync("prisma/migrations/0002_compendium/migration.sql", "utf8"),
);
database.exec(
  readFileSync("prisma/migrations/0003_characters/migration.sql", "utf8"),
);
database.exec(
  readFileSync("prisma/migrations/0004_campaigns/migration.sql", "utf8"),
);
database.exec(
  readFileSync("prisma/migrations/0005_encounters/migration.sql", "utf8"),
);
database.exec(
  readFileSync("prisma/migrations/0006_collections/migration.sql", "utf8"),
);
database.exec(
  readFileSync("prisma/migrations/0007_lobbies/migration.sql", "utf8"),
);
process.env.DND_HOST_KEY = "test-only-host-key-not-for-production-123456789";
database.exec(
  readFileSync("prisma/migrations/0008_accounts/migration.sql", "utf8"),
);
database.exec(
  readFileSync("prisma/migrations/0009_session_versions/migration.sql", "utf8"),
);
database.exec(
  readFileSync("prisma/migrations/0010_custom_monsters/migration.sql", "utf8"),
);
database.exec(
  readFileSync("prisma/migrations/0011_maps/migration.sql", "utf8"),
);
database.exec(
  readFileSync("prisma/migrations/0012_image_maps/migration.sql", "utf8"),
);
database.exec(
  readFileSync("prisma/migrations/0013_tabletop/migration.sql", "utf8"),
);
database.close();
