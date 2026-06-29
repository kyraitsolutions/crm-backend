import { Types } from "mongoose";
import { ContactModel } from "../models/contact.model.js";
import { Lead, LeadModel } from "../models/lead.model.js";
import { Router, Request, Response } from "express";

// "dev": "tsx watch src/server.ts && tsx src/workers/email.worker.ts",

export class LeadRespository {
  async find(criteria: any, limit?: number, skip?: number, sort?: Record<string, 1 | -1>) {
    // we can get these fields in api query params
    const query = LeadModel.find(criteria).select("name email phone message status stage source createdAt updatedAt").sort(sort || { createdAt: -1 });
    if (limit !== undefined) {
      query.limit(limit);
    }
    if (skip !== undefined) {
      query.skip(skip);
    }
    return await query.exec();
  }

  async countDocuments(criteria: any) {
    return await LeadModel.find(criteria).countDocuments();
  }

  async create(lead: any) {
    return await LeadModel.create(lead);
  }

  async updateLeadById(id: string, lead: any) {
    const updatedLead = await LeadModel.findByIdAndUpdate(id, lead, {
      new: true,
      upsert: true,
    });

    return updatedLead?.toJSON();
  }

  async update(lead: any): Promise<Lead | null> {
    const { id, customFields, ...rest } = lead;

    // Build update object
    const updateData: any = { ...rest };

    // Handle customFields (Map)
    if (customFields) {
      updateData.$set = {};

      Object.entries(customFields).forEach(([key, val]) => {
        updateData.$set[`customFields.${key}`] = val;
      });
    }

    const savedLead = await LeadModel.findByIdAndUpdate(id, updateData, {
      new: true,
    }).lean();

    // 2️⃣ Stop if no email
    if (!lead.email || lead.email.trim() === "") {
      return savedLead;
    }

    // // 3️⃣ Stop if no consent
    // if (!lead.consent?.marketing) {
    //   return savedLead;
    // }
    // 4️⃣ Safe contact upsert
    const contact = await ContactModel.findOneAndUpdate(
      {
        accountId: lead.accountId,
        email: lead.email.toLowerCase(),
      },
      {
        $set: {
          email: lead.email.toLowerCase(),
          name: lead.name,
          phone: lead.phone,
          status: lead.consentStatus || "unsubscribed",
          source: lead.source?.name || "chatbot",
          "consent.marketing": true,
          "consent.timestamp": new Date(),
          "consent.source": lead.source?.name || "chatbot",
          tags: lead.tags || "warm",
        },
        // $setOnInsert: {
        //   source: lead.source?.name || "chatbot",
        // },
      },
      { upsert: true, new: true },
    );

    console.log(contact)

    return savedLead;
  }

