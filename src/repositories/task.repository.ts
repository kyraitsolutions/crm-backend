import { Task } from "../models/tasks.model";

export class TaskRepository {
  async create(data: any) {
    return await Task.create(data);
  }

  async findById(taskId: string) {
    return await Task.findById(taskId);
  }

  async update(taskId: string, data: any) {
    return await Task.findByIdAndUpdate(taskId, data, { new: true });
  }

  async delete(taskId: string) {
    return await Task.findByIdAndDelete(taskId);
  }

  async find(filter: any, options: any = {}) {
    return await Task.find(filter)
      .sort(options.sort || { createdAt: -1 })
      .skip(options.skip || 0)
      .limit(options.limit || 20);
  }

  async count(filter: any) {
    return await Task.countDocuments(filter);
  }
}
