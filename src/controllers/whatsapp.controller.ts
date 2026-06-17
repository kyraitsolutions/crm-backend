import { Request, Response, NextFunction } from "express";
import httpResponse from "../utils/http.response";
import { whatsppService } from "../container";
import { ENV } from "../constants";
import axios from "axios";

export class WhatsappController {

  connectWhatsapp = async (req: Request,res: Response,next: NextFunction): Promise<void> => {
    try {
      const { accountId } = req.query;

      if (!accountId) {
        res.status(400).json({ error: 'x-ndid header missing' });
      }

      const state = Buffer.from(JSON.stringify({ accountId })).toString('base64');

      const redirectUri = `${ENV.URL.BACKEND_URL}/api/whatsapp/callback`;

      const signupUrl =
        `https://www.facebook.com/v19.0/dialog/oauth` +
        `?client_id=${ENV.META.APP_ID}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&state=${state}` +
        `&scope=${encodeURIComponent('business_management, whatsapp_business_management,whatsapp_business_messaging')}` +
        `&extras=${encodeURIComponent(
          JSON.stringify({
            feature: 'whatsapp_embedded_signup',
            setup: { business: { isWebsiteRequired: false } }
          })
        )}`;

      httpResponse(req, res, 200, "sign up url generated successfully", {
        docs: { signupUrl },
      });
    } catch (error) {
      next(error);
    }
  };

  callback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        res.status(400).send('Missing code or state');
      }

      const decodedState = JSON.parse(Buffer.from(state as string, 'base64').toString('utf-8'));
      console.log("Decoded state", decodedState)

      const redirectUri = `${ENV.URL.BACKEND_URL}/api/whatsapp/callback`;

      // Exchange code for token
      const tokenResponse = await axios.get('https://graph.facebook.com/v19.0/oauth/access_token', {
        params: {
          client_id: ENV.META.APP_ID,
          client_secret: ENV.META.APP_SECRET,
          redirect_uri: redirectUri,
          code
        }
      });

      console.log("token response", tokenResponse)

      const shortLivedToken = tokenResponse.data.access_token;

      const longLivedTokenResponse = await axios.get(
        'https://graph.facebook.com/v19.0/oauth/access_token',
        {
          params: {
            grant_type: 'fb_exchange_token',
            client_id: ENV.META.APP_ID,
            client_secret: ENV.META.APP_SECRET,
            fb_exchange_token: shortLivedToken
          }
        }
      );

      const accessToken = longLivedTokenResponse.data.access_token;
      const expiresIn = longLivedTokenResponse.data.expires_in;

    }
    catch (error) {
      next(error);
    }
  };

  getList = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { accountId, rowPerPage, pageIndex } = req.body;

      const limit = rowPerPage
        ? parseInt(String(rowPerPage), 10)
        : 10;

      const page = Math.max(Number(pageIndex), 1);
      const skip = (Math.max(Number(pageIndex), 1) - 1) * limit;

      const contacts = await whatsppService.getList(String(accountId || ""), { limit, skip });

      const totalPages =
        Math.ceil(
          contacts.totalDocs /
          limit
        ) || 1;
      httpResponse(req, res, 200, "contacts fetched successfully", {
        docs: contacts.docs,
        pagination: {
          page,
          limit,
          skip,
          totalDocs: contacts?.totalDocs,
          totalPages: totalPages,
          hasNextPage:
            page <
            totalPages,
          hasPrevPage:
            page > 1,
        },
      });
    } catch (error) {
      next(error);
    }
  };
}