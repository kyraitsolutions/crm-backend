import { END, START, StateGraph } from "@langchain/langgraph";
import { AI_AGENT_ROUTE } from "../constants/runtime.constant.js";
import { humanHandoffNode } from "./nodes/human-handoff.node.js";
import { intentClassifierNode } from "./nodes/intent-classifier.node.js";
import { knowledgeRetrievalNode } from "./nodes/knowledge-retrieval.node.js";
import { responseGeneratorNode } from "./nodes/response-generator.node.js";
import { routerNode } from "./nodes/router.node.js";
import { safetyCheckNode } from "./nodes/safety-check.node.js";
import { toolExecutorNode } from "./nodes/tool-executor.node.js";
import { AgentState, type AgentStateType } from "./state.js";

const routeAfterSafety = (state: AgentStateType) => {
  if (!state.safetyCheckPassed) return END;
  if (state.shouldHandoff) return "humanHandoff";
  return "intentClassifier";
};

const routeAfterRouter = (state: AgentStateType) => {
  if (state.shouldHandoff || state.routeDecision === AI_AGENT_ROUTE.HANDOFF) {
    return "humanHandoff";
  }
  if (state.routeDecision === AI_AGENT_ROUTE.KNOWLEDGE) return "knowledgeRetrieval";
  if (state.routeDecision === AI_AGENT_ROUTE.TOOL) return "toolExecutor";
  return "responseGenerator";
};

export const createAgentGraph = () => {
  const workflow = new StateGraph(AgentState)
    .addNode("safetyCheck", safetyCheckNode)
    .addNode("intentClassifier", intentClassifierNode)
    .addNode("router", routerNode)
    .addNode("knowledgeRetrieval", knowledgeRetrievalNode)
    .addNode("toolExecutor", toolExecutorNode)
    .addNode("humanHandoff", humanHandoffNode)
    .addNode("responseGenerator", responseGeneratorNode)
    .addEdge(START, "safetyCheck")
    .addConditionalEdges("safetyCheck", routeAfterSafety, {
      intentClassifier: "intentClassifier",
      humanHandoff: "humanHandoff",
      [END]: END,
    })
    .addEdge("intentClassifier", "router")
    .addConditionalEdges("router", routeAfterRouter, {
      knowledgeRetrieval: "knowledgeRetrieval",
      toolExecutor: "toolExecutor",
      humanHandoff: "humanHandoff",
      responseGenerator: "responseGenerator",
    })
    .addEdge("knowledgeRetrieval", "responseGenerator")
    .addEdge("toolExecutor", "responseGenerator")
    .addEdge("humanHandoff", END)
    .addEdge("responseGenerator", END);

  return workflow.compile();
};

let compiledGraph: ReturnType<typeof createAgentGraph> | null = null;

export const getAgentGraph = () => {
  if (!compiledGraph) compiledGraph = createAgentGraph();
  return compiledGraph;
};
