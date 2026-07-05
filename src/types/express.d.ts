import { AuthUser } from "./common.ts";

declare global {
  namespace Express {
    interface User extends AuthUser {}
    interface Request {
      user?: AuthUser;
      webhook?: {
        accountId: string|Types.ObjectId;
        organizationId:string| Types.ObjectId;
        webhookId: string|Types.ObjectId;
        // permissions: string[];
      };
    }
  }
}

export {};
