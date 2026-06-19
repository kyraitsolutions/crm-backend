// repositories/visitor.repository.ts

import { VisitorModel } from "../models/visitors.model.js";
import { TVisitor } from "../types/visitor.type.js";

export class VisitorRepository {
  public async createVisitor(data: Partial<TVisitor>) {
    return VisitorModel.create({
      ...data,
      firstSeenAt: new Date(),
      lastSeenAt: new Date(),
    });
  }

  public async findVisitor(filters: any) {
    return VisitorModel.findOne(filters);
  }

  public async updateVisitor(id: string, data: Partial<TVisitor>) {
    return VisitorModel.findByIdAndUpdate(
      id,
      {
        $set: data,
        $inc: {
          totalVisit: 1,
        },
      },
      {
        new: true,
      },
    );
  }
}
