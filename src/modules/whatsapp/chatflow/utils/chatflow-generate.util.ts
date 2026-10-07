import { safeRequestUrl } from "./chatflow-logic.util.js";

const MAX_NODES = 12;
const QUESTION_TYPES = new Set([
  "text",
  "email",
  "phone",
  "number",
  "date",
  "datetime",
  "buttons",
  "location",
  "address",
  "media",
]);
const OPERATORS = new Set([
  "equals",
  "not_equals",
  "contains",
  "not_contains",
  "gt",
  "gte",
  "lt",
  "lte",
  "empty",
  "not_empty",
]);
const LABELS: Record<string, string> = {
  send_message: "Send Message",
  question: "Ask Question",
  button: "Text Buttons",
  list: "List",
  condition: "Condition",
  keyword: "Keyword",
  delay: "Delay",
  goto: "Go To",
  end: "End Flow",
  set_attribute: "Set Attribute",
  add_tag: "Add Tag",
  remove_tag: "Remove Tag",
  api_request: "API Request",
  handoff: "Request Intervention",
};

type GeneratedStep = {
  id?: string;
  type?: string;
  text?: string;
  inputType?: string;
  attribute?: string;
  options?: string[];
  buttons?: string[];
  rows?: Array<{ title?: string; description?: string }>;
  listButton?: string;
  words?: string;
  match?: string;
  rules?: Array<{ left?: string; operator?: string; right?: string }>;
  key?: string;
  value?: string;
  scope?: string;
  dataType?: string;
  tag?: string;
  amount?: number;
  unit?: string;
  target?: string;
  url?: string;
  method?: string;
  note?: string;
  reason?: string;
  customerMessage?: string;
  priority?: string;
};

type GeneratedEdge = {
  source?: string;
  target?: string;
  sourceHandle?: string;
};

export type CompiledChatFlow = {
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
};

export function compileGeneratedFlow(plan: {
  nodes?: unknown;
  edges?: unknown;
}): CompiledChatFlow {
  const steps = (Array.isArray(plan.nodes) ? plan.nodes : [])
    .map(normalizeStep)
    .filter((step): step is GeneratedStep & { id: string; type: string } =>
      Boolean(step.id && step.type && LABELS[step.type]),
    )
    .slice(0, MAX_NODES);

  if (!steps.length) {
    throw new Error("The AI did not return any usable nodes");
  }

  const idMap = new Map<string, string>();
  steps.forEach((step, index) => {
    idMap.set(step.id, `node_${index + 1}_${createId()}`);
  });

  const nodes = steps.map((step) => {
    const id = idMap.get(step.id) as string;
    return {
      id,
      type: step.type,
      position: { x: 0, y: 0 },
      data: {
        label: LABELS[step.type],
        type: step.type,
        payload: payloadFor(step, idMap),
      },
    };
  });

  const known = new Set(nodes.map((node) => node.id));
  const branchCount = new Map<string, number>();
  const edges = (Array.isArray(plan.edges) ? plan.edges : [])
    .map((edge) => normalizeEdge(edge))
    .map((edge) => {
      const source = idMap.get(String(edge.source || ""));
      const target = idMap.get(String(edge.target || ""));
      if (!source || !target || !known.has(source) || !known.has(target) || source === target) {
        return null;
      }
      const sourceType = steps.find((step) => idMap.get(step.id) === source)?.type || "";
      const seen = branchCount.get(source) || 0;
      branchCount.set(source, seen + 1);
      const sourceHandle = branchHandle(sourceType, edge.sourceHandle, seen);
      return {
        id: `edge_${createId()}`,
        source,
        target,
        type: "custom",
        animated: true,
        ...(sourceHandle ? { sourceHandle } : {}),
      };
    })
    .filter((edge): edge is NonNullable<typeof edge> => Boolean(edge));

  applyLayout(nodes, edges);
  correctEmptyBranches(nodes, edges);
  return { nodes, edges };
}

function normalizeStep(value: unknown): GeneratedStep {
  const step = (value && typeof value === "object" ? value : {}) as GeneratedStep;
  let type = String(step.type || "").trim();
  if (type === "ask_address") {
    type = "question";
    step.inputType = "address";
  }
  if (type === "ask_location") {
    type = "question";
    step.inputType = "location";
  }
  if (type === "ask_media") {
    type = "question";
    step.inputType = "media";
  }
  return {
    ...step,
    id: String(step.id || "").trim(),
    type,
    text: clip(step.text, 1024),
  };
}

function normalizeEdge(value: unknown): GeneratedEdge {
  return (value && typeof value === "object" ? value : {}) as GeneratedEdge;
}

