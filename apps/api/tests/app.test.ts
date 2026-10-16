import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
describe("HTTP foundation", () => {
  it("exposes a JSON health response without framework disclosure", async () => {
    const response = await request(createApp())
      .get("/api/health")
      .expect(200)
      .expect("Content-Type", /json/);
    expect(response.body).toEqual({ data: { status: "ok" } });
    expect(response.headers).not.toHaveProperty("x-powered-by");
  });
  it("returns the standard JSON error for unknown routes", async () => {
    const response = await request(createApp()).get("/api/tasks").expect(404);
    expect(response.body).toEqual({
      error: { code: "NOT_FOUND", message: "Route not found." },
    });
  });
});
