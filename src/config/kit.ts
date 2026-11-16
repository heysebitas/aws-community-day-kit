/** El kit sobre el que está hecho el sitio: lo que enlazan el pie de página y los créditos. */

const REPO = "https://github.com/heysebitas/aws-community-day-kit";

export const KIT = {
  nombre: "AWS Community Day Kit",
  slug: "aws-community-day-kit",
  repo: REPO,
  licencia: `${REPO}/blob/main/LICENSE`,
} as const;
