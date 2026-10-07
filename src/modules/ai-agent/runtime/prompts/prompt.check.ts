import assert from "node:assert/strict";
import {
  AI_AGENT_RESPONSE_LENGTH,
  AI_AGENT_TOOL_SENSITIVITY,
  AI_AGENT_TOOL_TYPE,
  AI_AGENT_VOICE_PRESET,
} from "../../constants/ai-agent.constant.js";
import type { TAiAgentConfig } from "../../types/ai-agent.type.js";
import { normalizeAgentReply } from "../utils/interactive-reply.util.js";
import { buildSystemPrompt, customerDirectives } from "./index.js";

const safety = {
  neverInventFacts: true,
  onHumanRequest: true,
  onUnknownInfo: true,
  onComplaint: true,
  onLowConfidence: false,
  lowConfidenceThreshold: 0.4,
  customerHandoffMessage: "",
};

const base = (): TAiAgentConfig => ({
  identity: {
    name: "",
    website: "",
    greeting: "",
    description: "",
    industry: "",
    timezone: "",
  },
  groundRules: [],
  voice: {
    preset: AI_AGENT_VOICE_PRESET.PROFESSIONAL,
    customInstructions: "",
    responseLength: AI_AGENT_RESPONSE_LENGTH.MEDIUM,
    language: "en",
    interactiveReplies: true,
  },
  skills: [],
  tools: [],
  knowledgeSourceIds: [],
  safety,
  legacyWhatsApp: null,
});

const prompt = (
  config: TAiAgentConfig,
  context: Parameters<typeof buildSystemPrompt>[1] = {
    retrievedChunks: [],
    toolResults: [],
  },
) => buildSystemPrompt(config, context);

const empty = prompt(base());
assert.match(empty, /not limited to one industry/);
assert.match(empty, /Platform safety/);
assert.match(empty, /No business actions are configured/);
assert.match(empty, /No business documents were retrieved/);
assert.doesNotMatch(empty, /^Skill:/m);
assert.doesNotMatch(empty, /^Ground rules/m);
assert.match(empty, /"messageType":"button"/);

const profile = base();

profile.identity = {
  name: "Northwind",
  website: "https://northwind.example",
  greeting: "",
  description: "A general store",
  industry: "retail",
  timezone: "Asia/Kolkata",
};

const profilePrompt = prompt(profile);
assert.match(profilePrompt, /Name: Northwind/);
assert.match(profilePrompt, /Industry: retail/);
assert.match(profilePrompt, /Website: https:\/\/northwind\.example/);
assert.doesNotMatch(profilePrompt, /^Skill:/m);

const productApi = base();
productApi.tools = [
  {
    key: "product_list__search",
    name: "Product list",
    type: AI_AGENT_TOOL_TYPE.CUSTOM_API,
    enabled: true,
    sensitivity: AI_AGENT_TOOL_SENSITIVITY.READ_ONLY,
    description: "Search the catalog by what the customer asked for.",
    config: {
      endpoint: "https://example.com/products",
      examples: ["Show me products"],
    },
  },
];
const productPrompt = prompt(productApi);
assert.match(productPrompt, /Product list/);
assert.match(productPrompt, /Search the catalog/);
assert.match(productPrompt, /returns a collection/);
assert.match(productPrompt, /skill is not required|not required for a common request/);
assert.doesNotMatch(productPrompt, /^Skill:/m);

const skillOnly = base();

skillOnly.skills = [
  {
    key: "custom",
    type: "custom",
    enabled: true,
    name: "Product Assistance",
    whenToUse: "When customers ask about products.",
    instructions: "When the customer selects one product, send buttons: Price, Images, Details.",
    config: { collectFields: [], connectedToolKeys: [] },
  },
];
const skillPrompt = prompt(skillOnly);
assert.match(skillPrompt, /Skill: Product Assistance/);
assert.match(skillPrompt, /buttons: Price, Images, Details/);
assert.doesNotMatch(skillPrompt, /Connected actions:/);
assert.deepEqual(customerDirectives(skillOnly), [
  "When the customer selects one product, send buttons: Price, Images, Details.",
]);

