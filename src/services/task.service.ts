import { TaskRepository } from "../repositories/task.repository.js";
import { ActivityLogService } from "./activityLog.service.js";

export class TaskService {
  private repository = new TaskRepository();
  private activityLogService = new ActivityLogService();

  async createTask(taskData: any, currentUser: any) {
    const task = await this.repository.create(taskData);

    await this.activityLogService.log({
      accountId: task.accountId,
      organizationId: task.organizationId,

      entityType: "task",
      entityId: task._id,

      action: "task.created",

      actor: {
        type: "user",
        id: currentUser._id,
        name: currentUser.name,
      },

      metadata: {
        title: task.title,
        entityType: task.entityType,
        entityId: task.entityId,
      },
    });

    return task;
  }

  async updateTask(taskId: string, updateData: any, currentUser: any) {
    const existingTask = await this.repository.findById(taskId);

    if (!existingTask) {
      throw new Error("Task not found");
    }

    const updatedTask = await this.repository.update(taskId, updateData);

    const changes = this.getChanges(
      existingTask.toObject(),
      updatedTask?.toObject(),
    );

    if (Object.keys(changes).length) {
      await this.activityLogService.log({
        accountId: updatedTask?.accountId,
        organizationId: updatedTask?.organizationId,

        entityType: "task",
        entityId: updatedTask?._id,

        action: "task.updated",

        actor: {
          type: "user",
          id: currentUser._id,
          name: currentUser.name,
        },

        changes,
      });
    }

    return updatedTask;
  }

  async completeTask(taskId: string, currentUser: any) {
    const task = await this.repository.findById(taskId);

    if (!task) {
      throw new Error("Task not found");
    }

    const updatedTask = await this.repository.update(taskId, {
      status: "completed",
      completedAt: new Date(),
    });

    await this.activityLogService.log({
      accountId: task.accountId,
      organizationId: task.organizationId,

      entityType: "task",
      entityId: task._id,

      action: "task.completed",

      actor: {
        type: "user",
        id: currentUser._id,
        name: currentUser.name,
      },
    });

    return updatedTask;
  }

  async deleteTask(taskId: string, currentUser: any) {
    const task = await this.repository.findById(taskId);

    if (!task) {
      throw new Error("Task not found");
    }

    await this.repository.delete(taskId);

    await this.activityLogService.log({
      accountId: task.accountId,
      organizationId: task.organizationId,

      entityType: "task",
      entityId: task._id,

      action: "task.deleted",

      actor: {
        type: "user",
        id: currentUser._id,
        name: currentUser.name,
      },

      metadata: {
        title: task.title,
      },
    });

    return true;
  }

  async getTasks(accountId: string, filter: any, skip = 0, limit = 20) {
    const criteria = {
      accountId,
      ...filter,
    };

    const [tasks, total] = await Promise.all([
      this.repository.find(criteria, {
        skip,
        limit,
      }),
      this.repository.count(criteria),
    ]);

    return {
      tasks,
      total,
    };
  }

  private getChanges(oldDoc: Record<string, any>, newDoc: Record<string, any>) {
    const changes: Record<string, any> = {};

    Object.keys(newDoc).forEach((key) => {
      if (JSON.stringify(oldDoc[key]) !== JSON.stringify(newDoc[key])) {
        changes[key] = {
          from: oldDoc[key],
          to: newDoc[key],
        };
      }
    });

    return changes;
  }
}
