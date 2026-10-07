import type { TAiAgentConfig } from "../../types/ai-agent.type.js";
import { section } from "./prompt-utils.js";

export const businessPrompt = (config: TAiAgentConfig) => {
  const identity = config.identity || {
    name: "",
    website: "",
    greeting: "",
    description: "",
    industry: "",
    timezone: "",
  };
  return section("Business", [
    identity.name ? `Name: ${identity.name}` : "",
    identity.description ? `Description: ${identity.description}` : "",
    identity.industry ? `Industry: ${identity.industry}` : "",
    identity.website ? `Website: ${identity.website}` : "",
    identity.timezone ? `Timezone: ${identity.timezone}` : "",
  ]);
};
