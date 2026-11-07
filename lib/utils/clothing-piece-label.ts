export interface ClothingPieceIdentity {
  id: string;
  name: string;
  color?: string | null;
  category?: string | null;
  brand?: string | null;
  material?: string | null;
  imageUrl?: string | null;
}

export function clothingPieceLabel(piece: Pick<ClothingPieceIdentity, "name" | "color">): string {
  const name = piece.name.trim();
  const color = piece.color?.trim();
  if (!color) return name;
  const escaped = color.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`\\b${escaped}\\b`, "i").test(name)) return name;
  return `${color.charAt(0).toUpperCase()}${color.slice(1)} ${name}`;
}

export function clothingPieceDescription(piece: ClothingPieceIdentity): string {
  const details = [piece.category, piece.brand, piece.material].filter(Boolean).join(" · ");
  return `${clothingPieceLabel(piece)}${details ? ` (${details})` : ""}`;
}
