import { Request } from "express";
import { RequestContext } from "../types/common.js";

export const asEntityId = (value: unknown): string => {
  if (value == null || value === "") return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const record = value as { _id?: unknown; id?: unknown };
    if (record._id != null) return String(record._id);
    if (record.id != null) {
      const id = String(record.id);
      if (id && id !== "[object Object]") return id;
    }
  }
  const asString = String(value);
  return asString === "[object Object]" ? "" : asString;
};

export const buildRequestContext = (
  req: Request,
  accountId?: string,
): RequestContext => {
  return {
    accountId: accountId ?? (req.params.accountId as string | undefined),
    organizationId: asEntityId(req.user?.organizationId),
    userId: asEntityId(req.user?.id),
    userName: String(req.user?.name ?? ""),
  };
};
