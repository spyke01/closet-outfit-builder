import { describe, expect, it } from "vitest";
import { parseClothingDetails } from "../clothing-details";
const id = "11111111-1111-4111-8111-111111111111";
describe("editable photo details", () => {
  it("accepts bounded visible attributes and retains only known colors and owned categories", () => {
    expect(
      parseClothingDetails(
        JSON.stringify({
          name: "Blue striped shirt",
          category_id: id,
          color: "blue",
        }),
        [id],
      ),
    ).toEqual({ name: "Blue striped shirt", category_id: id, color: "blue" });
    expect(
      parseClothingDetails(
        JSON.stringify({
          name: "Shirt",
          category_id: id,
          color: "invented-color",
        }),
        [],
      ),
    ).toEqual({ name: "Shirt", category_id: null, color: null });
  });
  it("rejects malformed JSON, unbounded output, and unsupported invented fields", () => {
    for (const output of [
      "not JSON",
      JSON.stringify({ name: "x".repeat(101), category_id: null, color: null }),
      JSON.stringify({
        name: "Shirt",
        category_id: id,
        color: "blue",
        fabric: "invented",
      }),
    ])
      expect(parseClothingDetails(output, [id])).toBeNull();
  });
});
