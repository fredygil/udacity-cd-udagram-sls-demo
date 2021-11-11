import { formatJSONResponse } from '@libs/apiGateway';
import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/apiGateway';
import { middyfy } from '@libs/lambda';
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';

import schema from './schema';

const docClient = new AWS.DynamoDB.DocumentClient()
const groupsTable = process.env.GROUPS_TABLE
const imagesTable = process.env.IMAGES_TABLE

const postImage: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  const { groupId } = event.pathParameters;

  if (!groupExist(groupId)) {
    return {
      statusCode: 404,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: `Group ${groupId} doesn't exist`
      }),
    };
  }

  const newItem = {
    groupId,
    timestamp: new Date().toISOString(),
    imageId: uuid.v4(),
    title: event.body.title,
  };

  // Create item in database
  await docClient.put({
    TableName: imagesTable,
    Item: newItem
  }).promise()

  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      newItem
    }),
  };
}

const groupExist = async (groupId: string) => {
  const result = await docClient.get({
    TableName: groupsTable,
    Key: { id: groupId }
  }).promise();

  return !!result.Item;
}

export const main = middyfy(postImage);
