import type { Response, NextFunction } from "express";
import type { LoginRequestDto } from "@authFeatHttp/dtos/LoginRequestDto";

import { compare } from "bcryptjs";

import { logger, validateEmail } from "@qc/utils";
import { handleHttpError } from "@utils/handleError";

import { getUser } from "@authFeat/services/authService";

/**
 * Validates the standard login form fields.
 * @middleware
 * @response `bad request`, or `HttpError`.
 */
export default async function validateLogin(
  req: LoginRequestDto,
  res: Response,
  next: NextFunction
) {
  try {
    const ERROR = req.locale.data.auth.error.LOGIN_EMAIL_PASSWORD;

    const isValid = validateEmail(req.body.email);
    if (!isValid) return res.status(400).json({ ERROR });

    const user = await getUser(
      { by: "email", value: req.body.email },
      { projection: "-_id email password", lean: true }
    );
    if (!user) return res.status(400).json({ ERROR });

    if (user.password === "google provided")
      return res.status(400).json({
        ERROR: req.locale.data.auth.error.LOGIN_GOOGLE_LINKED
      });

    if (!(await compare(req.body.password, user.password)))
      return res.status(400).json({ ERROR });

    logger.debug(`Login ${user.email} successfully validated.`);
    next();
  } catch (error: any) {
    next(handleHttpError(error, "validateLogin middleware error."));
  }
}
