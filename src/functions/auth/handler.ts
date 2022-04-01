import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
  APIGatewayAuthorizerHandler,
} from "aws-lambda";
import { middyfy } from "@libs/lambda";

const auth: APIGatewayAuthorizerHandler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  try {
    verifyToken(event.authorizationToken);
    console.log("User was authorized");

    return makePolicy({ Effect: "Allow" });
  } catch (e) {
    console.log("User was not authorized");
    console.log(
      "Return policy",
      JSON.stringify(makePolicy({ Effect: "Deny" }))
    );
    return makePolicy({ Effect: "Deny" });
  }
};

const makePolicy = (statement: any): APIGatewayAuthorizerResult => {
  return {
    principalId: "user",
    policyDocument: {
      Version: "2012-10-17",
      Statement: [
        {
          Action: "execute-api:Invoke",
          Effect: "Deny",
          Resource: "*",
          ...statement,
        },
      ],
    },
  };
};

const verifyToken = (authHeader: string) => {
  if (!authHeader) throw new Error("No authorization header");

  if (!authHeader.toLocaleLowerCase().startsWith("bearer "))
    throw new Error("Invalid authorization header");

  const token = authHeader.split(" ")[1];
  if (token !== "123") throw new Error("Invalid token");

  return true;
};

export const main = middyfy(auth);
