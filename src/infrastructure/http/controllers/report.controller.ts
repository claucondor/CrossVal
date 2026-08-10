import type { Request, Response } from "express";

export const reportController = {
  summary(req: Request, res: Response): void {
    const { from, to } = req.query as { from: string; to: string };
    res.status(200).json({
      from,
      to,
      documentCount: 0,
      grandTotalCents: 0,
      totalTaxCents: 0,
      totalDiscountCents: 0,
    });
  },
};