import type { APIGatewayProxyHandler, APIGatewayProxyResult } from 'aws-lambda';
import { middyfy } from '@libs/lambda';
import { getAllGroups } from 'src/businessLogic/groups';

const getGroups: APIGatewayProxyHandler = async (): Promise<APIGatewayProxyResult> => {
  const  groups = await getAllGroups()

  const response = {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify({
      items: groups
    }),
  };
  return response;
}

export const main = middyfy(getGroups);
