// @ts-nocheck
import { DurableObject } from "cloudflare:workers";

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS cv_document (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    payload_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

const parseJson = (value: string) => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

export class CVStoreDurableObject extends DurableObject {
  initialized = false;

  ensureSchema() {
    if (this.initialized) {
      return;
    }

    this.ctx.storage.sql.exec(CREATE_TABLE_SQL);
    this.initialized = true;
  }

  readDocument() {
    this.ensureSchema();

    const rows = Array.from(
      this.ctx.storage.sql.exec(
        "SELECT payload_json, created_at, updated_at FROM cv_document WHERE id = 1"
      )
    );
    const row = rows[0];

    if (!row) {
      return null;
    }

    return {
      cvData: parseJson(row.payload_json),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  saveDocument(cvData: unknown) {
    this.ensureSchema();

    const current = this.readDocument();
    const createdAt = current?.createdAt || new Date().toISOString();
    const updatedAt = new Date().toISOString();

    this.ctx.storage.sql.exec(
      `
        INSERT INTO cv_document (id, payload_json, created_at, updated_at)
        VALUES (1, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          payload_json = excluded.payload_json,
          updated_at = excluded.updated_at
      `,
      JSON.stringify(cvData ?? {}),
      createdAt,
      updatedAt
    );

    return {
      cvData,
      createdAt,
      updatedAt,
    };
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/get") {
      const document = this.readDocument();
      if (!document) {
        return Response.json({ error: "CV not found" }, { status: 404 });
      }

      return Response.json(document);
    }

    if (request.method === "POST" && url.pathname === "/save") {
      const payload = await request.json().catch(() => null);
      if (!payload || typeof payload !== "object") {
        return Response.json({ error: "Invalid CV payload" }, { status: 400 });
      }

      const saved = this.saveDocument(payload.cvData ?? {});
      return Response.json(saved);
    }

    return Response.json({ error: "Route not found" }, { status: 404 });
  }
}
