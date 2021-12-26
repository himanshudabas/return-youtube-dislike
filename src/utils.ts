import Config from "./config";
import { FetchResponse, PuzzleSolution, RegistrationPuzzleResponse, VideoDislikePayload, VideoDislikesResponse, VotePuzzleResponse, VoteSubmissionPayload } from "./types";
import { sendRequestToCustomServer } from "./bg-utils"

const iconDir: string = "/icons";

/** Function that can be used to wait for a condition before returning. */
export async function wait<T>(condition: () => T | false, timeout = 5000, check = 100): Promise<T> {
  return await new Promise((resolve, reject) => {
    setTimeout(() => reject("TIMEOUT"), timeout);

    const intervalCheck = () => {
      const result = condition();
      if (result !== false) {
        resolve(result);
        clearInterval(interval);
      }
    };

    const interval = setInterval(intervalCheck, check);

    //run the check once first, this speeds it up a lot
    intervalCheck();
  });
}

/** generates a random UserId for the user */
function generateUserID(length = 36): string {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  if (crypto && crypto.getRandomValues) {
    const values = new Uint32Array(length);
    crypto.getRandomValues(values);
    for (let i = 0; i < length; i++) {
      result += charset[values[i] % charset.length];
    }
    return result;
  } else {
    for (let i = 0; i < length; i++) {
      result += charset[Math.floor(Math.random() * charset.length)];
    }
    return result;
  }
}

/**
 * Sends a request to a custom server
 * 
 * @param type The request type. "GET", "POST", etc.
 * @param address The address to add to the SponsorBlock server address
 * @param callback 
 */
