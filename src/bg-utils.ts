import Config from "./config";
import { FetchResponse } from "./types";
import { objectToURI } from "./utils";

/**
 * Sends a request to the specified url
 * 
 * @param type The request type "GET", "POST", etc.
 * @param address The address to add to the SponsorBlock server address
 * @param callback 
 */
 export async function sendRequestToCustomServer(type: string, url: string, data = {}): Promise<FetchResponse> {
  // If GET, convert JSON to parameters
  if (type.toLowerCase() === "get") {
    url = objectToURI(url, data, true);
    data = null;
  }

  return await fetch(url, {
    method: type,
    headers: {
      'Content-Type': 'application/json'
    },
    redirect: 'follow',
    body: data ? JSON.stringify(data) : null
  })
    .then(async (resp) => {
      return {
        responseText: await resp.text(),
        status: resp.status,
        ok: resp.ok
      };
    });
}

export async function asyncRequestToServer(type: string, address: string, data = {}): Promise<FetchResponse> {
  const serverAddress = Config.config.serverAddress;

  return await (sendRequestToCustomServer(type, serverAddress + address, data))
}