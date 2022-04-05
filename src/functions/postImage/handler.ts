import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/apiGateway';
import { middyfy } from '@libs/lambda';
import * as AWS from 'aws-sdk';
import * as uuid from 'uuid';
import { getUserId } from '@libs/user';
import schema from './schema';

const docClient = new AWS.DynamoDB.DocumentClient()

const s3 = new AWS.S3({
  signatureVersion: 'v4'
})

const groupsTable = process.env.GROUPS_TABLE
const imagesTable = process.env.IMAGES_TABLE
const bucketName = process.env.IMAGES_S3_BUCKET
const urlExpiration = process.env.SIGNED_URL_EXPIRATION

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

  const imageId = uuid.v4()
    // Get user id
    const userId = getUserId(event.headers.Authorizatorion.split(" ")[1])

  const newItem = {
    groupId,
    timestamp: new Date().toISOString(),
    imageId,
    userId,
    title: event.body.title,
    imageUrl: `https://${bucketName}.s3.amazonaws.com/${imageId}`,
  };

  // Create item in database
  await docClient.put({
    TableName: imagesTable,
    Item: newItem
  }).promise()

  const url = await getUploadUrl(imageId)

  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      newItem,
      uploadUrl: url
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

const getUploadUrl = async (imageId: string) => {
  return s3.getSignedUrl('putObject', {
    Bucket: bucketName,
    Key: imageId,
    Expires: parseInt(urlExpiration)
  })
}

export const main = middyfy(postImage);