function payloadFor(step: GeneratedStep, idMap: Map<string, string>) {
  switch (step.type) {
    case "send_message":
      return [
        {
          id: createId(),
          type: "text",
          content: step.text || "Hello",
        },
      ];
    case "question":
      return questionPayload(step);
    case "button":
      return buttonPayload(step);
    case "list":
      return listPayload(step);
    case "condition":
      return {
        type: "condition",
        condition: {
          match: step.match === "any" ? "any" : "all",
          rules: conditionRules(step.rules),
        },
      };
    case "keyword":
      return {
        type: "keyword",
        keyword: {
          words: clip(step.words || step.text, 200) || "yes",
          match: ["exact", "phrase"].includes(String(step.match)) ? step.match : "contains",
          caseSensitive: false,
        },
      };
    case "set_attribute":
      return {
        type: "set_attribute",
        attribute: {
          key: safeKey(step.key || step.attribute) || "name",
          value: clip(step.value, 300) || "{{reply}}",
          scope: ["contact", "conversation"].includes(String(step.scope)) ? step.scope : "flow",
          dataType: step.dataType === "number" ? "number" : "text",
        },
      };
    case "add_tag":
    case "remove_tag":
      return {
        type: step.type,
        tag: { name: clip(step.tag || step.text, 40).toLowerCase() || "flow-test" },
      };
    case "delay":
      return delayPayload(step);
    case "goto": {
      const target = idMap.get(String(step.target || "")) || "";
      return { type: "goto", goto: { targetNodeId: target } };
    }
    case "api_request":
      return {
        type: "api_request",
        request: {
          method: ["POST", "PUT", "PATCH", "DELETE"].includes(String(step.method))
            ? step.method
            : "GET",
          url: safeRequestUrl(String(step.url || "")) || "",
          headers: [],
          query: [],
          body: "",
          timeoutMs: 8000,
          saveAs: "api",
        },
      };
    case "handoff":
      return {
        type: "handoff",
        handoff: {
          note: clip(step.note || step.text, 500),
          reason: clip(step.reason, 200),
          priority: ["low", "high"].includes(String(step.priority)) ? step.priority : "normal",
          customerMessage: clip(step.customerMessage, 500),
        },
      };
    case "end":
      return { type: "end" };
    default:
      return { type: step.type };
  }
}

function questionPayload(step: GeneratedStep) {
  const inputType = QUESTION_TYPES.has(String(step.inputType)) ? String(step.inputType) : "text";
  const options = stringList(step.options).slice(0, 3);
  return {
    type: "question",
    question: {
      text: step.text || "How can we help?",
      inputType: inputType === "buttons" && !options.length ? "text" : inputType,
      required: true,
      attribute:
        safeKey(step.attribute) ||
        (inputType === "address"
          ? "address"
          : inputType === "location"
            ? "location"
            : inputType === "media"
              ? "media"
              : ""),
      retryMessage: "",
      maxAttempts: 2,
      options,
    },
  };
}

function buttonPayload(step: GeneratedStep) {
  const titles = (stringList(step.buttons).length ? stringList(step.buttons) : ["Yes", "No"]).slice(0, 3);
  return {
    type: "interactive",
    interactive: {
      type: "button",
      header: { type: "text", text: "" },
      body: { text: step.text || "Please choose an option" },
      footer: { text: "" },
      action: {
        buttons: titles.map((title, index) => ({
          type: "reply",
          reply: {
            id: `btn_${index + 1}_${createId()}`,
            title: title.slice(0, 20),
          },
        })),
      },
    },
  };
}

function listPayload(step: GeneratedStep) {
  const rows = (Array.isArray(step.rows) ? step.rows : [])
    .map((row) => ({
      title: clip(row?.title, 24),
      description: clip(row?.description, 72),
    }))
    .filter((row) => row.title)
    .slice(0, 10);
  const usable = rows.length ? rows : [{ title: "Option 1", description: "" }];
  return {
    type: "interactive",
    interactive: {
      type: "list",
      header: { type: "text", text: "" },
      body: { text: step.text || "Please choose" },
      footer: { text: "" },
      action: {
        button: clip(step.listButton, 20) || "Choose",
        sections: [
          {
            title: "Options",
            rows: usable.map((row, index) => ({
              id: `row_${index + 1}_${createId()}`,
              title: row.title,
              description: row.description,
            })),
          },
        ],
      },
    },
  };
}

function conditionRules(rules: GeneratedStep["rules"]) {
  const parsed = (rules || [])
    .map((rule) => ({
      left: clip(rule?.left, 80) || "{{reply}}",
      operator: OPERATORS.has(String(rule?.operator)) ? String(rule?.operator) : "not_empty",
      right: clip(rule?.right, 80),
    }))
    .slice(0, 4);
  return parsed.length ? parsed : [{ left: "{{reply}}", operator: "not_empty", right: "" }];
}

function delayPayload(step: GeneratedStep) {
  const unit = ["minutes", "hours", "days"].includes(String(step.unit)) ? String(step.unit) : "seconds";
  const caps: Record<string, number> = { seconds: 300, minutes: 1440, hours: 72, days: 30 };
  const amount = Math.min(caps[unit], Math.max(1, Number(step.amount) || 5));
  return {
    type: "delay",
    delay: {
      unit,
      amount,
      seconds: unit === "seconds" ? amount : 5,
    },
  };
}

