import type { ValidatedEventAPIGatewayProxyEvent } from '@libs/apiGateway';
import { middyfy } from '@libs/lambda';
import schema from './schema';

import { CreateGroupRequest } from '../../requests/CreateGroupRequest';
import { createGroup } from 'src/businessLogic/groups';

const postGroups: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (event) => {
  console.log("Processing event", JSON.stringify(event));

  const newGroup: CreateGroupRequest = event.body;
  const jwtToken = event.headers.Authorization.split(" ")[1];
  const newItem = await createGroup(newGroup, jwtToken);

  return {
    statusCode: 201,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify({
      newItem,
    }),
  };
}

export const main = middyfy(postGroups);
