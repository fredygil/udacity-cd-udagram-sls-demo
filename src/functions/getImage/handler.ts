import type { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { middyfy } from '@libs/lambda';
import * as AWS from 'aws-sdk';

const docClient = new AWS.DynamoDB.DocumentClient()
const imagesTable = process.env.IMAGES_TABLE
const imagesIndex = process.env.IMAGE_ID_INDEX

const getImage: APIGatewayProxyHandler = async (event): Promise<APIGatewayProxyResult> => {
  const { imageId } = event.pathParameters;

  const result = await docClient.query({
    TableName: imagesTable,
    IndexName: imagesIndex,
    KeyConditionExpression: 'imageId = :imageId',
    ExpressionAttributeValues: {
      ':imageId': imageId,
    },
  }).promise();

  if (result.Count !== 0) {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(result.Items[0]),
    };
  }

  return {
    statusCode: 404,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: '',
  };
}

export const main = middyfy(getImage);
