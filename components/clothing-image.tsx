import Image, { type ImageProps } from "next/image";
import { currentDefaultClothingImage } from "@/lib/utils/default-clothing-image";

/** Keep ordinary Next Image behavior and refresh only bundled wardrobe defaults. */
export default function ClothingImage({ src, alt, ...props }: ImageProps) {
  return (
    <Image
      {...props}
      alt={alt}
      src={typeof src === "string" ? currentDefaultClothingImage(src) : src}
    />
  );
}