export async function asyncRequestToCustomServer(type: string, url: string, data = {}): Promise<FetchResponse> {
  return new Promise((resolve) => {
    // Ask the background script to do the work
    chrome.runtime.sendMessage({
      message: "sendRequest",
      type,
      url,
      data
    }, function (response) {
      if (chrome.runtime.lastError) {
        sendRequestToCustomServer(type, url, data)
          .then(resp => resolve(resp));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Sends a request to the RYD server with address added as a query
 * 
 * @param type The request type. "GET", "POST", etc.
 * @param address The address to add to the SponsorBlock server address
 * @param callback 
 */
export async function asyncRequestToServer(type: string, address: string, data = {}): Promise<FetchResponse> {
  const serverAddress = Config.config.serverAddress;

  return await (asyncRequestToCustomServer(type, serverAddress + address, data));
}

/**
 * Is this Firefox (web-extensions)
 */
export function isFirefox(): boolean {
  return typeof (browser) !== "undefined";
}

export function objectToURI<T>(url: string, data: T, includeQuestionMark: boolean): string {
  let counter = 0;
  for (const key in data) {
    const seperator = (url.includes("?") || counter > 0) ? "&" : (includeQuestionMark ? "?" : "");
    const value = (typeof (data[key]) === "string") ? data[key] as unknown as string : JSON.stringify(data[key]);
    url += seperator + encodeURIComponent(key) + "=" + encodeURIComponent(value);

    counter++;
  }

  return url;
}

function countLeadingZeroes(uInt8View: Uint8Array): number {
  let zeroes = 0;
  let value = 0;
  for (let i = 0; i < uInt8View.length; i++) {
    value = uInt8View[i];
    if (value === 0) {
      zeroes += 8;
    } else {
      let count = 1;
      if (value >>> 4 === 0) {
        count += 4;
        value <<= 4;
      }
      if (value >>> 6 === 0) {
        count += 2;
        value <<= 2;
      }
      zeroes += count - (value >>> 7);
      break;
    }
  }
  return zeroes;
}

async function solvePuzzle(puzzle: string, difficulty: number): Promise<PuzzleSolution | undefined> {
  let challenge = Uint8Array.from(atob(puzzle), (c) => c.charCodeAt(0));
  let buffer = new ArrayBuffer(20);
  let uInt8View = new Uint8Array(buffer);
  let uInt32View = new Uint32Array(buffer);
  let maxCount = Math.pow(2, difficulty) * 5;
  for (let i = 4; i < 20; i++) {
    uInt8View[i] = challenge[i - 4];
  }

  for (let i = 0; i < maxCount; i++) {
    uInt32View[0] = i;
    let hash = await crypto.subtle.digest("SHA-512", buffer);
    let hashUint8 = new Uint8Array(hash);
    if (countLeadingZeroes(hashUint8) >= difficulty) {
      return {
        solution: btoa(String.fromCharCode.apply(null, uInt8View.slice(0, 4))),
      };
    }
  }
  return undefined;
}

function changeExtensionIcon(iconName: string): void {
  if (chrome.action !== undefined) chrome.action.setIcon({ path: iconDir + "/" + iconName });
  if (chrome.browserAction !== undefined) chrome.browserAction.setIcon({ path: iconDir + "/" + iconName });
  else if (browser !== undefined && browser.browserAction !== undefined) browser.browserAction.setIcon({ path: iconDir + "/" + iconName });
  else logWarn('changing extension icon is not supported on this browser');
}

export function changeIconForVoteSubmission(): void {
  if (Config.config.voteSubmission) changeExtensionIcon("icon128.png");
  else changeExtensionIcon("icon_vote_disabled_128.png");
}

async function getRegistrationPuzzle(userId: string): Promise<RegistrationPuzzleResponse> {
  return await asyncRequestToServer("GET", `/puzzle/registration?userId=${userId}`)
    .then(resp => JSON.parse(resp.responseText) as unknown as RegistrationPuzzleResponse);
}

async function sendRegistrationPuzzleSolution(userId: string, solvedPuzzle: PuzzleSolution): Promise<boolean> {
  return asyncRequestToServer("POST", `/puzzle/registration?userId=${userId}`, solvedPuzzle)
    .then(resp => JSON.parse(resp.responseText) as unknown as boolean);
}

/**
 * registers a user if not already registered
 * @returns userId of the registered user
 */
export async function registerUser(): Promise<string> {
  if (Config.config.userID) return Config.config.userID; // if user is already registered

  let userId = generateUserID();

  return await getRegistrationPuzzle(userId)
    .then(resp => solvePuzzle(resp.challenge, resp.difficulty))
    .then(solvedPuzzle => sendRegistrationPuzzleSolution(userId, solvedPuzzle))
    .then(registrationResp => { if (registrationResp === true) Config.config.userID = userId; })
    .then(() => userId);
}

export function getOAuthToken(): Promise<chrome.identity.UserInfo> {
  return new Promise((resolve) => {
    chrome.identity.getAuthToken({ interactive: true }, (token) => {
      logMsg(`OAuth Token: ${token}`);
      chrome.identity.getProfileUserInfo(function (userInfo) {
        logMsg(`UserInfo from OAuth Token: ${JSON.stringify(userInfo)}`);
        resolve(userInfo);
      });
    });
  });
}

export async function getVideoDislikeCount(data: VideoDislikePayload): Promise<VideoDislikesResponse> {
  return asyncRequestToServer("GET", `/votes`, data)
    .then(resp => JSON.parse(resp.responseText) as unknown as VideoDislikesResponse);
}

export async function setPageState(videoId: string, likeCount: number | null): Promise<VideoDislikesResponse> {
  let data = {
    videoId: videoId,
    likeCount: likeCount,
  }
  return await getVideoDislikeCount(data);
}

/**
 * 
 * @param payload: VoteSubmissionPayload - userId, videoId, value of vote
 * @param isRetry: boolean - if userId is rejected, this is set to true, to retry registration once
 *                  and then cast vote again
 * @returns: Promise<VotePuzzleResponse>
 */
async function getVotePuzzle(payload: VoteSubmissionPayload, isRetry: boolean = false): Promise<VotePuzzleResponse> {
  return await asyncRequestToServer("POST", `/interact/vote`, payload)
    .then(async resp => {
      if (resp.status == 200) return JSON.parse(resp.responseText) as unknown as VotePuzzleResponse;
      if (resp.status === 401) {
        if (isRetry) throw new Error("user registration failed");
        await registerUser();
        return getVotePuzzle(payload, true);
      }
    });
}

async function confirmVoteSubmission(payload: PuzzleSolution): Promise<boolean> {
  return await asyncRequestToServer("POST", `/interact/confirmVote`, payload)
    .then(resp => JSON.parse(resp.responseText) as unknown as boolean);
}

export async function submitVote(videoId: string, vote: number): Promise<boolean> {
  if (!Config.config.voteSubmission) return false;
  if (!Config.config.userID) await registerUser();
  let payload = {
    userId: Config.config.userID,
    videoId: videoId,
    value: vote,
  };
  return await getVotePuzzle(payload)
    .then((resp) => solvePuzzle(resp.challenge, resp.difficulty))
    .then(async (solvedPuzzle) => {
      let confirmVotePayload = {
        ...solvedPuzzle,
        userId: Config.config.userID,
        videoId,
      };
      return await confirmVoteSubmission(confirmVotePayload);
    });
}

function addZeroBefore(n: number): string {
  return (n < 10 ? '0' : '') + n;
}

export function getUTCTime(): string {
  let date = new Date();
  let utc = addZeroBefore(date.getUTCDate())
    + "-" + addZeroBefore(date.getUTCMonth())
    + "-" + addZeroBefore(date.getUTCFullYear())
    + " " + addZeroBefore(date.getUTCHours())
    + ":" + addZeroBefore(date.getUTCMinutes())
    + ":" + addZeroBefore(date.getUTCSeconds())
    + "." + addZeroBefore(date.getUTCMilliseconds());
  return utc;
}

export function logError(err: Error, optMsg: string = null): void {
  console.error(`[RYD]: [${getUTCTime()}] - ${optMsg} | ${err}`);
}

/**
 * logs messages to console if debugMode is enabled in config
 * @param msg to be printed to console
 */
export function logMsg(msg: string, override: boolean = false): void {
  let toLog: boolean = Config.config == undefined ? Config.defaults.debugMode : Config.config.debugMode;
  if (override || toLog)
    console.log(`[RYD]: [${getUTCTime()}] - ${msg}`);
}

export function logWarn(msg: string): void {
  console.warn(`[RYD]: [${getUTCTime()}] - ${msg}`);
}