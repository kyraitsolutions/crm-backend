// services/visitor.service.ts

import { InitVisitorDto } from "../dtos/visitor.dto";
import { VisitorRepository } from "../repositories/visitor.repository";

export class VisitorService {
  constructor(private visitorRepository: VisitorRepository) {}

  public async initializeVisitor(visitorDto: InitVisitorDto) {
    let visitor = await this.visitorRepository.findVisitor(visitorDto);

    if (!visitor) {
      visitor = await this.visitorRepository.createVisitor(visitorDto);
    } else {
      visitor = await this.visitorRepository.updateVisitor(visitor.id, {
        lastSeenAt: new Date(),
        status: "online",
      });
    }

    return visitor;
  }
}
