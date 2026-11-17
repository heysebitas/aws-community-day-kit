import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { FAQ } from "@/models/faq";
import { getActiveFaqs } from "@/lib/data/faq";
import { revalidatePublic, FAQ_TAG } from "@/lib/data/revalidate";
import { createLog } from "@/lib/log";
import { ruta } from "@/lib/api";

export const GET = ruta(async (request: NextRequest) => {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all");

  if (all === "true") {
    await requireAccess("faq", "ver", ["admin", "organizer"]);
    await connectDB();
    const faqs = await FAQ.find({}).sort({ order: 1 });
    return Response.json({ faqs });
  }

  const faqs = await getActiveFaqs();
  return Response.json({ faqs }, { headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" } });
});

export const POST = ruta(async (request: NextRequest) => {
  const user = await requireAccess("faq", "editar", ["admin", "organizer"]);
  await connectDB();

  const body = await request.json();
  const { questionEs, answerEs, questionEn, answerEn, order, isActive, buttons } = body;

  if (!questionEs || !answerEs || !questionEn || !answerEn) {
    return Response.json({ error: "Todos los campos son requeridos" }, { status: 400 });
  }

  const faq = await FAQ.create({
    questionEs,
    answerEs,
    questionEn,
    answerEn,
    order: order ?? 0,
    isActive: isActive ?? true,
    buttons: buttons ?? [],
  });

  revalidatePublic(FAQ_TAG);

  await createLog({
    userId: user._id.toString(),
    userName: user.name,
    userRole: user.role,
    action: "FAQ_CREATED",
    target: questionEs.slice(0, 80),
    targetId: faq._id.toString(),
  });

  return Response.json({ faq }, { status: 201 });
});
