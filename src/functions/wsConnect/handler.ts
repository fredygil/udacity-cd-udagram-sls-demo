import type { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { middyfy } from '@libs/lambda';
import * as AWS from 'aws-sdk';

const docClient = new AWS.DynamoDB.DocumentClient()
const tableName = process.env.CONNECTIONS_TABLE

const wsConnect: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Websocket connect', event)

  const { connectionId: id } = event.requestContext
  const timestamp = new Date().toISOString()

  const item = {
    id,
    timestamp
  }

  // Create item in database
  await docClient.put({
    TableName: tableName,
    Item: item
  }).promise()

  return {
    statusCode: 200,
    body: ''
  };
}

export const main = middyfy(wsConnect);
