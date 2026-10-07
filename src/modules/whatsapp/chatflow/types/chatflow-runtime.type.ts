export type ChatFlowNodeKind =
  | "send_message"
  | "button"
  | "list"
  | "carousel"
  | "question"
  | "template"
  | "keyword"
  | "condition"
  | "set_attribute"
  | "add_tag"
  | "remove_tag"
  | "delay"
  | "goto"
  | "end"
  | "api_request"
  | "handoff"
  | "ask_address"
  | "ask_location"
  | "ask_media"
  | "connect_flow"
  | "chat"
  | "form";

export type ChatFlowRuntimeNode = {
  id: string;
  type?: string;
  data?: {
    type?: string;
    label?: string;
    payload?: any;
    elements?: Array<{
      id?: string;
      type?: string;
      content?: string;
      title?: string;
      choices?: string[];
    }>;
  };
};

export type ChatFlowRuntimeEdge = {
  id?: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
};

export type ChatFlowInboundReply = {
  text: string;
  interactiveId?: string;
  interactiveTitle?: string;
};

export type ChatFlowHandleInboundParams = {
  accountId: string;
  organizationId?: string;
  conversationId: string;
  phone: string;
  isNewConversation: boolean;
  chatFlowId?: string | null;
  inboundMessageId?: string;
  inboundType: string;
  reply: ChatFlowInboundReply;
};

export type ChatFlowResumeParams = {
  organizationId: string;
  accountId: string;
  conversationId: string;
};
