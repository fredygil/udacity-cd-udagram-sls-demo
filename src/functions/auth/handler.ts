import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
  APIGatewayAuthorizerHandler,
} from "aws-lambda";
import * as AWS from "aws-sdk";
import { middyfy } from "@libs/lambda";
import {verify} from "jsonwebtoken";
import {JwtToken} from "../../libs/jwtToken";

const secretId = process.env.AUTH_0_SECRET_ID;
const secretField = process.env.AUTH_0_SECRET_FIELD;
const client = new AWS.SecretsManager();
// Cache secret if a Lambda instance is reused
let cachedSecret: string;

const auth: APIGatewayAuthorizerHandler = async (
  event: APIGatewayTokenAuthorizerEvent
): Promise<APIGatewayAuthorizerResult> => {
  try {
    const decodedToken:JwtToken = await verifyToken(event.authorizationToken);
    console.log("User was authorized");

    return makePolicy({ Effect: "Allow" }, decodedToken.sub);
  } catch (e) {
    console.log("User was not authorized");
    console.log(
      "Return policy",
      JSON.stringify(makePolicy({ Effect: "Deny" }))
    );
    return makePolicy({ Effect: "Deny" });
  }
};

const makePolicy = (statement: any, userId?: string): APIGatewayAuthorizerResult => {
  return {
    principalId: userId || "user",
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

const verifyToken = async (authHeader: string): Promise<JwtToken> => {
  if (!authHeader) throw new Error("No authorization header");

  if (!authHeader.toLocaleLowerCase().startsWith("bearer "))
    throw new Error("Invalid authorization header");

  const token = authHeader.split(" ")[1];
  const secretObject = await getSecret()
  const auth0Secret = secretObject[secretField]

  return verify(token, auth0Secret);
};

const getSecret = async () => {
  if (cachedSecret) return cachedSecret;

  const data = await client.getSecretValue({SecretId: secretId}).promise();
  cachedSecret = data.SecretString

  return JSON.parse(cachedSecret)
}

export const main = middyfy(auth);
