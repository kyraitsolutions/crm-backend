import { Application } from "express";
import swaggerUi from "swagger-ui-express";
import { ENV } from "../constants/env.constants.js";
import {
  accountSwaggerComponents,
  accountSwaggerPaths,
} from "./account.swagger.js";

export const swaggerSpec = {
  openapi: "3.0.3",
  info: {
    title: "Kyra CRM API",
    version: ENV.APP.APP_VERSION || "1.0.0",
    description: "OpenAPI documentation for account-scoped endpoints.",
  },
  servers: [
    {
      url: "/api",
      description: "Current server",
    },
  ],
  tags: [
    { name: "Accounts", description: "Workspace account CRUD and access" },
    { name: "Account Chatbots", description: "Chatbots under an account" },
    { name: "Account Forms", description: "Lead forms under an account" },
    { name: "Account Leads", description: "Leads under an account" },
    { name: "Account Analytics", description: "Overview dashboard and search" },
    { name: "Account Email", description: "Subscribers and email templates" },
    { name: "Account AI", description: "AI template generation" },
    { name: "Account Campaigns", description: "Email campaign broadcasting" },
    { name: "Account Recycle Bin", description: "Deleted records" },
  ],
  paths: accountSwaggerPaths,
  components: {
    ...accountSwaggerComponents,
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Paste the JWT from login. Example: Bearer <token>",
      },
    },
  },
};

export const setupSwagger = (app: Application) => {
  app.get("/api/docs.json", (_req, res) => {
    res.json(swaggerSpec);
  });

  app.use("/api/docs", swaggerUi.serve);
  app.get(
    "/api/docs",
    swaggerUi.setup(swaggerSpec, {
      explorer: true,
      customSiteTitle: "Kyra CRM API Docs",
      swaggerOptions: {
        persistAuthorization: true,
      },
    }),
  );
};
