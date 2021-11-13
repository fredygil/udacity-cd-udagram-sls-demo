import type { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { middyfy } from '@libs/lambda';
import * as AWS from 'aws-sdk';

const docClient = new AWS.DynamoDB.DocumentClient()
const tableName = process.env.CONNECTIONS_TABLE

const wsDisconnect: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  console.log('Websocket disconnect', event)

  const { connectionId: id } = event.requestContext

  const key = {
    id
  }

  // Delete item from database
  await docClient.delete({
    TableName: tableName,
    Key: key
  }).promise()

  return {
    statusCode: 200,
    body: ''
  };
}

export const main = middyfy(wsDisconnect);
