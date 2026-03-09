import { Request, Response } from "express";

/**
 * Standard API Response structure.
 */
export interface ApiResponse<T = any> {
    code: number;
    message: string;
    data?: T;
}

/**
 * Standard typed API Request wrapper.
 */
export interface ApiRequest<
    TBody = any,
    TQuery = any,
    TParams = any
> extends Request<TParams, any, TBody, TQuery> { }

/**
 * Helper to easily format and send standard API responses.
 */
export function sendResponse<T>(res: Response, statusCode: number, message: string, data?: T) {
    const response: ApiResponse<T> = {
        code: statusCode,
        message,
        ...(data !== undefined && { data }),
    };
    return res.status(statusCode).json(response);
}
