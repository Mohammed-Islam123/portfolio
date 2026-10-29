export default {
  /**
   * @param {Request} request
   * @param {{ ASSETS: { fetch(request: Request): Promise<Response> } }} env
   */
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    const errorDocument = /^\/(?:fr\/)?404(?:\/|\.html|\/index\.html)?$/.test(path);
    const assetRequest = errorDocument ? new Request(request) : request;
    if (errorDocument) {
      // An old cached 200 must not turn an error document into a 304.
      assetRequest.headers.delete("If-None-Match");
      assetRequest.headers.delete("If-Modified-Since");
    }
    const response = await env.ASSETS.fetch(assetRequest);
    if (!errorDocument || !response.ok) return response;
    return new Response(response.body, {
      status: 404,
      statusText: "Not Found",
      headers: response.headers,
    });
  },
};
