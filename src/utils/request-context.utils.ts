import { Request } from "express";
import { RequestContext } from "../types/common.js";

export const buildRequestContext = (
  req: Request,
  accountId?: string,
): RequestContext => {
  return {
    accountId: accountId ?? (req.params.accountId as string | undefined),
    organizationId: String(req.user?.organizationId ?? ""),
    userId: String(req.user?.id ?? ""),
    userName: String(req.user?.name ?? ""),
  };
};
