import { S3Handler, S3Event } from 'aws-lambda';
import * as AWS from 'aws-sdk';

const stage = process.env.STAGE
const apiId = process.env.API_ID
const connectionsTable = process.env.CONNECTIONS_TABLE

const conenctionParams = {
  apiVersion: "2018-11-29",
  endpoint: `${apiId}.execute-api.us-east-2.amazonaws.com/${stage}`
}
const apiGateway = new AWS.ApiGatewayManagementApi(conenctionParams)
const docClient = new AWS.DynamoDB.DocumentClient()

const s3SendNotification: S3Handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const key = record.s3.object.key
    console.log(`Processing S3 item with key: ${key}`)

    const connections = await docClient.scan({
      TableName: connectionsTable
    }).promise()
    const payload = { imageId: key }

    for (const connection of connections.Items) {
      const { id: connectionId } = connection
      await sendMessageToClient(connectionId, payload)
    }
  }
}

const sendMessageToClient = async (connectionId, payload) => {
  try {
    console.log(`Sending message to connection ${connectionId}`)
    await apiGateway.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(payload)
    }).promise()
  } catch (e) {
    console.log('Failed to send message', JSON.stringify(e))
    if (e.statusCode === 410) {
      console.log('Stalen connection')
      await docClient.delete({
        TableName: connectionsTable,
        Key: {
          id: connectionId
        }
      }).promise()
    }
  }
}

export const main = s3SendNotification;
