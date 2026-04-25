import { describe, it, expect } from "@jest/globals";
import {
  validateEmail,
  validatePassword,
  validateOTP,
} from "../../utils/validation.js";

describe("Validation Functions", () => {
  describe("validateEmail", () => {
    it("should return true for valid email", () => {
      const result = validateEmail("test@example.com");
      expect(result.isValid).toBe(true);
    });

    it("should return false for invalid email", () => {
      const result = validateEmail("invalid-email");
      expect(result.isValid).toBe(false);
    });

    it("should return false for empty email", () => {
      const result = validateEmail("");
      expect(result.isValid).toBe(false);
    });
  });

  describe("validatePassword", () => {
    it("should return true for strong password", () => {
      const result = validatePassword("Test@123456");
      expect(result.isValid).toBe(true);
    });

    it("should return false for short password", () => {
      // Fixed: "Test1" is 5 characters, so it will correctly return false
      const result = validatePassword("Test1");
      expect(result.isValid).toBe(false);
    });

    it("should return false for password without uppercase", () => {
      const result = validatePassword("test@123456");
      expect(result.isValid).toBe(false);
    });
  });

  describe("validateOTP", () => {
    it("should return true for 6-digit OTP", () => {
      const result = validateOTP("123456");
      expect(result.isValid).toBe(true);
    });

    it("should return false for non-6-digit OTP", () => {
      const result = validateOTP("12345");
      expect(result.isValid).toBe(false);
    });
  });
});
