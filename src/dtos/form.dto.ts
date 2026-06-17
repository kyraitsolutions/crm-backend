// dto/form.dto.ts
export class FormDto {
  id: string;
  userId: string;
  accountId: string;
  formTitle: string;
  formDescription?: string;
  headerImage?: string;
  formName: string;
  status: boolean;
  formFields: {
    name?: boolean;
    phoneNumber?: boolean;
    email?: boolean;
    message?: boolean;
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
    _id: string;
    userId: string;
    accountId: string;
    formTitle: string;
    formDescription?: string;
    headerImage?: string;
    formName: string;
    status:boolean;
    formFields: {
      name?: boolean;
      phoneNumber?: boolean;
      email?: boolean;
      message?: boolean;
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
    this.id = data._id;
    this.userId = data.userId;
    this.accountId = data.accountId;
    this.formTitle = data.formTitle;
    this.formDescription = data.formDescription;
    this.headerImage = data.headerImage;
    this.status=data.status;
    this.formName = data.formName;
    this.formFields = data.formFields;
    this.successMessage = data.successMessage;
    this.successCTA = data.successCTA;
    this.successCTADestination = data.successCTADestination;
  }
}




export class CreateFormDto {
  formTitle: string;
  formDescription?: string;
  headerImage?: string;
  formName: string;
  status: boolean;
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
    status: boolean;
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
    this.status = data.status;
    this.headerImage = data.headerImage;
    this.formName = data.formName;
    this.formFields = data.formFields;
    this.successMessage = data.successMessage;
    this.successCTA = data.successCTA;
    this.successCTADestination = data.successCTADestination;
  }
}
