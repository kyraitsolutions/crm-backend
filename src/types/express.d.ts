import { AuthUser } from "./common.ts";

declare global {
  namespace Express {
    interface User extends AuthUser {}
    interface Request {
      user?: AuthUser;
    }
  }
}

export {};
