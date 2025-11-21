import { BadRequestError } from "../errors/HttpError";

export function assertPositiveNumber(value: any, fieldName: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw new BadRequestError(`${fieldName} must be a positive number`);
  }
  return numeric;
}

export function assertString(value: any, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new BadRequestError(`${fieldName} is required`);
  }
  return value.trim();
}


