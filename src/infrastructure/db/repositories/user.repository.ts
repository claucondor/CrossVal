import { UserModel, type UserDoc } from "../models/user.model";

export interface UserRepository {
  findByEmail(email: string): Promise<UserDoc | null>;
  findById(id: string): Promise<UserDoc | null>;
  create(email: string, passwordHash: string): Promise<UserDoc>;
}

export class MongoUserRepository implements UserRepository {
  findByEmail(email: string): Promise<UserDoc | null> {
    return UserModel.findOne({ email })
      .select("+passwordHash")
      .lean()
      .exec() as unknown as Promise<UserDoc | null>;
  }

  findById(id: string): Promise<UserDoc | null> {
    return UserModel.findById(id)
      .lean()
      .exec() as unknown as Promise<UserDoc | null>;
  }

  async create(email: string, passwordHash: string): Promise<UserDoc> {
    const created = await UserModel.create({ email, passwordHash });
    return created.toObject() as UserDoc;
  }
}
