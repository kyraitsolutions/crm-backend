import type {
  ChatFlowInboundReply,
  ChatFlowNodeKind,
  ChatFlowRuntimeEdge,
  ChatFlowRuntimeNode,
} from "../types/chatflow-runtime.type.js";

const WAIT_NODE_KINDS = new Set<ChatFlowNodeKind>([
  "button",
  "list",
  "question",
  "ask_address",
  "ask_location",
  "ask_media",
  "chat",
]);

type InteractiveChoice = {
  id: string;
  title: string;
};

export function nodeKind(node?: ChatFlowRuntimeNode | null): ChatFlowNodeKind {
  const kind = String(node?.data?.type || node?.type || "").trim();
  switch (kind) {
    case "send_message":
    case "button":
    case "list":
    case "carousel":
    case "question":
    case "template":
    case "keyword":
    case "condition":
    case "set_attribute":
    case "add_tag":
    case "remove_tag":
    case "delay":
    case "goto":
    case "end":
    case "api_request":
    case "handoff":
    case "ask_address":
    case "ask_location":
    case "ask_media":
    case "connect_flow":
    case "chat":
    case "form":
      return kind;
    default:
      return "send_message";
  }
}

export function findNode(
  nodes: ChatFlowRuntimeNode[],
  nodeId?: string | null,
): ChatFlowRuntimeNode | null {
  if (!nodeId) return null;
  return nodes.find((node) => node.id === nodeId) || null;
}

export function findStartNode(
  nodes: ChatFlowRuntimeNode[],
  edges: ChatFlowRuntimeEdge[],
): ChatFlowRuntimeNode | null {
  if (!nodes.length) return null;
  const targeted = new Set(edges.map((edge) => edge.target).filter(Boolean));
  return nodes.find((node) => !targeted.has(node.id)) || nodes[0];
}

export function outgoingEdges(
  edges: ChatFlowRuntimeEdge[],
  nodeId: string,
): ChatFlowRuntimeEdge[] {
  return edges.filter((edge) => edge.source === nodeId);
}

export function isWaitNode(node?: ChatFlowRuntimeNode | null): boolean {
  if (!node) return false;
  const kind = nodeKind(node);
  if (kind === "chat") {
    return Boolean(
      node.data?.elements?.some(
        (element) =>
          element.type === "option" && (element.choices?.length || element.title),
      ),
    );
  }
  return WAIT_NODE_KINDS.has(kind);
}

export function resolveNextEdge(
  nodes: ChatFlowRuntimeNode[],
  edges: ChatFlowRuntimeEdge[],
  currentNodeId: string | null | undefined,
  reply: ChatFlowInboundReply,
): ChatFlowRuntimeEdge | null {
  const replyId = normalize(reply.interactiveId);
  const replyTitle = normalize(reply.interactiveTitle || reply.text);

  if (replyId) {
    const byHandle = matchEdgeByHandle(edges, replyId, "");
    if (byHandle) return byHandle;
  }

  for (const node of nodes) {
    const choices = interactiveChoices(node);
    const choice = matchInteractiveChoice(choices, replyId, replyTitle);
    if (!choice) continue;

    const outgoing = outgoingEdges(edges, node.id);
    const byChoice = matchEdgeByHandle(
      outgoing,
      normalize(choice.id),
      normalize(choice.title),
    );
    if (byChoice) return byChoice;

    const choiceIndex = choices.findIndex((item) => item.id === choice.id);
    if (choiceIndex >= 0 && outgoing[choiceIndex]) {
      return outgoing[choiceIndex];
    }
  }

  if (replyTitle) {
    const byTitle = matchEdgeByHandle(edges, "", replyTitle);
    if (byTitle) return byTitle;
  }

  const currentNode = findNode(nodes, currentNodeId);
  if (!currentNode) return null;

  const kind = nodeKind(currentNode);
  if (
    kind === "question" ||
    kind === "send_message" ||
    kind === "carousel" ||
    kind === "template" ||
    kind === "delay" ||
    kind === "set_attribute" ||
    kind === "add_tag" ||
    kind === "remove_tag"
  ) {
    return outgoingEdges(edges, currentNode.id)[0] || null;
  }

  return null;
}

export function matchOutgoingEdge(
  edges: ChatFlowRuntimeEdge[],
  node: ChatFlowRuntimeNode,
  reply: ChatFlowInboundReply,
): ChatFlowRuntimeEdge | null {
  return resolveNextEdge([node], edges, node.id, reply);
}

function interactiveChoices(node: ChatFlowRuntimeNode): InteractiveChoice[] {
  const kind = nodeKind(node);
  const payload = node.data?.payload;
  const interactive = payload?.interactive || payload;

  if (kind === "button") {
    const buttons = interactive?.action?.buttons || [];
    return buttons
      .map((button: any) => {
        const reply = button?.reply || button?.quick_reply || {};
        return {
          id: String(reply.id || ""),
          title: String(reply.title || ""),
        };
      })
      .filter((choice: InteractiveChoice) => choice.id || choice.title);
  }

  if (kind === "list") {
    const sections = interactive?.action?.sections || [];
    return sections.flatMap((section: any) =>
      (section?.rows || [])
        .map((row: any) => ({
          id: String(row?.id || ""),
          title: String(row?.title || ""),
        }))
        .filter((choice: InteractiveChoice) => choice.id || choice.title),
    );
  }

  if (kind === "chat") {
    return (node.data?.elements || [])
      .filter((element) => element.type === "option")
      .flatMap((element) => {
        const titles = element.choices?.length
          ? element.choices
          : element.title
            ? [element.title]
            : [];
        return titles.map((title, index) => ({
          id: `${element.id || "option"}-${index}`,
          title: String(title || ""),
        }));
      })
      .filter((choice) => choice.title);
  }

  return [];
}

function matchInteractiveChoice(
  choices: InteractiveChoice[],
  replyId: string,
  replyTitle: string,
): InteractiveChoice | null {
  if (!choices.length) return null;

  if (replyId) {
    const byId = choices.find((choice) => normalize(choice.id) === replyId);
    if (byId) return byId;
  }

  if (replyTitle) {
    const byTitle = choices.find((choice) => titlesMatch(choice.title, replyTitle));
    if (byTitle) return byTitle;
  }

  return null;
}

function matchEdgeByHandle(
  edges: ChatFlowRuntimeEdge[],
  replyId: string,
  replyTitle: string,
): ChatFlowRuntimeEdge | undefined {
  return edges.find((edge) => {
    const handle = normalize(edge.sourceHandle);
    if (!handle) return false;
    if (replyId && (handle === replyId || handle.endsWith(replyId))) return true;
    if (replyTitle && (handle === replyTitle || titlesMatch(handle, replyTitle))) {
      return true;
    }
    return false;
  });
}

function titlesMatch(left: string, right: string) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return false;
  if (a === b) return true;
  return a.startsWith(b) || b.startsWith(a);
}

function normalize(value: unknown) {
  return String(value || "").trim().toLowerCase();
}
