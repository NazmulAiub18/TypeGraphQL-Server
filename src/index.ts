import "reflect-metadata";
import { ApolloServer, ApolloError } from "apollo-server-express";
import Express from "express";
import { GraphQLError, GraphQLFormattedError } from "graphql";
import { buildSchema, ArgumentValidationError } from "type-graphql";
import { createConnection } from "typeorm";

import { RegisterResolver } from "./modules/user/Register";

const main = async () => {
  await createConnection();

  const schema = await buildSchema({
    resolvers: [RegisterResolver],
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
  });

  const app = Express();

  apolloServer.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log("Server Started At: http://localhost:4000/graphql");
  });
};

main();
