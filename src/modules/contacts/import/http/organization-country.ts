import { Organization } from "../../../../models/organization.model.js";

export function isIsoCountryCode(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z]{2}$/.test(value);
}

export async function readOrganizationCountry(
  organizationId: string,
): Promise<{ code: string; source: "organization" } | { code: null; source: "none" }> {
  const org = await Organization.findById(organizationId).lean();
  const country =
    org && "address" in org
      ? (org.address as { country?: string } | null | undefined)?.country
      : undefined;
  if (isIsoCountryCode(country)) {
    return { code: country.toUpperCase(), source: "organization" };
  }
  return { code: null, source: "none" };
}
