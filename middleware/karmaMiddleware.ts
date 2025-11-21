import { Request, Response, NextFunction } from "express";
import { AdjutorService } from "../service/adjutorService";
import { ForbiddenError, BadRequestError } from "../errors/HttpError";
import { logger } from "../errors/logger";

export async function checkKarmaBlacklist(
    req: Request,
    res: Response,
    next: NextFunction
) {
    try {
        const { email } = req.body;

        if (!email) {
            // If email is missing, let the controller handle validation or throw BadRequest here.
            // The controller checks for email, so we can either skip or throw.
            // Let's throw to be safe and fail early.
            throw new BadRequestError("Email is required for karma check");
        }

        const result = await AdjutorService.checkKarma(email);

        if (result.isBlacklisted) {
            logger.info(`Blocked registration for blacklisted user: ${email}`, { reason: result.reason });
            throw new ForbiddenError(
                `Registration blocked: ${result.reason || "User is on the blacklist"}`
            );
        }

        next();
    } catch (error) {
        if (error instanceof ForbiddenError || error instanceof BadRequestError) {
            next(error);
        } else {
            // If it's an API error or network error, we should prompt the user to try again.
            // The requirements say: "if their identity cannot be verified for any reason, (network or otherwise) they should be prompted to try again at a later time."
            logger.error("Karma check failed", { error });
            res.status(503).json({
                message: "Unable to verify identity at this time. Please try again later.",
            });
        }
    }
}