function branchHandle(type: string, raw: string | undefined, index: number) {
  if (type !== "condition" && type !== "keyword" && type !== "api_request") return undefined;
  const positive = type === "keyword" ? "matched" : type === "api_request" ? "success" : "true";
  const negative = type === "keyword" ? "unmatched" : type === "api_request" ? "failure" : "false";
  const value = String(raw || "").trim().toLowerCase();
  if (["true", "yes", "matched", "success"].includes(value)) return positive;
  if (["false", "no", "unmatched", "failure"].includes(value)) return negative;
  return index === 0 ? positive : negative;
}

export function correctEmptyBranches(
  nodes: Array<Record<string, any>>,
  edges: Array<Record<string, any>>,
) {
  const upstreamOf = new Map<string, Set<string>>();
  for (const node of nodes) {
    const upstream = new Set<string>();
    const stack = [String(node.id)];
    const seen = new Set<string>();
    while (stack.length) {
      const current = stack.pop() as string;
      for (const edge of edges) {
        if (edge.target !== current || seen.has(edge.source)) continue;
        seen.add(String(edge.source));
        upstream.add(String(edge.source));
        stack.push(String(edge.source));
      }
    }
    upstreamOf.set(String(node.id), upstream);
  }

  for (const node of nodes) {
    if (node.type !== "condition") continue;
    const rules = node.data?.payload?.condition?.rules || [];
    const operators = rules.map((rule: { operator?: string }) => rule.operator);
    const checksEmpty = operators.length > 0 && operators.every((operator: string) => operator === "empty");
    const checksPresent = operators.length > 0 && operators.every((operator: string) => operator === "not_empty");
    if (!checksEmpty && !checksPresent) continue;

    const outgoing = edges.filter((edge) => edge.source === node.id);
    const trueEdge = outgoing.find((edge) => edge.sourceHandle === "true");
    const falseEdge = outgoing.find((edge) => edge.sourceHandle === "false");
    if (!trueEdge || !falseEdge) continue;

    const trueRetries = pathRevisits(String(trueEdge.target), upstreamOf.get(String(node.id)) || new Set(), edges);
    const falseRetries = pathRevisits(String(falseEdge.target), upstreamOf.get(String(node.id)) || new Set(), edges);
    if (trueRetries === falseRetries) continue;

    const retryIsOnTrue = trueRetries;
    const retryShouldBeOnTrue = checksEmpty;
    if (retryIsOnTrue === retryShouldBeOnTrue) continue;
    trueEdge.sourceHandle = "false";
    falseEdge.sourceHandle = "true";
  }
}

function pathRevisits(start: string, upstream: Set<string>, edges: Array<Record<string, any>>) {
  const queue = [start];
  const seen = new Set<string>();
  while (queue.length) {
    const current = queue.shift() as string;
    if (seen.has(current)) continue;
    seen.add(current);
    if (upstream.has(current)) return true;
    for (const edge of edges) {
      if (edge.source === current) queue.push(String(edge.target));
    }
  }
  return false;
}

function applyLayout(
  nodes: Array<Record<string, unknown>>,
  edges: Array<Record<string, unknown>>,
) {
  const ids = nodes.map((node) => String(node.id));
  const incoming = new Set(edges.map((edge) => String(edge.target)));
  const start = ids.find((id) => !incoming.has(id)) || ids[0];
  const depth = new Map<string, number>([[start, 0]]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift() as string;
    edges
      .filter((edge) => edge.source === current)
      .forEach((edge) => {
        const target = String(edge.target);
        if (depth.has(target)) return;
        depth.set(target, (depth.get(current) || 0) + 1);
        queue.push(target);
      });
  }
  const columns = new Map<number, string[]>();
  ids.forEach((id, index) => {
    const column = depth.get(id) ?? index;
    columns.set(column, [...(columns.get(column) || []), id]);
  });
  const position = new Map<string, { x: number; y: number }>();
  columns.forEach((columnIds, column) => {
    columnIds.forEach((id, row) => {
      position.set(id, { x: 80 + column * 420, y: 80 + row * 260 });
    });
  });
  nodes.forEach((node) => {
    node.position = position.get(String(node.id)) || { x: 80, y: 80 };
  });
}

function stringList(value: unknown) {
  return (Array.isArray(value) ? value : [])
    .map((item) => clip(item, 80))
    .filter(Boolean);
}

function safeKey(value: unknown) {
  return String(value || "").replace(/[^a-zA-Z0-9_]/g, "").slice(0, 40);
}

function clip(value: unknown, max: number) {
  return String(value || "").trim().slice(0, max);
}

function createId() {
  return Math.random().toString(36).slice(2, 10);
}
