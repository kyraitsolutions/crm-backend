export class CreateOrganizationDto {
  name: string;
  email: string;
  slug: string;
  createdBy: string;
  website?: string;
  address?: {
    city: string;
    state: string;
    country: string;
    pincode: string;
    line1: string;
    line2: string;
  };
  industry?: string;
  phone?: string;

  privacyPolicy?: string;
  terms?: string;

  constructor(data: {
    name: string;
    email: string;
    slug: string;
    createdBy: string;
  }) {
    if (!data.name) throw new Error("Organization name is required");
    if (!data.email) throw new Error("Organization email is required");

    this.name = data.name;
    this.email = data.email;
    this.slug = data.slug;
    this.createdBy = data.createdBy;

    Object.assign(this, data);
  }
}
