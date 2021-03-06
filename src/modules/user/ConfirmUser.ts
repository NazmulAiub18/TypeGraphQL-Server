import { Arg, Mutation, Resolver } from "type-graphql";

import { User } from "../../entity/User";
import { redis } from "../../redis";

@Resolver()
export class ConfirmUserResolver {
  @Mutation(() => Boolean)
  async confirmUser(@Arg("token") token: string): Promise<boolean> {
    const userId = await redis.get(token);

    if (!userId) {
      return false;
    }

    await User.update({ id: parseInt(userId) }, { confirmed: true });
    await redis.del(token);

    return true;
  }
}
