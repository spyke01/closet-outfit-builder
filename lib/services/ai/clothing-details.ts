import { z } from "zod";
import { COLOR_OPTIONS } from "@/lib/data/color-options";

export const ClothingDetailsSchema = z
  .object({
    name: z.string().trim().min(1).max(100),
    category_id: z.string().uuid().nullable(),
    color: z.string().max(30).nullable(),
  })
  .strict();
export type ClothingDetails = z.infer<typeof ClothingDetailsSchema>;

export function parseClothingDetails(
  text: string,
  categoryIds: readonly string[],
): ClothingDetails | null {
  try {
    const parsed = ClothingDetailsSchema.safeParse(JSON.parse(text.trim()));
    if (!parsed.success) return null;
    return {
      name: parsed.data.name,
      category_id:
        parsed.data.category_id && categoryIds.includes(parsed.data.category_id)
          ? parsed.data.category_id
          : null,
      color: COLOR_OPTIONS.some(
        (option) => option.value && option.value === parsed.data.color,
      )
        ? parsed.data.color
        : null,
    };
  } catch {
    return null;
  }
}
