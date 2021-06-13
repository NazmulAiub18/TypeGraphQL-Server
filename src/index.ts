import "reflect-metadata";
import { ApolloServer, ApolloError } from "apollo-server-express";
import Express from "express";
import session from "express-session";
import connectRedis from "connect-redis";
import cors from "cors";
import { GraphQLError, GraphQLFormattedError } from "graphql";
import { buildSchema, ArgumentValidationError } from "type-graphql";
import { createConnection } from "typeorm";

import { RegisterResolver } from "./modules/user/Register";
import { LoginResolver } from "./modules/user/Login";
import { redis } from "./redis";
import { MeResolver } from "./modules/user/Me";

// Declaration Merging to add types in express req.session
declare module "express-session" {
  interface SessionData {
    userId: number;
  }
}

const main = async () => {
  await createConnection();

  const schema = await buildSchema({
    resolvers: [MeResolver, RegisterResolver, LoginResolver],
    // https://typegraphql.com/docs/authorization.html
    authChecker: ({ context: { req } }) => {
      // for @Authorized() decorator
      if (req.session.userId) {
        return true;
      }

      return false; // access is denied
    },
  });

  const apolloServer = new ApolloServer({
    schema,
    formatError: (error: GraphQLError): GraphQLFormattedError => {
      if (error.originalError instanceof ApolloError) {
        return error;
      }

      if (error.originalError instanceof ArgumentValidationError) {
        const { extensions, locations, message, path } = error;

        if (error && error.extensions) {
          error.extensions.code = "GRAPHQL_VALIDATION_FAILED";
        }

        return {
          extensions,
          locations,
          message,
          path,
        };
      }

      error.message = "Internal Server Error";

      return error;
    },
    context: ({ req }: any) => ({ req }),
  });

  const app = Express();

  const RedisStore = connectRedis(session);

  app.use(
    cors({
      credentials: true,
      origin: true,
    })
  );

  app.use(
    session({
      store: new RedisStore({
        client: redis,
      }),
      name: "qid",
      secret: "qwertyuiop",
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        maxAge: 1000 * 60 * 60 * 24 * 7,
      },
    })
  );

  apolloServer.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log("Server Started At: http://localhost:4000/graphql");
  });
};

main();
