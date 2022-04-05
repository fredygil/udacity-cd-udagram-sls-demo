import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/apiGateway';
import { middyfy } from '@libs/lambda';
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';

import schema from './schema';
import { getUserId } from '../../libs/user';

const docClient = new AWS.DynamoDB.DocumentClient()
const groupsTable = process.env.GROUPS_TABLE

const postGroups: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  // Generate uuid
  const id = uuid.v4()
  // Get user id
  const userId = getUserId(event.headers.Authorization.split(" ")[1])
  // Parse body
  const newItem = {
    id,
    userId,
    ...event.body
  }
  // Create item in database
  await docClient.put({
    TableName: groupsTable,
    Item: newItem
  }).promise()

  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      newItem,
    }),
  };
}

export const main = middyfy(postGroups);
