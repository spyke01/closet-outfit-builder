import {
  buildWardrobeItemPrompt,
  type WardrobeItemPromptInput,
} from "./wardrobe-item-prompt-builder.ts";

export function buildWardrobePhotoPrompt(item: WardrobeItemPromptInput) {
  const kind = `${item.name} ${item.category}`.toLowerCase();
  const requirements = [
    "Photorealistic commercial product photograph. Show real fabric weave, stitching, material grain, natural folds and dimensional construction; avoid flat illustration, vector art, airbrushing or a plastic render.",
    "Fit the whole product inside the central 78% of the square canvas, with pure white padding on every side. No sleeve, hem, toe, buckle, strap or loose end may touch the image edge.",
    "Preserve the supplied color, fabric, construction and brand details. Do not invent text, watermarks, patterns or extra clothing.",
  ];
  if (/\b(belt)s?\b/.test(kind)) {
    requirements.push(
      "Show a COMPLETE waist belt in a compact oval coil, with one buckle and its long tapered end fully visible. Never show a short watch strap, cropped belt, holding bands or props.",
    );
  } else if (/\b(watch|watches)\b/.test(kind)) {
    requirements.push(
      "Show the full wristwatch, dial, and complete bracelet or strap. Preserve the provided material and color. No invented brand lettering.",
    );
  } else if (/\b(tie|ties)\b/.test(kind)) {
    requirements.push(
      "Show a compact, complete necktie with its entire closed neck loop, knot and pointed end inside the frame. No cropped neck loop, shirt or person.",
    );
  } else if (/\b(shoe|sneaker|loafer|boot|heel|flat|sandal)s?\b/.test(kind)) {
    requirements.push(
      "Show one matching left-and-right pair in a realistic three-quarter product view, with both shoes fully visible at the same scale. No feet or shoe trees.",
    );
  } else {requirements.push(
      "Show the whole garment with natural volume on an invisible form. No visible person, mannequin, hanger or stand.",
    );}
  return buildWardrobeItemPrompt(item) +
    "\n\n### Photographic finish and full-product framing\n" +
    requirements.map((s) => "- " + s).join("\n");
}