const skillWithTool = base();
skillWithTool.skills = [
  {
    ...skillOnly.skills[0],
    config: {
      collectFields: [{ question: "What is your budget?", attribute: "budget", required: false }],
      connectedToolKeys: ["product_list__search"],
    },
  },
];
skillWithTool.tools = productApi.tools;
assert.match(prompt(skillWithTool), /Connected actions: product_list__search/);
assert.match(prompt(skillWithTool), /What is your budget\?/);

const voiced = base();
voiced.groundRules = ["Keep answers about the selected record."];
voiced.voice = {
  ...voiced.voice,
  preset: AI_AGENT_VOICE_PRESET.FRIENDLY,
  language: "hi",
  responseLength: AI_AGENT_RESPONSE_LENGTH.SHORT,
  customInstructions: "Use simple words.",
};
const voicedPrompt = prompt(voiced);
assert.match(voicedPrompt, /Keep answers about the selected record/);
assert.match(voicedPrompt, /Tone: friendly/);
assert.match(voicedPrompt, /Language: hi/);
assert.match(voicedPrompt, /1-2 short sentences/);
assert.match(voicedPrompt, /Use simple words/);

const withKnowledge = prompt(base(), {
  retrievedChunks: [
    {
      id: "k1",
      sourceId: "s1",
      title: "Shipping",
      content: "Answer: Orders ship in 3 days.",
      similarity: 0.9,
      metadata: { startChar: 0, endChar: 20, heading: "Shipping" },
    },
  ],
  toolResults: [],
});
assert.match(withKnowledge, /Orders ship in 3 days/);
assert.match(withKnowledge, /untrusted data/);

const oneProduct = prompt(base(), {
  retrievedChunks: [],
  toolResults: [
    {
      key: "product_details",
      ok: true,
      data: { record: { id: "prod_001", name: "Oak Chair", price: "4999", currency: "INR" } },
    },
  ],
});
assert.match(oneProduct, /one record/);
assert.match(oneProduct, /Oak Chair/);
assert.match(oneProduct, /Do not send the full catalog again/);

const manyProducts = prompt(base(), {
  retrievedChunks: [],
  toolResults: [
    {
      key: "product_list",
      ok: true,
      data: {
        body: {
          count: 2,
          items: [
            { id: "prod_001", name: "Oak Chair" },
            { id: "prod_002", name: "Desk Lamp" },
          ],
        },
      },
    },
  ],
});
assert.match(manyProducts, /body\.items/);
assert.match(manyProducts, /prod_002/);

const followUp = prompt(base(), {
  retrievedChunks: [],
  toolResults: [],
  selectedProduct: { id: "prod_001", name: "Oak Chair", price: "4999" },
});
assert.match(followUp, /Record already selected/);
assert.match(followUp, /Oak Chair/);

const textOnly = base();
textOnly.voice = { ...textOnly.voice, interactiveReplies: false };
const textPrompt = prompt(textOnly);
assert.match(textPrompt, /messageType text only/);
assert.doesNotMatch(textPrompt, /"messageType":"button"/);
assert.match(textPrompt, /"messageType":"text"/);

const failed = prompt(base(), {
  retrievedChunks: [],
  toolResults: [{ key: "product_list", ok: false, data: { error: "timeout" } }],
});
assert.match(failed, /product_list failed/);
assert.match(failed, /Do not say it succeeded/);

assert.match(empty, /say you do not have that information/);

const invalid = normalizeAgentReply("not json", "I can help with that.", true);
assert.equal(invalid.interactive, null);
assert.match(invalid.text, /I can help with that|not json/);

const disabledInteractive = normalizeAgentReply(
  JSON.stringify({
    messageType: "button",
    text: "Pick one",
    buttons: [{ id: "a", title: "Price" }],
  }),
  "fallback",
  false,
);
assert.equal(disabledInteractive.interactive, null);
assert.equal(disabledInteractive.text, "Pick one");

console.log("prompt checks passed");
