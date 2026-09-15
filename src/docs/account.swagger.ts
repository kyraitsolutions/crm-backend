const apiResponse = (resultSchema: Record<string, unknown>) => ({
  type: "object",
  properties: {
    success: { type: "boolean", example: true },
    responseStatusCode: { type: "integer", example: 200 },
    responseMessage: { type: "string" },
    request: {
      type: "object",
      properties: {
        method: { type: "string" },
        baseUrl: { type: "string" },
        endpoint: { type: "string" },
      },
    },
    result: resultSchema,
  },
});

const bearerAuth = [{ bearerAuth: [] }];

const accountIdParam = {
  name: "accountId",
  in: "path",
  required: true,
  schema: { type: "string" },
  description: "Account ID",
};

export const accountSwaggerPaths = {
  "/account": {
    get: {
      tags: ["Accounts"],
      summary: "List accounts",
      description: "Returns accounts for the authenticated user. Requires `accounts.view`.",
      security: bearerAuth,
      responses: {
        200: {
          description: "Accounts fetched successfully",
          content: {
            "application/json": {
              schema: apiResponse({
                type: "object",
                properties: {
                  docs: {
                    type: "array",
                    items: { $ref: "#/components/schemas/Account" },
                  },
                },
              }),
            },
          },
        },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
    post: {
      tags: ["Accounts"],
      summary: "Create account",
      description: "Creates a workspace account. Requires `accounts.create` and an active subscription.",
      security: bearerAuth,
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateAccount" },
          },
        },
      },
      responses: {
        201: {
          description: "Account created successfully",
          content: {
            "application/json": {
              schema: apiResponse({
                type: "object",
                properties: {
                  doc: { $ref: "#/components/schemas/CreateAccountResponse" },
                },
              }),
            },
          },
        },
        400: { description: "Validation error" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
      },
    },
  },

  "/account/{accountId}": {
    get: {
      tags: ["Accounts"],
      summary: "Get account by ID",
      description: "Requires `accounts.view`.",
      security: bearerAuth,
      parameters: [accountIdParam],
      responses: {
        200: {
          description: "Account fetched successfully",
          content: {
            "application/json": {
              schema: apiResponse({
                type: "object",
                properties: {
                  doc: { $ref: "#/components/schemas/Account" },
                },
              }),
            },
          },
        },
        404: { description: "Account not found" },
      },
    },
  },

  "/account/{accountId}/access": {
    get: {
      tags: ["Accounts"],
      summary: "Get account access",
      description: "Returns the authenticated user's permissions for this account.",
      security: bearerAuth,
      parameters: [accountIdParam],
      responses: {
        200: {
          description: "Account access fetched successfully",
          content: {
            "application/json": {
              schema: apiResponse({
                type: "object",
                properties: {
                  accountId: { type: "string" },
                  permissions: {
                    type: "array",
                    items: { type: "string" },
                    example: ["accounts.view", "leads.create"],
                  },
                },
              }),
            },
          },
        },
      },
    },
  },

  "/account/{id}": {
    put: {
      tags: ["Accounts"],
      summary: "Update account",
      description: "Requires `accounts.edit`. Currently a stub on the controller.",
      security: bearerAuth,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateAccount" },
          },
        },
      },
      responses: {
        200: { description: "Account updated successfully" },
      },
    },
    delete: {
      tags: ["Accounts"],
      summary: "Delete account",
      description: "Requires `accounts.delete`.",
      security: bearerAuth,
      parameters: [
        {
          name: "id",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "Account deleted successfully",
          content: {
            "application/json": {
              schema: apiResponse({ type: "object" }),
            },
          },
        },
        404: { description: "Account not found" },
      },
    },
  },

  "/account/{accountId}/chatbots": {
    get: {
      tags: ["Account Chatbots"],
      summary: "List chatbots",
      description: "Requires `chatbots.view`.",
      security: bearerAuth,
      parameters: [
        accountIdParam,
        {
          name: "page",
          in: "query",
          schema: { type: "integer", default: 1 },
        },
        {
          name: "limit",
          in: "query",
          schema: { type: "integer", default: 10 },
        },
        {
          name: "search",
          in: "query",
          schema: { type: "string" },
        },
      ],
      responses: {
        200: {
          description: "Chatbots fetched successfully",
          content: {
            "application/json": {
              schema: apiResponse({
                type: "object",
                properties: {
                  docs: { type: "array", items: { type: "object" } },
                  pagination: { type: "object" },
                },
              }),
            },
          },
        },
      },
    },
  },

  "/account/{accountId}/chatbot": {
    post: {
      tags: ["Account Chatbots"],
      summary: "Create chatbot",
      description: "Requires `chatbots.create`.",
      security: bearerAuth,
      parameters: [accountIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateChatBot" },
          },
        },
      },
      responses: {
        201: { description: "Chatbot created successfully" },
      },
    },
  },

  "/account/{accountId}/chatbot/{chatbotId}": {
    get: {
      tags: ["Account Chatbots"],
      summary: "Get chatbot by ID",
      description: "Requires `chatbots.view`.",
      security: bearerAuth,
      parameters: [
        accountIdParam,
        {
          name: "chatbotId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Chatbot details fetched successfully" },
        404: { description: "Chatbot not found" },
      },
    },
    put: {
      tags: ["Account Chatbots"],
      summary: "Update chatbot",
      description: "Requires `chatbots.edit`.",
      security: bearerAuth,
      parameters: [
        accountIdParam,
        {
          name: "chatbotId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateChatBot" },
          },
        },
      },
      responses: {
        200: { description: "Chatbot updated successfully" },
      },
    },
    delete: {
      tags: ["Account Chatbots"],
      summary: "Delete chatbot",
      description: "Requires `chatbots.delete`.",
      security: bearerAuth,
      parameters: [
        accountIdParam,
        {
          name: "chatbotId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Chatbot deleted successfully" },
      },
    },
  },

  "/account/{accountId}/forms": {
    get: {
      tags: ["Account Forms"],
      summary: "List forms",
      description: "Requires `leadForms.view`.",
      security: bearerAuth,
      parameters: [accountIdParam],
      responses: {
        200: { description: "Forms fetched successfully" },
      },
    },
  },

  "/account/{accountId}/form": {
    post: {
      tags: ["Account Forms"],
      summary: "Create form",
      description: "Requires `leadForms.create`.",
      security: bearerAuth,
      parameters: [accountIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateForm" },
          },
        },
      },
      responses: {
        201: { description: "Form created successfully" },
      },
    },
  },

  "/account/{accountId}/form/{formId}": {
    get: {
      tags: ["Account Forms"],
      summary: "Get form by ID",
      description: "Requires `leadForms.view`.",
      security: bearerAuth,
      parameters: [
        accountIdParam,
        {
          name: "formId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Form details fetched successfully" },
      },
    },
    put: {
      tags: ["Account Forms"],
      summary: "Update form",
      description: "Requires `leadForms.edit`.",
      security: bearerAuth,
      parameters: [
        accountIdParam,
        {
          name: "formId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateForm" },
          },
        },
      },
      responses: {
        200: { description: "Form updated successfully" },
      },
    },
    delete: {
      tags: ["Account Forms"],
      summary: "Delete form",
      description: "Requires `leadForms.delete`.",
      security: bearerAuth,
      parameters: [
        accountIdParam,
        {
          name: "formId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Form deleted successfully" },
      },
    },
  },

  "/account/{accountId}/leads": {
    post: {
      tags: ["Account Leads"],
      summary: "List leads",
      description: "Paginated lead list. Requires `leads.view`.",
      security: bearerAuth,
      parameters: [accountIdParam],
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                page: { type: "integer", example: 1 },
                limit: { type: "integer", example: 10 },
                search: { type: "string" },
                filters: { type: "object" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Leads fetched successfully" },
      },
    },
  },

  "/account/{accountId}/lead": {
    post: {
      tags: ["Account Leads"],
      summary: "Create lead",
      description: "Requires `leads.create`.",
      security: bearerAuth,
      parameters: [accountIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateLead" },
          },
        },
      },
      responses: {
        200: { description: "Lead created successfully" },
      },
    },
  },

  "/account/{accountId}/lead/bulk-write": {
    post: {
      tags: ["Account Leads"],
      summary: "Bulk create leads",
      description: "Requires `leads.create`.",
      security: bearerAuth,
      parameters: [accountIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["leads"],
              properties: {
                leads: {
                  type: "array",
                  items: { $ref: "#/components/schemas/CreateLead" },
                },
                uniqueKey: { type: "string", example: "email" },
                mode: {
                  type: "string",
                  enum: ["insert", "upsert"],
                  example: "insert",
                },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Leads created successfully" },
      },
    },
  },

  "/account/{accountId}/lead/{leadId}/details": {
    get: {
      tags: ["Account Leads"],
      summary: "Get lead details",
      description: "Requires `leads.view`.",
      security: bearerAuth,
      parameters: [
        accountIdParam,
        {
          name: "leadId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Lead fetched successfully" },
      },
    },
  },

  "/account/{accountId}/lead/{leadId}/update": {
    put: {
      tags: ["Account Leads"],
      summary: "Update lead",
      description: "Requires `leads.edit`.",
      security: bearerAuth,
      parameters: [
        accountIdParam,
        {
          name: "leadId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      requestBody: {
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/CreateLead" },
          },
        },
      },
      responses: {
        200: { description: "Lead updated successfully" },
      },
    },
  },

  "/account/{accountId}/lead/{leadId}/ai-summary": {
    get: {
      tags: ["Account Leads"],
      summary: "Get lead AI summary",
      security: bearerAuth,
      parameters: [
        accountIdParam,
        {
          name: "leadId",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Lead summary fetched successfully" },
      },
    },
  },

  "/account/{accountId}/overview": {
    get: {
      tags: ["Account Analytics"],
      summary: "Account overview dashboard",
      security: bearerAuth,
      parameters: [
        accountIdParam,
        {
          name: "module",
          in: "query",
          schema: { type: "string" },
        },
        {
          name: "range",
          in: "query",
          schema: { type: "string", example: "7d" },
        },
        {
          name: "startDate",
          in: "query",
          schema: { type: "string", format: "date" },
        },
        {
          name: "endDate",
          in: "query",
          schema: { type: "string", format: "date" },
        },
      ],
      responses: {
        200: { description: "Analytics fetched" },
      },
    },
  },

  "/account/{accountId}/search": {
    get: {
      tags: ["Account Analytics"],
      summary: "Global search",
      security: bearerAuth,
      parameters: [
        accountIdParam,
        {
          name: "query",
          in: "query",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: {
        200: { description: "Global search result fetched" },
      },
    },
  },

  "/account/{accountId}/email/subscribers": {
    get: {
      tags: ["Account Email"],
      summary: "List email subscribers",
      security: bearerAuth,
      parameters: [accountIdParam],
      responses: {
        200: { description: "Subscribers fetched successfully" },
      },
    },
  },

  "/account/{accountId}/template": {
    post: {
      tags: ["Account Email"],
      summary: "Create email template",
      security: bearerAuth,
      parameters: [accountIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              additionalProperties: true,
              properties: {
                name: { type: "string" },
                subject: { type: "string" },
                html: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Template created successfully" },
      },
    },
  },

  "/account/{accountId}/templates": {
    get: {
      tags: ["Account Email"],
      summary: "List email templates",
      security: bearerAuth,
      parameters: [accountIdParam],
      responses: {
        200: { description: "Templates fetched successfully" },
      },
    },
  },

  "/account/{accountId}/ai-template": {
    post: {
      tags: ["Account AI"],
      summary: "Generate template content with AI",
      security: bearerAuth,
      parameters: [accountIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["aiPrompt"],
              properties: {
                aiPrompt: { type: "string", example: "Write a follow-up email for a new lead" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Template content created successfully" },
      },
    },
  },

  "/account/webhook": {
    post: {
      tags: ["Account AI"],
      summary: "AI template webhook",
      description: "Public webhook that generates template content.",
      requestBody: {
        content: {
          "application/json": {
            schema: {
              type: "object",
              properties: {
                aiPrompt: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Template content created successfully" },
      },
    },
  },

  "/account/{accountId}/campaigns/start": {
    post: {
      tags: ["Account Campaigns"],
      summary: "Start email campaign",
      security: bearerAuth,
      parameters: [accountIdParam],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: {
              type: "object",
              required: ["leadIds", "subject", "html"],
              properties: {
                leadIds: {
                  type: "array",
                  items: { type: "string" },
                },
                subject: { type: "string" },
                html: { type: "string" },
              },
            },
          },
        },
      },
      responses: {
        200: { description: "Campaign setup successfully" },
      },
    },
  },

  "/account/{accountId}/recyclebin": {
    post: {
      tags: ["Account Recycle Bin"],
      summary: "List recycle bin items",
      security: bearerAuth,
      parameters: [accountIdParam],
      responses: {
        200: { description: "Recycle bin items fetched successfully" },
      },
    },
  },
};

export const accountSwaggerComponents = {
  schemas: {
    Account: {
      type: "object",
      properties: {
        id: { type: "string" },
        createdBy: { type: "string" },
        organizationId: { type: "string" },
        accountName: { type: "string", example: "Kyra Workspace" },
        email: { type: "string", example: "workspace@kyra.com" },
        status: {
          type: "string",
          enum: ["active", "inactive", "suspended"],
        },
        createdAt: { type: "string", format: "date-time" },
        updatedAt: { type: "string", format: "date-time" },
      },
    },
    CreateAccount: {
      type: "object",
      required: ["accountName", "email"],
      properties: {
        accountName: { type: "string", example: "Kyra Workspace" },
        email: { type: "string", example: "workspace@kyra.com" },
      },
    },
    CreateAccountResponse: {
      type: "object",
      properties: {
        id: { type: "string" },
        accountName: { type: "string" },
        email: { type: "string" },
      },
    },
    CreateChatBot: {
      type: "object",
      required: ["name"],
      additionalProperties: true,
      properties: {
        name: { type: "string" },
        description: { type: "string" },
        status: { type: "boolean" },
        config: { type: "object" },
        theme: { type: "object" },
        conversation: { type: "object" },
      },
    },
    CreateForm: {
      type: "object",
      required: ["formTitle", "formName"],
      properties: {
        formTitle: { type: "string" },
        formName: { type: "string" },
        formDescription: { type: "string" },
        headerImage: { type: "string" },
        status: { type: "boolean" },
        formFields: {
          type: "object",
          properties: {
            name: { type: "boolean" },
            phoneNumber: { type: "boolean" },
            email: { type: "boolean" },
            message: { type: "boolean" },
            customFields: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  key: { type: "string" },
                  required: { type: "boolean" },
                },
              },
            },
          },
        },
        successMessage: { type: "string" },
        successCTA: {
          type: "string",
          enum: ["phone", "whatsapp", "sms", "email", "open_website"],
        },
        successCTADestination: { type: "string" },
      },
    },
    CreateLead: {
      type: "object",
      properties: {
        name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        mobile: { type: "string" },
        message: { type: "string" },
        description: { type: "string" },
        company: { type: "string" },
        title: { type: "string" },
        website: { type: "string" },
        stage: { type: "string", example: "new" },
        status: {
          type: "string",
          enum: ["active", "inactive", "pending"],
        },
        customFields: { type: "object" },
        tags: { type: "array", items: { type: "string" } },
        assignedTo: { type: "string" },
        source: {
          type: "object",
          properties: {
            name: { type: "string", example: "manual" },
            url: { type: "string" },
            formId: { type: "string" },
            chatbotId: { type: "string" },
          },
        },
      },
    },
  },
};
