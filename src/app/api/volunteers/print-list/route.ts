import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { VolunteerSubmission } from "@/models/volunteer-submission";
import { ruta } from "@/lib/api";

export const dynamic = "force-dynamic";

export const GET = ruta(async () => {
  await requireAccess("volunteers", "ver", ["admin", "organizer", "volunteer"]);

  await connectDB();
  const submissions = await VolunteerSubmission.find({ approved: true })
    .select("firstName lastName")
    .lean();

  const volunteers = submissions
    .map((s) => ({
      id: String(s._id),
      firstName: s.firstName ?? "",
      lastName: s.lastName ?? "",
    }))
    .filter((v) => v.firstName);

  volunteers.sort((a, b) => a.firstName.localeCompare(b.firstName, "es"));

  return NextResponse.json({ volunteers });
});
