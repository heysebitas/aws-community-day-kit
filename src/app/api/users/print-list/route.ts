import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { User } from "@/models/user";
import { ruta } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = ruta(async () => {
  await requireAccess("print", "ver", ["admin", "organizer", "volunteer"]);

  await connectDB();
  const users = await User.find({ role: { $in: ["admin", "organizer"] } })
    .select("name role")
    .sort({ name: 1 })
    .lean();

  const organizers = users.map((u) => ({
    id: String(u._id),
    name: u.name,
    role: u.role,
  }));

  return NextResponse.json({ organizers });
});
