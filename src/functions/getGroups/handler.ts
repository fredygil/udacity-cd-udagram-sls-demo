import type { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { middyfy } from '@libs/lambda';
import * as AWS from 'aws-sdk';

const docClient = new AWS.DynamoDB.DocumentClient()
const tableName = process.env.GROUPS_TABLE

const getGroups: APIGatewayProxyHandler = async (): Promise<APIGatewayProxyResult> => {
  const result = await docClient.scan({
    TableName: tableName
  }).promise()
  const items = result.Items

  const response = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      items
    }),
  };
  return response;
}

export const main = middyfy(getGroups);
