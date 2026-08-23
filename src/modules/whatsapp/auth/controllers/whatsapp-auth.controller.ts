import { Request, Response, NextFunction } from "express";
import axios from "axios";
import httpResponse from "../../../../utils/http.response.js";
import { ENV } from "../../../../constants/env.constants.js";

export class WhatsappAuthController {
  connectWhatsapp = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { accountId } = req.query;

      if (!accountId) {
        res.status(400).json({ error: "x-ndid header missing" });
      }

      const state = Buffer.from(JSON.stringify({ accountId })).toString(
        "base64",
      );

      const redirectUri = `${ENV.URL.BACKEND_URL}/api/whatsapp/callback`;

      const signupUrl =
        `https://www.facebook.com/v24.0/dialog/oauth` +
        `?client_id=${ENV.META.APP_ID}` +
        `&config_id=${887392707164005}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=code` +
        `&state=${state}` +
        `&scope=${encodeURIComponent("business_management, whatsapp_business_management,whatsapp_business_messaging")}` +
        `&extras=${encodeURIComponent(
          JSON.stringify({
            setup: {},
            featureType: "whatsapp_business_app_onboarding", // set to 'whatsapp_business_app_onboarding'
            sessionInfoVersion: "3",
          }),
        )}`;

      httpResponse(req, res, 200, "sign up url generated successfully", {
        docs: { signupUrl },
      });
    } catch (error) {
      next(error);
    }
  };

  callback = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { code, state } = req.query;

      if (!code || !state) {
        res.status(400).send("Missing code or state");
      }

      const decodedState = JSON.parse(
        Buffer.from(state as string, "base64").toString("utf-8"),
      );
      console.log("Decoded state", decodedState);

      const redirectUri = `${ENV.URL.BACKEND_URL}/api/whatsapp/callback`;

      // Exchange code for token
      const tokenResponse = await axios.get(
        "https://graph.facebook.com/v19.0/oauth/access_token",
        {
          params: {
            client_id: ENV.META.APP_ID,
            client_secret: ENV.META.APP_SECRET,
            redirect_uri: redirectUri,
            code,
          },
        },
      );

      console.log("token response", tokenResponse);

      const shortLivedToken = tokenResponse.data.access_token;

      const longLivedTokenResponse = await axios.get(
        "https://graph.facebook.com/v19.0/oauth/access_token",
        {
          params: {
            grant_type: "fb_exchange_token",
            client_id: ENV.META.APP_ID,
            client_secret: ENV.META.APP_SECRET,
            fb_exchange_token: shortLivedToken,
          },
        },
      );
      console.log(longLivedTokenResponse);

      // const accessToken = longLivedTokenResponse.data.access_token;
      // const expiresIn = longLivedTokenResponse.data.expires_in;
    } catch (error) {
      next(error);
    }
  };
}
