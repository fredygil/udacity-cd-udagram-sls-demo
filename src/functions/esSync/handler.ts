import { DynamoDBStreamEvent, DynamoDBStreamHandler } from "aws-lambda";
import { Client } from "@elastic/elasticsearch";
import { middyfy } from "@libs/lambda";

const client = new Client({ node: `https://${process.env.ES_ENDPOINT}` });

const esSync: DynamoDBStreamHandler = async (event: DynamoDBStreamEvent) => {
  console.log("Processing events batch from DynamoDB", JSON.stringify(event));

  for (const record of event.Records) {
    console.log("Processing record", JSON.stringify(record));

    if (record.eventName !== "INSERT") {
      continue;
    }

    const newItem = record.dynamodb.NewImage;
    const imageId = newItem.imageId.S;
    const body = {
      imageId: newItem.imageId.S,
      groupId: newItem.groupId.S,
      imageUrl: newItem.imageUrl.S,
      title: newItem.title.S,
      timestamp: newItem.timestamp.S,
    };

    if (client) {
      await client.index({
        index: "images-index",
        type: "images",
        id: imageId,
        body,
      });
    }
  }
};

export const main = middyfy(esSync);
