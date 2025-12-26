const fs = require("fs");
const path = require("path");

jest.mock("multer", () => {
  const multerMock = () => {
    const middleware = (req, _res, next) => next();
    middleware.single = () => middleware;
    middleware.array = () => middleware;
    middleware.fields = () => middleware;
    return middleware;
  };
  multerMock.diskStorage = () => ({
    destination: (_req, _file, cb) => cb(null, "uploads"),
    filename: (_req, file, cb) => cb(null, file.originalname || `file-${Date.now()}`),
  });
  multerMock.memoryStorage = () => ({});
  return multerMock;
});

const request = require("supertest");

const TEST_DB_PATH = path.join(__dirname, "..", "data", "softupakaran.test.db");
let app;
let db;
let logSpy;
let errorSpy;

describe("API basic flow", () => {
  beforeAll(() => {
    process.env.DATABASE_FILE = TEST_DB_PATH;
    try {
      fs.unlinkSync(TEST_DB_PATH);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    jest.resetModules();
    app = require("../src/server");
    db = require("../src/db");
  });

  afterAll(async () => {
    if (db && typeof db.close === "function") {
      await new Promise((resolve) => db.close(resolve));
    }
    logSpy?.mockRestore();
    errorSpy?.mockRestore();
    await new Promise((resolve) => setTimeout(resolve, 200));
    try {
      fs.unlinkSync(TEST_DB_PATH);
    } catch (err) {
      if (err.code !== "ENOENT") throw err;
    }
  });

  it("responds to the health check", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.request_id).toBeDefined();
  });

  it("lists categories/products", async () => {
    const res = await request(app).get("/api/products");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("accepts feedback with valid rating", async () => {
    const res = await request(app)
      .post("/api/feedback")
      .send({ message: "Great product", rating: 5 });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
    expect(typeof res.body.id).toBe("number");
  });
});
