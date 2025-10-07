export class ChatBotDto {
  id: number;
  name: string;
  description: string;
  createdAt: Date;
  updatedAt: Date;
  constructor(data: {
    id: number;
    name: string;
    description: string;
    createdAt: Date;
    updatedAt: Date;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.createdAt = data.createdAt;
    this.updatedAt = data.updatedAt;
  }
}

export class CreateChatBotDto {
  name: string;
  description: string;
  constructor(data: { name: string; description: string }) {
    this.name = data.name;
    this.description = data.description;
  }
}
