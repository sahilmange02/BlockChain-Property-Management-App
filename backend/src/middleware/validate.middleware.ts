import { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodSchema, ZodError } from "zod";

export interface ValidationTarget {
    body?: ZodSchema;
    params?: ZodSchema;
    query?: ZodSchema;
}

export function validate(schema: ZodSchema): RequestHandler;
export function validate(target: ValidationTarget): RequestHandler;
export function validate(schemaOrTarget: ZodSchema | ValidationTarget): RequestHandler {
    const targets = isValidationTarget(schemaOrTarget) ? schemaOrTarget : { body: schemaOrTarget };

    return (req: Request, res: Response, next: NextFunction): void => {
        const errors: Record<string, string[]> = {};

        if (targets.body) {
            const result = targets.body.safeParse(req.body);
            if (!result.success) {
                errors.body = (result.error as ZodError).errors.map((e) => `${e.path.join(".")}: ${e.message}`);
            } else {
                req.body = result.data;
            }
        }
        if (targets.params) {
            const result = targets.params.safeParse(req.params);
            if (!result.success) {
                errors.params = (result.error as ZodError).errors.map((e) => `${e.path.join(".")}: ${e.message}`);
            } else {
                req.params = result.data as Record<string, string>;
            }
        }
        if (targets.query) {
            const result = targets.query.safeParse(req.query);
            if (!result.success) {
                errors.query = (result.error as ZodError).errors.map((e) => `${e.path.join(".")}: ${e.message}`);
            } else {
                req.query = result.data as Record<string, string>;
            }
        }

        if (Object.keys(errors).length > 0) {
            res.status(400).json({
                success: false,
                message: "Validation failed",
                errors,
            });
            return;
        }
        next();
    };
}

function isValidationTarget(x: unknown): x is ValidationTarget {
    return typeof x === "object" && x !== null && ("body" in x || "params" in x || "query" in x);
}
