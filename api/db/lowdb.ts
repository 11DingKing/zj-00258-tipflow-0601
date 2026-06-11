import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import type { Clue, Team, User, OperationLog } from "../../shared/types";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dataDir = path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export interface DatabaseSchema {
  clues: Clue[];
  teams: Team[];
  users: User[];
  operations: OperationLog[];
}

const defaultData: DatabaseSchema = {
  clues: [],
  teams: [],
  users: [],
  operations: [],
};

const file = path.join(dataDir, "db.json");
const adapter = new JSONFile<DatabaseSchema>(file);
export const db = new Low<DatabaseSchema>(adapter, defaultData);

export async function initDb() {
  await db.read();
  return db;
}

export function dbInstance() {
  return db;
}
