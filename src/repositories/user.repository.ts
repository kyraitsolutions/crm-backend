import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, roles } from "../db/schema";
import { ICreateUser, IUpdateUser, IUser } from "../types/user";

export class UserRepository {
  async findById(id: number): Promise<IUser | undefined> {
    const result = await db
      .select({
        id: users.id,
        email: users.email,
        password: users.password,
        firstName: users.firstName,
        lastName: users.lastName,
        googleId: users.googleId,
        profilePicture: users.profilePicture,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        roleId: users.roleId,
        role: roles.name,
      })
      .from(users)
      .leftJoin(roles, eq(users.roleId, roles.id))
      .where(eq(users.id, id));
    return result[0];
  }

  async findByEmail(email: string): Promise<IUser | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async findByGoogleId(googleId: string): Promise<IUser | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.googleId, googleId));
    return result[0];
  }

  async create(data: ICreateUser): Promise<IUser> {
    const newUser: ICreateUser = {
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      googleId: data.googleId,
      profilePicture: data.profilePicture,
    };

    const result = await db.insert(users).values(newUser).returning();
    return result[0];
  }

  async update(id: number, data: IUpdateUser): Promise<IUser | undefined> {
    const updateData: Partial<IUser> = {
      ...data,
      updatedAt: new Date(),
    };

    const result = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    return result[0];
  }

  async delete(id: number): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id)).returning();
    return result.length > 0;
  }

  async findAll(): Promise<IUser[]> {
    return db.select().from(users);
  }
}
