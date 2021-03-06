import schema from './schema';
import { handlerPath } from '@libs/handlerResolver';

export default {
  handler: `${handlerPath(__dirname)}/handler.main`,
  events: [
    {
      http: {
        method: 'post',
        path: 'groups',
        cors: true,
        authorizer: 'authrs256',
        request: {
          schemas: {
            'application/json': schema
          }
        }
      }
    }
  ]
}
