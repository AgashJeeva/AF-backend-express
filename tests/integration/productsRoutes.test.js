import { jest, describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";


jest.spyOn(mongoose, "connect").mockImplementation(() => ({
  then: jest.fn().mockReturnThis(),
  catch: jest.fn().mockReturnThis(),
}));


const ProductMock = jest.fn().mockImplementation((data) => ({
  ...data,
  save: jest.fn().mockResolvedValue(true),
  schema: { paths: {} }
}));

ProductMock.find = jest.fn();
ProductMock.findOne = jest.fn();
ProductMock.countDocuments = jest.fn();
ProductMock.deleteOne = jest.fn();
ProductMock.schema = { paths: {} };

jest.unstable_mockModule("../../models/product.js", () => ({
  default: ProductMock,
}));

// Mock qrcode
jest.unstable_mockModule("qrcode", () => ({
  default: {
    toDataURL: jest.fn().mockResolvedValue("mock-qr-code-url"),
  },
}));

const app = (await import("../../index.js")).default;
const { generateTestToken } = await import("../testHelper.js");

describe("Product Routes Integration Tests", () => {
  let token;

  beforeEach(() => {
    jest.clearAllMocks();
    token = generateTestToken("user-123", "customer", "test@example.com");
  });

  describe("POST /api/products", () => {
    it("should register a product successfully", async () => {
      const res = await request(app)
        .post("/api/products")
        .set("Authorization", `Bearer ${token}`)
        .send({
          productName: "iPhone",
          model: "13",
          Brand: "Apple",
          condition: "new"
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe("Product registered successfully!");
    });

    it("should return 401 without token", async () => {
      const res = await request(app).post("/api/products").send({});
      expect(res.status).toBe(401);
    });
  });

  describe("GET /api/products", () => {
    it("should fetch user products", async () => {
      ProductMock.find.mockResolvedValue([{ productName: "iPhone" }]);
      ProductMock.countDocuments.mockResolvedValue(1);

      const res = await request(app)
        .get("/api/products")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(ProductMock.find).toHaveBeenCalledWith({ ownerEmail: "test@example.com" });
    });
  });

  describe("POST /api/products/:productID/lifecycle", () => {
    it("should add a lifecycle event", async () => {
      const mockProduct = {
        productID: "PRD-123",
        ownerEmail: "test@example.com",
        lifecycle: [],
        save: jest.fn().mockResolvedValue(true)
      };
      ProductMock.findOne.mockResolvedValue(mockProduct);

      const res = await request(app)
        .post("/api/products/PRD-123/lifecycle")
        .set("Authorization", `Bearer ${token}`)
        .send({
          eventType: "Maintenance",
          description: "Cleaned screen"
        });

      expect(res.status).toBe(200);
      expect(mockProduct.lifecycle.length).toBe(1);
    });
  });

  describe("GET /api/products/marketplace", () => {
    it("should return marketplace products (public)", async () => {
      ProductMock.find.mockResolvedValue([{ productName: "Sale Item", isForSale: true }]);

      const res = await request(app).get("/api/products/marketplace");

      expect(res.status).toBe(200);
      expect(ProductMock.find).toHaveBeenCalledWith({ isForSale: true });
    });
  });
});
