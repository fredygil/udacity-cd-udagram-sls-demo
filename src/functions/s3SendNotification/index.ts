import { handlerPath } from '@libs/handlerResolver';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      s3: {
        bucket: "${self:provider.environment.IMAGES_S3_BUCKET}",
        event: 's3:ObjectCreated:*',
        existing: true,
      }
    }
  ]
}
