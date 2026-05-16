import {
  TChatFlow,
  TChatFlowEdge,
  TChatFlowNode,
} from "../types/chatflow.type";
export class CreateChatFlowDto {
  name!: string;
  description: string = "";
  accountId!: string;
  nodes!: TChatFlowNode[];
  edges!: TChatFlowEdge[];
  status!: "draft" | "published";
  organizationId!: string;
  createdBy!: string;

  constructor(data: Partial<CreateChatFlowDto>) {
    Object.assign(this, data);

    if (!this.name) throw new Error("name is required");
    if (!this.accountId) throw new Error("accountId is required");
    if (!this.nodes) throw new Error("nodes is required");
    if (!Array.isArray(this.nodes)) throw new Error("nodes must be an array");
    if (!this.nodes.length) throw new Error("nodes must not be empty");
  }
}

export class ResponseChatFlowDto {
  id!: string;
  name!: string;
  description: string = "";
  accountId!: string;
  createdBy!: string;

  constructor(data: ResponseChatFlowDto) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.accountId = data.accountId;
    this.createdBy = data.createdBy;
  }
}
