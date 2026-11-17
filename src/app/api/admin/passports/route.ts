import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { Passport } from "@/models/passport";
import { ruta } from "@/lib/api";

export const GET = ruta(async (req: NextRequest) => {
  await requireAuth(["admin"]);
  const { searchParams } = new URL(req.url);
  const role = searchParams.get("role");
  const manual = searchParams.get("manual");

  await connectDB();
  const filter: Record<string, unknown> = {};
  if (role && role !== "all") filter.role = role;
  if (manual === "true") filter.isManual = true;

  const passports = await Passport.find(filter)
    .select("-viewPin")
    .sort({ lastName: 1, firstName: 1 })
    .lean();

  return Response.json({ passports });
});
