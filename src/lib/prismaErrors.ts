import { Prisma } from "@prisma/client";

// True for the error Prisma throws when an update/delete's `where` matched
// zero rows - the case a compound `{ id, userId }` where produces when `id`
// exists but belongs to another user. Route handlers use this to turn that
// into a clean 404 instead of letting it surface as an unhandled 500 (the
// row itself was never touched either way - this only changes the response).
export function isRecordNotFoundError(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}
