#!/usr/bin/env bash
# For isolated test containers only: temporarily renames a table to test readiness.
set -euo pipefail
container=${1:?Isolated test container name required}
origin=${2:?Test HTTP origin required}
docker exec "$container" node --input-type=module -e '
import {mkdirSync,readdirSync} from "node:fs";
import {DatabaseSync} from "node:sqlite";
import {rotateBackup} from "./scripts/backup-rotate.mjs";
import {createBackup,inspectDatabase} from "./scripts/server-backup.mjs";
mkdirSync("/tmp/verify-backups",{recursive:true});
for(let i=0;i<3;i++) await rotateBackup("/data/companion.db","/tmp/verify-backups","scheduled",2);
await rotateBackup("/data/companion.db","/tmp/verify-backups","predeploy",2);
const files=readdirSync("/tmp/verify-backups");
if(files.filter(n=>n.startsWith("scheduled-")&&n.endsWith(".db")).length!==2)throw Error("Retention failed");
const copy=files.find(n=>n.startsWith("predeploy-")&&n.endsWith(".db"));
await createBackup("/tmp/verify-backups/"+copy,"/tmp/restored.db");
inspectDatabase("/tmp/restored.db");
const source=new DatabaseSync("/data/companion.db"), restored=new DatabaseSync("/tmp/restored.db");
for(const table of ["Content","Account","Character","Campaign"]){
 if(source.prepare("SELECT COUNT(*) AS n FROM "+table).get().n!==restored.prepare("SELECT COUNT(*) AS n FROM "+table).get().n)throw Error("Restore mismatch: "+table);
}
restored.close(); source.exec("ALTER TABLE Account RENAME TO AccountUnavailable"); source.close();'
status=$(curl --silent --output /tmp/dnd-readiness.json --write-out '%{http_code}' "$origin/api/health/ready")
docker exec "$container" node --input-type=module -e 'import {DatabaseSync} from "node:sqlite";const db=new DatabaseSync("/data/companion.db");db.exec("ALTER TABLE AccountUnavailable RENAME TO Account");db.close();'
test "$status" = 503
curl --fail --silent "$origin/api/health/ready"