  async getLeadById(accountId: string, id: string) {
    const lead = await LeadModel.aggregate([
      {
        $match: {
          _id: new Types.ObjectId(id),
          accountId: new Types.ObjectId(accountId),
        },
      },
      {
        $lookup: {
          from: "emailactivities",
          localField: "_id",
          foreignField: "leadId",
          as: "emails",
          pipeline: [
            {
              $sort: {
                createdAt: -1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "userprofiles",
          let: {
            assignedTo: "$assignedTo",
          },
          pipeline: [
            {
              $match: {
                $expr: {
                  $eq: ["$userId", "$$assignedTo"],
                },
              },
            },
            {
              $project: {
                _id: 0,
                userId: 1,
                profilePicture: 1,
                firstName: 1,
              },
            },
          ],
          as: "assignedTo",
        },
      },
      {
        $unwind: {
          path: "$assignedTo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          id: "$_id",
          notes: {
            $map: {
              input: "$notes",
              as: "note",
              in: {
                $mergeObjects: [
                  "$$note",
                  {
                    id: "$$note._id",
                  },
                ],
              },
            },
          },
        },
      },
      {
        $unset: ["_id", "notes._id"],
      },
      // // remove _id
      {
        $project: {
          _id: 0,
        },
      },
    ]);

    // const lead= await LeadModel.findOne({ _id: id, accountId: accountId })
    //   .populate()
    // .populate({
    //   path: "assignedTo",
    //   select: "email",
    //   populate: {
    //     path: "profile",
    //     select: "firstName lastName profilePicture",
    //   },
    // });

    return lead[0];
  }
}

export const tempLeadSeedRouter = Router();

tempLeadSeedRouter.post(
  "/seed-test-leads",
  async (_req: Request, res: Response) => {
    try {
      const accountId = "6911c9f8f03d2dca6c2b1f71";
      const userId = "6911c9bff03d2dca6c2b1f65";
      const sampleLeads = [
        {
          accountId,
          userId,
          name: "Suman Kumar",
          email: "suman1@example.com",
          phone: "+911111111111",
          message: "Interested in demo",
          customFields: {
            companySize: "20-50",
            budget: "₹30,000",
            platform: "Web",
          },
          stage: "qualified",
          status: "active",
          source: {
            name: "Chatbot",
            url: "https://example.com/chat1",
            chatbotId: "67201b21c9f43713f4e3caaa",
          },
          notes: [
            {
              message: "Initial interest shown in chatbot conversation",
              createdAt: new Date("2025-11-13T10:30:00.000Z"),
            },
          ],
          meta: {
            ip: "103.211.45.22",
            userAgent: "Mozilla/5.0",
          },
        },
        {
          accountId,
          userId,
          name: "Rajesh Nair",
          email: "rajesh.nair@example.com",
          phone: "+919988776655",
          message: "Wants pricing info",
          customFields: {
            companySize: "10-20",
            budget: "₹20,000",
            platform: "Web",
          },
          stage: "Intake",
          status: "Active",
          source: {
            name: "Webform",
            url: "https://example.com/form1",
            formId: "67201b21c9f43713f4e3cbbb",
          },
          notes: [
            {
              message: "Requested a callback",
              createdAt: new Date("2025-11-13T12:00:00.000Z"),
            },
          ],
          meta: { ip: "103.211.45.31", userAgent: "Chrome/124.0" },
        },
        {
          accountId,
          userId,
          name: "Priya Singh",
          email: "priya.singh@example.com",
          phone: "+917655443321",
          message: "Needs API integration details",
          customFields: {
            companySize: "51-200",
            budget: "₹50,000",
            platform: "Web",
          },
          stage: "Qualified",
          status: "Active",
          source: {
            name: "Chatbot",
            url: "https://example.com/chat2",
            chatbotId: "67201b21c9f43713f4e3caaa",
          },
          notes: [
            {
              message: "Asked about support response times",
              createdAt: new Date("2025-11-14T09:20:00.000Z"),
            },
          ],
          meta: { ip: "103.211.45.45", userAgent: "Mozilla/5.0" },
        },
        {
          accountId,
          userId,
          name: "Deepak Yadav",
          email: "deepak.yadav@example.com",
          phone: "+918888554433",
          message: "Demo scheduled",
          customFields: {
            companySize: "5-10",
            budget: "₹10,000",
            platform: "Mobile",
          },
          stage: "Converted",
          status: "Active",
          source: {
            name: "Referral",
            url: "https://referral-link.com/ref-a",
          },
          notes: [
            {
              message: "Converted through referral",
              createdAt: new Date("2025-11-15T15:00:00.000Z"),
            },
          ],
          meta: { ip: "103.211.45.77", userAgent: "Safari" },
        },
        {
          accountId,
          userId,
          name: "Aarti Patel",
          email: "aarti.patel@example.com",
          phone: "+919999223344",
          message: "Follow up required",
          customFields: {
            companySize: "20-50",
            budget: "₹30,000",
            platform: "Mobile",
          },
          stage: "Qualified",
          status: "Pending",
          source: {
            name: "Webform",
            url: "https://example.com/form2",
            formId: "67201b21c9f43713f4e3cbbb",
          },
          notes: [
            {
              message: "Needs followup next week",
              createdAt: new Date("2025-11-16T11:00:00.000Z"),
            },
          ],
          meta: { ip: "103.211.45.22", userAgent: "Firefox/110.0" },
        },
        {
          accountId,
          userId,
          name: "Sameer Khan",
          email: "sameer.khan@example.com",
          phone: "+917755446633",
          message: "Undecided",
          customFields: {
            companySize: "201-500",
            budget: "₹80,000",
            platform: "Web",
          },
          stage: "Intake",
          status: "Inactive",
          source: {
            name: "Chatbot",
            url: "https://example.com/chat3",
            chatbotId: "67201b21c9f43713f4e3caaa",
          },
          notes: [
            {
              message: "No reply after initial chat",
              createdAt: new Date("2025-11-17T13:25:00.000Z"),
            },
          ],
          meta: { ip: "103.211.45.44", userAgent: "Edge" },
        },
        {
          accountId,
          userId,
          name: "Lakshmi Menon",
          email: "lakshmi.menon@example.com",
          phone: "+918877665544",
          message: "Requested for documents",
          customFields: {
            companySize: "10-20",
            budget: "₹15,000",
            platform: "Web",
          },
          stage: "Qualified",
          status: "Active",
          source: {
            name: "Webform",
            url: "https://example.com/form3",
          },
          notes: [
            {
              message: "Documents sent",
              createdAt: new Date("2025-11-18T08:00:00.000Z"),
            },
          ],
          meta: { ip: "103.211.45.12", userAgent: "Mozilla/5.0" },
        },
        {
          accountId,
          userId,
          name: "Ravi Kumar",
          email: "ravi.kumar@example.com",
          phone: "+919911227788",
          message: "Interested in chatbot dev",
          customFields: {
            companySize: "51-200",
            budget: "₹60,000",
            platform: "Web",
          },
          stage: "Intake",
          status: "Active",
          source: {
            name: "Chatbot",
            url: "https://example.com/chat4",
            chatbotId: "67201b21c9f43713f4e3caaa",
          },
          notes: [
            {
              message: "Looking for technical details",
              createdAt: new Date("2025-11-19T10:05:00.000Z"),
            },
          ],
          meta: { ip: "103.211.45.88", userAgent: "Brave" },
        },
        {
          accountId,
          userId,
          name: "Manoj Verma",
          email: "manoj.verma@example.com",
          phone: "+911234567890",
          message: "Asked for case studies",
          customFields: {
            companySize: "20-50",
            budget: "₹25,000",
            platform: "Web",
          },
          stage: "Qualified",
          status: "Active",
          source: {
            name: "Referral",
            url: "https://referral-link.com/ref-b",
          },
          notes: [
            {
              message: "Sent case studies",
              createdAt: new Date("2025-11-20T14:30:00.000Z"),
            },
          ],
          meta: { ip: "103.211.45.120", userAgent: "Mozilla/5.0" },
        },
        {
          accountId,
          userId,
          name: "Meena Das",
          email: "meena.das@example.com",
          phone: "+917888999000",
          message: "Wants free trial",
          customFields: {
            companySize: "1-5",
            budget: "₹5,000",
            platform: "Web",
          },
          stage: "Intake",
          status: "Pending",
          source: {
            name: "Webform",
            url: "https://example.com/form4",
          },
          notes: [
            {
              message: "Sent trial signup link",
              createdAt: new Date("2025-11-21T16:45:00.000Z"),
            },
          ],
          meta: { ip: "103.211.45.150", userAgent: "Opera" },
        },
        {
          accountId,
          userId,
          name: "Gaurav Sharma",
          email: "gaurav.sharma@example.com",
          phone: "+919812343434",
          message: "Needs integration with CRM",
          customFields: {
            companySize: "51-200",
            budget: "₹70,000",
            platform: "Web",
          },
          stage: "Converted",
          status: "Active",
          source: {
            name: "Referral",
            url: "https://referral-link.com/ref-c",
          },
          notes: [
            {
              message: "Shared CRM integration doc",
              createdAt: new Date("2025-11-22T18:10:00.000Z"),
            },
          ],
          meta: { ip: "103.211.45.171", userAgent: "Mozilla/5.0" },
        },
        {
          accountId,
          userId,
          name: "Neha Joshi",
          email: "neha.joshi@example.com",
          phone: "+919854327865",
          message: "Needs detailed pricing",
          customFields: {
            companySize: "201-500",
            budget: "₹90,000",
            platform: "Mobile",
          },
          stage: "Qualified",
          status: "Active",
          source: {
            name: "Chatbot",
            url: "https://example.com/chat5",
            chatbotId: "67201b21c9f43713f4e3caaa",
          },
          notes: [
            {
              message: "Sent price sheet",
              createdAt: new Date("2025-11-23T19:20:00.000Z"),
            },
          ],
          meta: { ip: "103.211.45.144", userAgent: "Mozilla/5.0" },
        },
        {
          accountId,
          userId,
          name: "Yash Jain",
          email: "yash.jain@example.com",
          phone: "+919899663311",
          message: "Stage pending review",
          customFields: {
            companySize: "5-10",
            budget: "₹8000",
            platform: "Web",
          },
          stage: "Intake",
          status: "Pending",
          source: {
            name: "Webform",
            url: "https://example.com/form5",
          },
          notes: [
            {
              message: "Asked for more info",
              createdAt: new Date("2025-11-24T20:00:00.000Z"),
            },
          ],
          meta: { ip: "103.211.45.133", userAgent: "Mozilla/5.0" },
        },
      ];
      // Insert all leads
      await LeadModel.insertMany(sampleLeads);
      res.status(201).json({
        message: "Test leads inserted successfully",
        count: sampleLeads.length,
      });
    } catch (error) {
      res.status(500).json({ error: error?.toString() || "Unknown error" });
    }
  },
);
