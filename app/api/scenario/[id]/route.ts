import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import yaml from "js-yaml";

export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9-]+$/.test(id)) {
    return NextResponse.json({ error: "invalid scenario id" }, { status: 400 });
  }
  const path = resolve(process.cwd(), "configs/scenarios", `${id}.yaml`);
  const raw = await readFile(path, "utf8");
  return NextResponse.json(yaml.load(raw));
}
