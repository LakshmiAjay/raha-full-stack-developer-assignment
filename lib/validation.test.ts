import { describe, expect, it } from "vitest";
import { changePasswordSchema, createAssociateSchema } from "./validation";

describe("account validation", () => {
  it("normalizes an associate email", () => {
    expect(
      createAssociateSchema.parse({
        name: "  Priya Shah  ",
        email: "Priya@RAHA.IN",
      }),
    ).toEqual({ name: "Priya Shah", email: "priya@raha.in" });
  });

  it("requires a strong new password", () => {
    expect(() =>
      changePasswordSchema.parse({
        currentPassword: "Raha@123",
        newPassword: "onlylowercase",
      }),
    ).toThrow();
    expect(
      changePasswordSchema.parse({
        currentPassword: "Raha@123",
        newPassword: "Secure@456",
      }).newPassword,
    ).toBe("Secure@456");
  });

  it("rejects reuse of the current password", () => {
    expect(() =>
      changePasswordSchema.parse({
        currentPassword: "Raha@123",
        newPassword: "Raha@123",
      }),
    ).toThrow();
  });
});
