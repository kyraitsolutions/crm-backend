import axios from "axios";
import { config } from "../../../../config/index.js";

export class WhatsappApiClient {
  //   protected async post(endpoint: string, accessToken: string, payload: any) {
  //     const url =
  //       `${config.meta.GRAPH_BASE_URL}` +
  //       `/${config.meta.GRAPH_VERSION}` +
  //       endpoint;

  //     console.log("url", url);

  //     const { data } = await axios.post(url, payload, {
  //       headers: {
  //         Authorization: `Bearer ${accessToken}`,
  //         "Content-Type": "application/json",
  //       },
  //     });

  //     return data;
  //   }
  protected async post(endpoint: string, accessToken: string, payload: any) {
    try {
      const url =
        `${config.meta.GRAPH_BASE_URL}` +
        `/${config.meta.GRAPH_VERSION}` +
        endpoint;

      const { data } = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      return data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Meta API Error:", error.response?.data);

        throw new Error(
          error?.response?.data?.error?.error_user_msg ||
            error?.response?.data?.error?.error_msg ||
            error.response?.data?.error?.message ||
            "Failed to communicate with Meta.",
        );
      }

      throw error;
    }
  }

  protected async get(endpoint: string, accessToken: string) {
    const url =
      `${config.meta.GRAPH_BASE_URL}` +
      `/${config.meta.GRAPH_VERSION}` +
      endpoint;

    const { data } = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return data;
  }

  protected async delete(endpoint: string, accessToken: string) {
    const url =
      `${config.meta.GRAPH_BASE_URL}` +
      `/${config.meta.GRAPH_VERSION}` +
      endpoint;

    const { data } = await axios.delete(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return data;
  }
}
