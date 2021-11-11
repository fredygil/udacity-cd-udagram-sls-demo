import type { AWS } from "@serverless/typescript";

import getGroups from "@functions/getGroups";
import postGroups from "@functions/postGroups";
import getImages from "@functions/getImages";
import getImage from "@functions/getImage";
import postImage from "@functions/postImage";

const stage = `\${opt:stage, 'dev'}`;
const region = 'us-east-2';

const serverlessConfiguration: AWS = {
  service: "serverless-udagram-app",
  frameworkVersion: "2",
  custom: {
    esbuild: {
      bundle: true,
      minify: false,
      sourcemap: true,
      exclude: ["aws-sdk"],
      target: "node14",
      define: { "require.resolve": undefined },
      platform: "node",
    },
  },
  plugins: ["serverless-esbuild"],
  provider: {
    name: "aws",
    runtime: "nodejs14.x",
    stage,
    region,
    apiGateway: {
      minimumCompressionSize: 1024,
      shouldStartNameWithService: true,
    },
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
      NODE_OPTIONS: "--enable-source-maps --stack-trace-limit=1000",
      GROUPS_TABLE: `Groups-${stage}`,
      IMAGES_TABLE: `Images-${stage}`,
      IMAGE_ID_INDEX: `ImageIdIndex-${stage}`,
      IMAGES_S3_BUCKET: `sls-udagram-images-${stage}`,
      SIGNED_URL_EXPIRATION: '300',
    },
    lambdaHashingVersion: "20201221",
    iamRoleStatements: [
      {
        Effect: "Allow",
        Action: ["dynamodb:Scan", "dynamodb:PutItem", "dynamodb:GetItem"],
        Resource: `arn:aws:dynamodb:${region}:*:table/Groups-${stage}`,
      },
      {
        Effect: "Allow",
        Action: ["dynamodb:Query", "dynamodb:PutItem"],
        Resource: `arn:aws:dynamodb:${region}:*:table/Images-${stage}`,
      },
      {
        Effect: "Allow",
        Action: ["dynamodb:Query"],
        Resource: `arn:aws:dynamodb:${region}:*:table/Images-${stage}/index/\${self:provider.environment.IMAGE_ID_INDEX}`,
      },
    ],
  },
  // import the function via paths
  functions: { getGroups, postGroups, getImages, getImage, postImage },
  resources: {
    Resources: {
      groupsDynamoDBTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          TableName: `Groups-${stage}`,
          AttributeDefinitions: [
            {
              AttributeName: "id",
              AttributeType: "S",
            },
          ],
          KeySchema: [
            {
              AttributeName: "id",
              KeyType: "HASH",
            },
          ],
          BillingMode: "PAY_PER_REQUEST",
        },
      },
      imagesDynamoDBTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          TableName: `Images-${stage}`,
          AttributeDefinitions: [
            {
              AttributeName: "groupId",
              AttributeType: "S",
            },
            {
              AttributeName: "timestamp",
              AttributeType: "S",
            },
            {
              AttributeName: "imageId",
              AttributeType: "S",
            },
          ],
          KeySchema: [
            {
              AttributeName: "groupId",
              KeyType: "HASH",
            },
            {
              AttributeName: "timestamp",
              KeyType: "RANGE",
            },
          ],
          GlobalSecondaryIndexes: [
            {
              IndexName: "${self:provider.environment.IMAGE_ID_INDEX}",
              KeySchema: [
                {
                  AttributeName: "imageId",
                  KeyType: "HASH",
                }
              ],
              Projection: {
                ProjectionType: 'ALL',
              },
            },
          ],
          BillingMode: "PAY_PER_REQUEST",
        },
      },
      attachmentsBucket: {
        Type: "AWS::S3::Bucket",
        Properties: {
          BucketName: "${self:provider.environment.IMAGES_S3_BUCKET}",
          CorsConfiguration: {
            CorsRules: [
              {
                AllowedOrigins: ['*'],
                AllowedHeaders: ['*'],
                AllowedMethods: ['GET', 'PUT', 'POST', 'DELETE', 'HEAD'],
                MaxAge: "${self:provider.environment.SIGNED_URL_EXPIRATION}"
              }
            ]
          }
        }
      },
      bucketPolicy: {
        Type: 'AWS::S3::BucketPolicy',
        Properties: {
          PolicyDocument: {
            Id: 'MyPolicy',
            Version: '2012-10-17',
            Statement: [
              {
                Sid: 'PublicReadForGetBucketObjects',
                Effect: 'Allow',
                Principal: '*',
                Action: 's3:GetObject',
                Resource: 'arn:aws:s3:::${self:provider.environment.IMAGES_S3_BUCKET}/*'
              }
            ]
          },
          Bucket: { Ref: "attachmentsBucket" }
        }
      }
    },
  },
  variablesResolutionMode: "20210326",
};

module.exports = serverlessConfiguration;
