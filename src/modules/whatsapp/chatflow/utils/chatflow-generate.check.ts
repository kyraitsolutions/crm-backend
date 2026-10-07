import assert from "node:assert/strict";
import { compileGeneratedFlow } from "./chatflow-generate.util.js";

const compiled = compileGeneratedFlow({
  nodes: [
    { id: "welcome", type: "send_message", text: "Welcome to Kyra" },
    {
      id: "ask",
      type: "question",
      text: "How many leads do you get each month?",
      inputType: "number",
      attribute: "monthly_lead_volume_reply",
    },
    {
      id: "check",
      type: "condition",
      match: "all",
      rules: [{ left: "{{monthly_lead_volume_reply}}", operator: "gt", right: "1000" }],
    },
    { id: "thanks", type: "send_message", text: "Thanks, we received {{monthly_lead_volume_reply}}" },
    { id: "stop", type: "end" },
  ],
  edges: [
    { source: "welcome", target: "ask" },
    { source: "ask", target: "check" },
    { source: "check", target: "thanks", sourceHandle: "true" },
    { source: "check", target: "stop", sourceHandle: "false" },
  ],
});

assert.equal(compiled.nodes.length, 5);
assert.equal(compiled.edges.length, 4);
const welcome = compiled.nodes[0] as {
  type: string;
  data: { type: string; payload: Array<{ content: string }> };
};
assert.equal(welcome.type, "send_message");
assert.equal(welcome.data.payload[0].content, "Welcome to Kyra");
const question = compiled.nodes[1] as {
  data: { payload: { question: { attribute: string; inputType: string } } };
};
assert.equal(question.data.payload.question.attribute, "monthly_lead_volume_reply");
assert.equal(question.data.payload.question.inputType, "number");
const trueEdge = compiled.edges.find((edge) => edge.sourceHandle === "true");
const falseEdge = compiled.edges.find((edge) => edge.sourceHandle === "false");
assert.ok(trueEdge);
assert.ok(falseEdge);
assert.notEqual(trueEdge?.target, falseEdge?.target);

const address = compileGeneratedFlow({
  nodes: [{ id: "a", type: "ask_address", text: "Share your address" }],
  edges: [],
});
const addressNode = address.nodes[0] as {
  type: string;
  data: { payload: { question: { inputType: string; attribute: string } } };
};
assert.equal(addressNode.type, "question");
assert.equal(addressNode.data.payload.question.inputType, "address");
assert.equal(addressNode.data.payload.question.attribute, "address");

const inverted = compileGeneratedFlow({
  nodes: [
    { id: "ask", type: "question", text: "Company name?", attribute: "company_name" },
    {
      id: "check",
      type: "condition",
      rules: [{ left: "{{company_name}}", operator: "empty" }],
    },
    { id: "retry", type: "send_message", text: "Company name is required." },
    { id: "next", type: "send_message", text: "Thanks" },
  ],
  edges: [
    { source: "ask", target: "check" },
    { source: "check", target: "next", sourceHandle: "true" },
    { source: "check", target: "retry", sourceHandle: "false" },
    { source: "retry", target: "ask" },
  ],
});
const retryId = String(
  inverted.nodes.find((node) => {
    const text = (node.data as { payload?: Array<{ content?: string }> }).payload;
    return Array.isArray(text) && text[0]?.content?.includes("required");
  })?.id,
);
const passedEdge = inverted.edges.find((edge) => edge.sourceHandle === "true");
const failedEdge = inverted.edges.find((edge) => edge.sourceHandle === "false");
assert.equal(passedEdge?.target, retryId);
assert.notEqual(failedEdge?.target, retryId);

console.log("chatflow generate checks passed");
