import { getPublicEventConfig } from './_shared/config';
import { handleErrors, jsonResponse, methodNotAllowed } from './_shared/http';

export default handleErrors(async (request: Request): Promise<Response> => {
  if (request.method === 'GET') {
    return jsonResponse(getPublicEventConfig());
  }
  return methodNotAllowed();
});
