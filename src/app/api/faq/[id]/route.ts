import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAccess, requireDelete } from "@/lib/auth";
import { FAQ } from "@/models/faq";
import { revalidatePublic, FAQ_TAG } from "@/lib/data/revalidate";
import { createLog } from "@/lib/log";
import { ruta } from "@/lib/api";

export const PUT = ruta(async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const user = await requireAccess("faq", "editar", ["admin", "organizer"]);
  const { id } = await params;
  await connectDB();

  const body = await request.json();
  const { questionEs, answerEs, questionEn, answerEn, order, isActive, buttons } = body;

  const faq = await FAQ.findByIdAndUpdate(
    id,
    { questionEs, answerEs, questionEn, answerEn, order, isActive, buttons: buttons ?? [] },
    { returnDocument: "after", runValidators: true },
  );

  if (!faq) {
    return Response.json({ error: "No encontrado" }, { status: 404 });
  }

  revalidatePublic(FAQ_TAG);

  await createLog({
    userId: user._id.toString(),
    userName: user.name,
    userRole: user.role,
    action: "FAQ_UPDATED",
    target: (questionEs || faq.questionEs).slice(0, 80),
    targetId: id,
  });

  return Response.json({ faq });
});

export const DELETE = ruta(async (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) => {
  const user = await requireDelete("faq", ["admin", "organizer"]);
  const { id } = await params;
  await connectDB();

  const faq = await FAQ.findByIdAndDelete(id);
  if (!faq) {
    return Response.json({ error: "No encontrado" }, { status: 404 });
  }

  revalidatePublic(FAQ_TAG);

  await createLog({
    userId: user._id.toString(),
    userName: user.name,
    userRole: user.role,
    action: "FAQ_DELETED",
    target: faq.questionEs.slice(0, 80),
    targetId: id,
  });

  return Response.json({ ok: true });
});
