import type { ClothingPieceIdentity } from "@/lib/utils/clothing-piece-label";

export interface AssistantBoardItem extends ClothingPieceIdentity {
  categoryId: string;
}

export interface AssistantOutfitBoard {
  id: string;
  title: string;
  items: AssistantBoardItem[];
  focusItemId?: string;
}

/** Store references, never model-supplied photos or item descriptions. */
export interface AssistantBoardRecord {
  id: string;
  title: string;
  itemIds: string[];
  focusItemId?: string;
}
