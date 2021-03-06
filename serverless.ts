import type { AWS } from "@serverless/typescript";

import getGroups from "@functions/getGroups";
import postGroups from "@functions/postGroups";
import getImages from "@functions/getImages";
import getImage from "@functions/getImage";
import postImage from "@functions/postImage";
import sendUploadNotifications from "@functions/sendUploadNotifications";
import resizeImage from "@functions/resizeImage";
import wsConnect from "@functions/wsConnect";
import wsDisconnect from "@functions/wsDisconnect";
import esSync from "@functions/esSync";
import auth from "@functions/auth";
import authrs256 from "@functions/authrs256";

const stage = `\${opt:stage, 'dev'}`;
const region = "us-east-2";
const service = "serverless-udagram-app";

const serverlessConfiguration: AWS = {
  service,
  frameworkVersion: "2",
  custom: {
    bundle: {
      linting: false,
    },
    topicName: `imagesTopic-${stage}`,
    "serverless-offline": { httpPort: 3003 },
    dynamodb: {
      stages: ['dev'],
      start: {
        port: 8000,
        inMemory: true,
        migrate: true,
        shell: true,
      },
    },
  },
  plugins: [
    "serverless-bundle",
    "serverless-dynamodb-local",
    "serverless-offline",
  ],
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
      CONNECTIONS_TABLE: `Connections-${stage}`,
      IMAGE_ID_INDEX: `ImageIdIndex-${stage}`,
      IMAGES_S3_BUCKET: `sls-udagram-images-${stage}`,
      SIGNED_URL_EXPIRATION: "300",
      THUMBNAILS_S3_BUCKET: `sls-udagram-thumbnails-${stage}`,
      AUTH_0_SECRET_ID: `Auth0Secret-${stage}`,
      AUTH_0_SECRET_FIELD: "auth0Secret",
      AUTH_0_CERT_ID: `Auth0Cert-${stage}`,
      AUTH_0_CERT_FIELD: "auth0Cert",
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
      {
        Effect: "Allow",
        Action: ["s3:PutObject", "s3:GetObject"],
        Resource: `arn:aws:s3:::\${self:provider.environment.IMAGES_S3_BUCKET}/*`,
      },
      {
        Effect: "Allow",
        Action: ["s3:PutObject"],
        Resource: `arn:aws:s3:::\${self:provider.environment.THUMBNAILS_S3_BUCKET}/*`,
      },
      {
        Effect: "Allow",
        Action: ["dynamodb:Scan", "dynamodb:PutItem", "dynamodb:DeleteItem"],
        Resource: `arn:aws:dynamodb:${region}:*:table/\${self:provider.environment.CONNECTIONS_TABLE}`,
      },
      {
        Effect: "Allow",
        Action: ["secretsmanager:GetSecretValue"],
        Resource: { Ref: "Auth0Secret" },
      },
      {
        Effect: "Allow",
        Action: ["secretsmanager:GetSecretValue"],
        Resource: { Ref: "Auth0Cert" },
      },
      {
        Effect: "Allow",
        Action: ["kms:Decrypt"],
        Resource: [{ "Fn::GetAtt": ["KMSKeySecret", "Arn"] }],
      },
      {
        Effect: "Allow",
        Action: ["kms:Decrypt"],
        Resource: [{ "Fn::GetAtt": ["KMSKeyCert", "Arn"] }],
      },
    ],
  },
  // import the function via paths
  functions: {
    getGroups,
    postGroups,
    getImages,
    getImage,
    postImage,
    sendUploadNotifications,
    resizeImage,
    wsConnect,
    wsDisconnect,
    esSync,
    auth,
    authrs256,
  },
  resources: {
    Resources: {
      GatewayResponseDefault4XX: {
        Type: "AWS::ApiGateway::GatewayResponse",
        Properties: {
          ResponseParameters: {
            "gatewayresponse.header.Access-Control-Allow-Origin": "'*'",
            "gatewayresponse.header.Access-Control-Allow-Headers":
              "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
            "gatewayresponse.header.Access-Control-Allow-Methods":
              "'GET,OPTIONS,POST'",
          },
          ResponseType: "DEFAULT_4XX",
          RestApiId: {
            Ref: "ApiGatewayRestApi",
          },
        },
      },
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
                },
              ],
              Projection: {
                ProjectionType: "ALL",
              },
            },
          ],
          BillingMode: "PAY_PER_REQUEST",
          StreamSpecification: {
            StreamViewType: "NEW_IMAGE",
          },
        },
      },
      connectionsDynamoDBTable: {
        Type: "AWS::DynamoDB::Table",
        Properties: {
          TableName: "${self:provider.environment.CONNECTIONS_TABLE}",
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
      attachmentsBucket: {
        Type: "AWS::S3::Bucket",
        Properties: {
          BucketName: "${self:provider.environment.IMAGES_S3_BUCKET}",
          NotificationConfiguration: {
            TopicConfigurations: [
              {
                Event: "s3:ObjectCreated:Put",
                Topic: { Ref: "imagesTopic" },
              },
            ],
          },
          CorsConfiguration: {
            CorsRules: [
              {
                AllowedOrigins: ["*"],
                AllowedHeaders: ["*"],
                AllowedMethods: ["GET", "PUT", "POST", "DELETE", "HEAD"],
                MaxAge: "${self:provider.environment.SIGNED_URL_EXPIRATION}",
              },
            ],
          },
        },
      },
      thumbnailsBucket: {
        Type: "AWS::S3::Bucket",
        Properties: {
          BucketName: "${self:provider.environment.THUMBNAILS_S3_BUCKET}",
        },
      },
      bucketPolicy: {
        Type: "AWS::S3::BucketPolicy",
        Properties: {
          PolicyDocument: {
            Id: "MyPolicy",
            Version: "2012-10-17",
            Statement: [
              {
                Sid: "PublicReadForGetBucketObjects",
                Effect: "Allow",
                Principal: "*",
                Action: "s3:GetObject",
                Resource:
                  "arn:aws:s3:::${self:provider.environment.IMAGES_S3_BUCKET}/*",
              },
            ],
          },
          Bucket: { Ref: "attachmentsBucket" },
        },
      },
      SNSTopicPolicy: {
        Type: "AWS::SNS::TopicPolicy",
        Properties: {
          PolicyDocument: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: {
                  AWS: "*",
                },
                Action: "sns:Publish",
                Resource: {
                  Ref: "imagesTopic",
                },
                Condition: {
                  ArnLike: {
                    "AWS:SourceArn":
                      "arn:aws:s3:::${self:provider.environment.IMAGES_S3_BUCKET}",
                  },
                },
              },
            ],
          },
          Topics: [{ Ref: "imagesTopic" }],
        },
      },
      imagesTopic: {
        Type: "AWS::SNS::Topic",
        Properties: {
          DisplayName: "Image bucket topic",
          TopicName: "${self:custom.topicName}",
        },
      },
      imagesSearch: {
        Type: "AWS::Elasticsearch::Domain",
        Properties: {
          ElasticsearchVersion: "6.3",
          DomainName: `images-search-${stage}`,
          ElasticsearchClusterConfig: {
            DedicatedMasterEnabled: false,
            InstanceCount: "1",
            ZoneAwarenessEnabled: false,
            InstanceType: "t2.small.elasticsearch",
          },
          EBSOptions: {
            EBSEnabled: true,
            Iops: 0,
            VolumeSize: 10,
            VolumeType: "gp2",
          },
          AccessPolicies: {
            Version: "2012-10-17",
            Statement: [
              {
                Effect: "Allow",
                Principal: {
                  AWS: {
                    "Fn::Sub": `arn:aws:sts::\${AWS::AccountId}:assumed-role/${service}-${stage}-${region}-lambdaRole/${service}-${stage}-esSync`,
                  },
                },
                Action: ["es:*"],
                Resource: {
                  "Fn::Sub": `arn:aws:es:${region}:\${AWS::AccountId}:domain/images-search-${stage}/*`,
                },
              },
              {
                Effect: "Allow",
                Principal: {
                  AWS: "*",
                },
                Action: ["es:*"],
                Resource: {
                  "Fn::Sub": `arn:aws:es:${region}:\${AWS::AccountId}:domain/images-search-${stage}/*`,
                },
                Condition: {
                  IpAddress: {
                    "aws:SourceIp": ["186.144.214.236"],
                  },
                },
              },
            ],
          },
        },
      },
      KMSKeySecret: {
        Type: "AWS::KMS::Key",
        Properties: {
          Description: "KMS Key to encrypt Auth0 secret",
          KeyPolicy: {
            Id: "key-default-1",
            Version: "2012-10-17",
            Statement: [
              {
                Sid: "Allow administration of the key",
                Effect: "Allow",
                Principal: {
                  AWS: {
                    "Fn::Join": [
                      ":",
                      ["arn:aws:iam:", { Ref: "AWS::AccountId" }, "root"],
                    ],
                  },
                },
                Action: "kms:*",
                Resource: "*",
              },
            ],
          },
        },
      },
      KMSKeyCert: {
        Type: "AWS::KMS::Key",
        Properties: {
          Description: "KMS Key to encrypt Auth0 certificate",
          KeyPolicy: {
            Id: "key-default-2",
            Version: "2012-10-17",
            Statement: [
              {
                Sid: "Allow administration of the key",
                Effect: "Allow",
                Principal: {
                  AWS: {
                    "Fn::Join": [
                      ":",
                      ["arn:aws:iam:", { Ref: "AWS::AccountId" }, "root"],
                    ],
                  },
                },
                Action: "kms:*",
                Resource: "*",
              },
            ],
          },
        },
      },
      KMSKeySecretAlias: {
        Type: "AWS::KMS::Alias",
        Properties: {
          AliasName: `alias/auth0KeySecret-${stage}`,
          TargetKeyId: { Ref: "KMSKeySecret" },
        },
      },
      KMSKeyCertAlias: {
        Type: "AWS::KMS::Alias",
        Properties: {
          AliasName: `alias/auth0KeyCert-${stage}`,
          TargetKeyId: { Ref: "KMSKeyCert" },
        },
      },
      Auth0Secret: {
        Type: "AWS::SecretsManager::Secret",
        Properties: {
          Name: "${self:provider.environment.AUTH_0_SECRET_ID}",
          Description: "Auth0 secret",
          KmsKeyId: { Ref: "KMSKeySecret" },
        },
      },
      Auth0Cert: {
        Type: "AWS::SecretsManager::Secret",
        Properties: {
          Name: "${self:provider.environment.AUTH_0_CERT_ID}",
          Description: "Auth0 cert",
          KmsKeyId: { Ref: "KMSKeyCert" },
        },
      },
    },
  },
  variablesResolutionMode: "20210326",
};

module.exports = serverlessConfiguration;
