// dto/form.dto.ts
export class FormDto {
  id: string;
  accountId: string;
  formTitle: string;
  formDescription?: string;
  headerImage?: string;
  formName: string;
  formFields: {
    name: boolean;
    phoneNumber: boolean;
    email: boolean;
    message: boolean;
    customFields: Array<{
      label: string;
      key: string;
      required: boolean;
    }>;
  };
  successMessage?: string;
  successCTA?: "phone" | "whatsapp" | "sms" | "email" | "open_website";
  successCTADestination?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(data: {
    _id: string;
    accountId: string;
    formTitle: string;
    formDescription?: string;
    headerImage?: string;
    formName: string;
    formFields: {
      name: boolean;
      phoneNumber: boolean;
      email: boolean;
      message: boolean;
      customFields: Array<{
        label: string;
        key: string;
        required: boolean;
      }>;
    };
    successMessage?: string;
    successCTA?: "phone" | "whatsapp" | "sms" | "email" | "open_website";
    successCTADestination?: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data._id;
    this.accountId = data.accountId;
    this.formTitle = data.formTitle;
    this.formDescription = data.formDescription;
    this.headerImage = data.headerImage;
    this.formName = data.formName;
    this.formFields = data.formFields;
    this.successMessage = data.successMessage;
    this.successCTA = data.successCTA;
    this.successCTADestination = data.successCTADestination;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}




export class CreateFormDto {
  formTitle: string;
  formDescription?: string;
  headerImage?: string;
  formName: string;
  formFields: {
    name: boolean;
    phoneNumber: boolean;
    email: boolean;
    message: boolean;
    customFields?: Array<{
      label: string;
      key: string;
      required: boolean;
    }>;
  };
  successMessage?: string;
  successCTA?: "phone" | "whatsapp" | "sms" | "email" | "open_website";
  successCTADestination?: string;

  constructor(data: {
    formTitle: string;
    formDescription?: string;
    headerImage?: string;
    formName: string;
    formFields: {
      name: boolean;
      phoneNumber: boolean;
      email: boolean;
      message: boolean;
      customFields?: Array<{
        label: string;
        key: string;
        required: boolean;
      }>;
    };
    successMessage?: string;
    successCTA?: "phone" | "whatsapp" | "sms" | "email" | "open_website";
    successCTADestination?: string;
  }) {
    this.formTitle = data.formTitle;
    this.formDescription = data.formDescription;
    this.headerImage = data.headerImage;
    this.formName = data.formName;
    this.formFields = data.formFields;
    this.successMessage = data.successMessage;
    this.successCTA = data.successCTA;
    this.successCTADestination = data.successCTADestination;
  }
}
