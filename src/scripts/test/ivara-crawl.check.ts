import { aiKnowledgeLoaderFactory } from "../../modules/ai-agent/services/ai-knowledge-loader.service.js";

const docs = await aiKnowledgeLoaderFactory.loadWebsite("https://lp.ivararesorts.com/");
const combined = docs.map((doc) => doc.pageContent).join("\n");
if (!/check-?in/i.test(combined)) {
  throw new Error("crawl did not keep check-in content");
}
console.log("ivara crawl check passed", {
  documents: docs.length,
  titles: docs.map((doc) => doc.metadata?.title),
});
