import { handlerPath } from '@libs/handlerResolver';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      stream: {
        type: "dynamodb",
        arn: { 'Fn::GetAtt': ["imagesDynamoDBTable", "StreamArn"] },
      }
    }
  ],
  environment: {
    ES_ENDPOINT: { 'Fn::GetAtt': ["imagesSearch", "DomainEndpoint"] }
  },
}
