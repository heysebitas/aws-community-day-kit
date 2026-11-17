import { connectDB } from "@/lib/db";
import { requireAccess } from "@/lib/auth";
import { SpeakerProfile } from "@/models/speaker-profile";
import { ruta } from "@/lib/api";

// Admin: list ALL profiles (public and private)
export const GET = ruta(async () => {
  await requireAccess("speakers", "ver", ["admin", "organizer"]);
  await connectDB();
  const profiles = await SpeakerProfile.find({})
    .select("name slug role tagline company companyLogo bio photo social talkTitle talkAbstract sessionType audienceLevel language track roomId submissionId isPublic status speakerType scheduledAt createdAt talkTitleCard roleCard cardContentX cardContentY cardNameOffset cardTitleSize cardNameSize cardPhotoX cardPhotoY cardPhotoZoom cardApproved cardImageUrl coSpeakers")
    .sort({ name: 1 }).lean();
  return Response.json({ profiles });
});
