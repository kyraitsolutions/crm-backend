import { AxiosError } from "axios";
import {
  IntegrationProvider,
  IntegrationStatus,
} from "../../../../models/integration.model.js";
import { LeadDto } from "../../../../dtos/lead.dto.js";
import { MetaClient } from "../../../../providers/meta/meta.client.js";
import { LeadService } from "../../../../services/lead.service.js";
import { IntegrationService } from "../../../integrations/services/integration.service.js";
import { IntegrationCredentialRepository } from "../../../integrations/repositories/integration-credential.repository.js";
import { MetaAccountRepository } from "../../account/repositories/meta-account.repository.js";
import { LeadRespository } from "../../../../repositories/lead.respository.js";
import logger from "../../../../utils/logger.js";
import {
  mapLeadgenFields,
  parseLeadgenCreatedTime,
} from "../utils/map-leadgen-fields.js";
import type {
  MetaLeadgenDetails,
  MetaLeadgenWebhookValue,
} from "../types/leadgen.types.js";

export class LeadgenHandler {
  private integrationService = new IntegrationService();
  private credentialRepo = new IntegrationCredentialRepository();
  private metaAccountRepo = new MetaAccountRepository();
  private leadRepo = new LeadRespository();
  private leadService = new LeadService();
  private metaClient = new MetaClient();

  async handle(value: MetaLeadgenWebhookValue) {
    const leadgenId = String(value?.leadgen_id || "");
    const pageId = String(value?.page_id || "");

    if (!leadgenId || !pageId) {
      logger.warn("Meta leadgen webhook missing ids", { value });
      return;
    }

    const existing = await this.leadRepo.findByLeadgenId(leadgenId);
    
    if (existing) {
      logger.info("Meta leadgen already stored", { leadgenId });
      return;
    }

    const metaAccount = await this.metaAccountRepo.findConnectedByPageId(pageId);
    if (!metaAccount) {
      logger.warn("No connected Meta account for page", { pageId });
      return;
    }

    const integration = await this.integrationService.getIntegrationByFilter({
      _id: metaAccount.integrationId,
      provider: IntegrationProvider.FACEBOOK,
      status: IntegrationStatus.CONNECTED,
    });

    if (!integration) {
      logger.warn("Facebook integration not found for Meta account", {
        pageId,
        integrationId: String(metaAccount.integrationId),
      });
      return;
    }

    const credential = await this.credentialRepo.findByIntegrationId(
      String(integration._id),
    );

    if (!credential?.accessToken) {
      logger.warn("Facebook page access token not found", {
        integrationId: String(integration._id),
      });
      return;
    }

    const leadDetails = await this.fetchLeadgen(
      leadgenId,
      credential.accessToken,
    );

    if (!leadDetails) {
      return;
    }

    const { mapped, customFields } = mapLeadgenFields(leadDetails.field_data);
    
    const createdTime = parseLeadgenCreatedTime(
      leadDetails.created_time || value.created_time,
    );

    const leadDto = new LeadDto({
      accountId: String(integration.accountId),
      name: mapped.name,
      email: mapped.email,
      phone: mapped.phone,
      mobile: mapped.mobile || mapped.phone,
      company: mapped.company,
      title: mapped.title,
      website: mapped.website,
      message: mapped.message,
      customFields,
      status: "active",
      source: {
        name: "facebook",
        url: "",
        formId: String(leadDetails.form_id || value.form_id || ""),
        pageId,
        leadgenId,
        adId: String(leadDetails.ad_id || value.ad_id || ""),
        adgroupId: String(leadDetails.adset_id || value.adgroup_id || ""),
        campaignId: String(leadDetails.campaign_id || ""),
        createdTime,
      },
      meta: {
        ip: "",
        userAgent: "facebook-leadgen-webhook",
        location: {
          address: mapped.address,
          country: mapped.country,
          city: mapped.city,
          coordinates: { lat: null, lng: null },
        },
      },
    });

    await this.leadService.createLead(
      {
        accountId: String(integration.accountId),
        organizationId: String(integration.organizationId || ""),
        userId: "",
        userName: "facebook-webhook",
      },
      leadDto,
    );

    logger.info("Meta leadgen stored", {
      leadgenId,
      pageId,
      accountId: String(integration.accountId),
    });
  }

  private async fetchLeadgen(
    leadgenId: string,
    pageAccessToken: string,
  ): Promise<MetaLeadgenDetails | null> {
    try {
      return await this.metaClient.getLeadgen(leadgenId, pageAccessToken);
    } catch (error) {
      const status = (error as AxiosError)?.response?.status;
      if (status === 400 || status === 404) {
        logger.warn("Meta leadgen could not be fetched", {
          leadgenId,
          status,
        });
        return null;
      }
      throw error;
    }
  }
}

export const leadgenHandler = new LeadgenHandler();
