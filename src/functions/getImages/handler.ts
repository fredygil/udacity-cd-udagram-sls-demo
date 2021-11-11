import type { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { middyfy } from '@libs/lambda';
import * as AWS from 'aws-sdk';

const docClient = new AWS.DynamoDB.DocumentClient()
const groupsTable = process.env.GROUPS_TABLE
const imagesTable = process.env.IMAGES_TABLE

const getImages: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  const { groupId } = event.pathParameters;

  const validGroup = await groupExist(groupId);
  if (!validGroup) {
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

  const images = await getImagesPerGroup(groupId);

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      items: images
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

const getImagesPerGroup = async (groupId: string) => {
  const result = await docClient.query({
    TableName: imagesTable,
    KeyConditionExpression: 'groupId = :groupId',
    ExpressionAttributeValues: {
      ':groupId': groupId
    },
    // descending date
    ScanIndexForward: false,
  }).promise();

  return result.Items;
}

export const main = middyfy(getImages);
