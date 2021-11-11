import { formatJSONResponse } from '@libs/apiGateway';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/apiGateway';
import { middyfy } from '@libs/lambda';
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';

import schema from './schema';

const docClient = new AWS.DynamoDB.DocumentClient()
const groupsTable = process.env.GROUPS_TABLE

const postGroups: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  // Generate uuid
  const id = uuid.v4()
  // Parse body
  const newItem = {
    id,
    ...event.body
  }
  // Create item in database
  await docClient.put({
    TableName: groupsTable,
    Item: newItem
  }).promise()

  return formatJSONResponse({
    newItem
  });
}

export const main = middyfy(postGroups);
