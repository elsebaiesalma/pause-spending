import { prisma } from "@/lib/prisma";

// True when this exact image URL already shows up as another purchase's
// image for the same merchant (a different source email) - the real
// signature of a shared template asset (a rebrand header, a masthead) that
// slipped past the static filename/alt heuristics in htmlUtils, rather
// than a genuine product photo. Product photos are effectively unique per
// item; a template asset gets reused across every email a retailer sends.
export async function isReusedBrandingImage(
  userId: string,
  merchant: string,
  imageUrl: string,
  excludeSourceEmailId: string
): Promise<boolean> {
  const reuse = await prisma.purchase.findFirst({
    where: {
      userId,
      merchant,
      imageUrl,
      sourceEmailId: { not: excludeSourceEmailId },
    },
    select: { id: true },
  });
  return reuse !== null;
}
