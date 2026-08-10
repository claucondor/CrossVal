import type { UserDoc } from "../models/user.model";

export interface UserRepository {
  findByEmail(email: string): Promise<UserDoc | null>;
  findById(id: string): Promise<UserDoc | null>;
  create(email: string, passwordHash: string): Promise<UserDoc>;
}

export class MongoUserRepository implements UserRepository {
  findByEmail(_email: string): Promise<UserDoc | null> {
    return Promise.reject(new Error("not implemented"));
  }
  findById(_id: string): Promise<UserDoc | null> {
    return Promise.reject(new Error("not implemented"));
  }
  create(_email: string, _passwordHash: string): Promise<UserDoc> {
    return Promise.reject(new Error("not implemented"));
  }
}
