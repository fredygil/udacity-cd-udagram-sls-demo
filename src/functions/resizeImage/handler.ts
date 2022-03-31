import { SNSHandler, SNSEvent, S3EventRecord } from "aws-lambda";
import * as AWS from "aws-sdk";
import Jimp from "jimp/es";

const imagesBucketName = process.env.IMAGES_S3_BUCKET;
const thumbnailsBucketName = process.env.THUMBNAILS_S3_BUCKET;

const s3 = new AWS.S3();

const resizeImage: SNSHandler = async (event: SNSEvent) => {
  console.log("Processing SNS event", JSON.stringify(event));
  for (const snsRecord of event.Records) {
    const s3EventStr = snsRecord.Sns.Message;
    console.log("Processing S3 Event", s3EventStr);
    const s3Event = JSON.parse(s3EventStr);

    for (const record of s3Event.Records) {
      await processImage(record);
    }
  }
};

const processImage = async (imageRecord: S3EventRecord) => {
  const key = imageRecord.s3.object.key;
  const response = await s3
    .getObject({
      Bucket: imagesBucketName,
      Key: key,
    })
    .promise();

  const body:Buffer = response.Body as Buffer;

  // Read an image with the Jimp library
  const image = await Jimp.read(body);

  // Resize an image maintaining the ratio between the image's width and height
  image.resize(150, Jimp.AUTO);

  // Convert an image to a buffer that we can write to a different bucket
  const convertedBuffer = await image.getBufferAsync(image.getMIME());

  await s3
    .putObject({
      Bucket: thumbnailsBucketName,
      Key: `${key}.${image.getMIME().replace("image/", "")}`,
      Body: convertedBuffer,
    })
    .promise();
};

export const main = resizeImage;
