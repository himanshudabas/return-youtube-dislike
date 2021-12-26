import Config from "./config";
import CompileConfig from "../extension.config.json"
import { StorageChangesObject, VideoDislikesResponse } from "./types";
import { changeIconForVoteSubmission, getOAuthToken, logError, logMsg, objectToURI, registerUser, setPageState, submitVote } from "./utils";
import { sendRequestToCustomServer } from "./bg-utils";


// window.RYD = Config;


function addBackgroundScriptListeners(): void {

  chrome.runtime.onMessage.addListener(function (request, sender, callback) {
    switch (request.message) {
      case "openWebsite":
        chrome.tabs.create({ url: CompileConfig.rydLinks.website });
        return;
      case "openGitHub":
        chrome.tabs.create({ url: CompileConfig.rydLinks.github });
        return;
      case "openDiscord":
        chrome.tabs.create({ url: CompileConfig.rydLinks.discord });
        return;
      case "openFaq":
        chrome.tabs.create({ url: CompileConfig.rydLinks.faq });
        return;
      case "openDonate":
        chrome.tabs.create({ url: CompileConfig.rydLinks.donate });
        return;
      case "sendRequest":
        sendRequestToCustomServer(request.type, request.url, request.data).then((resp) => callback(resp));
        return true;
      case "getAuthToken":
        getOAuthToken(); // doesn't do anything yet
        return true;
      case "setPageState":
        setPageState(request.videoId, request.likeCount || '')
          .then((resp: VideoDislikesResponse) => callback(resp))
          .catch(err => logError(err, "error while fetching dislike count."));
        return true;
      case "registerUser":
        registerUser()
          .then(resp => callback(resp))
          .catch(err => logError(err, "error while registering user."));
        return true;
      case "submitVote":
        if (!Config.config.voteSubmission) return callback(true);
        submitVote(request.videoId, request.vote)
          .then(resp => logMsg(`casted vote for videoId: ${request.videoId}, voteType: ${request.vote}, status: ${resp}`))
          .catch(err => logError(err, "error while submitting vote."));
        return true;
    }
  });

  // add help page on install
  chrome.runtime.onInstalled.addListener(function () {
    // This let's the config sync to run fully before checking.
    // This is required on Firefox
    setTimeout(function () {
      const userID = Config.config.userID;

      // If there is no userID, then it is the first install.
      if (!userID) {
        // todo: replace this with options page once it's created
        chrome.tabs.create({url: CompileConfig.rydLinks.faq});
        registerUser()
          .then((resp) => logMsg(`successfully registered user: ${resp}`))
          .catch(err => logError(err, `user registration failed.`));
      }
    }, 500);
  });

}

function VoteSubmissionToggleListener(changes: StorageChangesObject) {
  if (changes.hasOwnProperty("voteSubmission")) changeIconForVoteSubmission();
}

if (!Config.configListeners.includes(VoteSubmissionToggleListener)) {
  setTimeout(() => {
    changeIconForVoteSubmission();
  }, 1500);
  Config.configListeners.push(VoteSubmissionToggleListener);
}

addBackgroundScriptListeners();
