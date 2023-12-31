import { NextFunction, Request, Response } from "express";

async function signoutHandler(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.jwt) {
    req.session = null;
    return res.status(200).json({});
  }
  req.session = null;
  res.status(200).json({});
}

export { signoutHandler };
