import { Request, Response } from "express";

export const buildRequestMeta = (request: Request) => ({
  method: request.method,
  baseUrl: request.host,
  endpoint: request.originalUrl || request.url,
});

export default (
  request: Request,
  response: Response,
  responseStatusCode: number,
  responseMessage: string,
  result?: unknown,
) => {
  const responseData = {
    success: true,
    responseStatusCode,
    responseMessage,
    request: buildRequestMeta(request),
    result,
  };

  return response.status(responseStatusCode).json(responseData);
};
