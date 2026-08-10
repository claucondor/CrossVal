import type { NextFunction, Request, Response } from "express";
import { errorHandler } from "./error-handler.middleware";

describe("errorHandler", () => {
  test("unrecognized errors → 500 INTERNAL_ERROR without exposing the message", () => {
    const status = jest.fn();
    const json = jest.fn();
    const response = { status, json } as unknown as Response;
    status.mockReturnValue(response);
    const consoleError = jest.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      errorHandler(
        new Error("secret internal details"),
        {} as Request,
        response,
        jest.fn() as NextFunction,
      );
    } finally {
      consoleError.mockRestore();
    }

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: "INTERNAL_ERROR",
        message: "Internal server error",
      },
    });
  });
});
