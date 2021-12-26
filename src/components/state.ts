import { getLikeButton, getDislikeButton, getButtons } from "./buttons";
import { createRateBar } from "./bar";
import { getVideoId, numberFormat } from "./utils";
import { sendVideoIds } from "./events";
import { logMsg } from "../utils";
import { VideoData, VideoDislikesResponse, VideoState } from "../types";


const storedData: VideoData = {
  likes: 0,
  dislikes: 0,
  previousState: VideoState.NEUTRAL_STATE,
};

function isMobile() {
  return location.hostname == "m.youtube.com";
}

function isVideoLiked() {
  if (isMobile()) {
    return (
      getLikeButton().querySelector("button").getAttribute("aria-label") ==
      "true"
    );
  }
  return getLikeButton().classList.contains("style-default-active");
}

function isVideoDisliked() {
  if (isMobile()) {
    return (
      getDislikeButton().querySelector("button").getAttribute("aria-label") ==
      "true"
    );
  }
  return getDislikeButton().classList.contains("style-default-active");
}

function getState(storedData: VideoData) {
  if (isVideoLiked()) {
    return { current: VideoState.LIKED_STATE, previous: storedData.previousState };
  }
  if (isVideoDisliked()) {
    return { current: VideoState.DISLIKED_STATE, previous: storedData.previousState };
  }
  return { current: VideoState.NEUTRAL_STATE, previous: storedData.previousState };
}

//---   Sets The Likes And Dislikes Values   ---//
function setLikes(likesCount) {
  (getButtons().children[0].querySelector("#text") as HTMLElement).innerText = likesCount;
}

function setDislikes(dislikesCount) {
  if (isMobile()) {
    (getButtons().children[1].querySelector(".button-renderer-text") as HTMLElement).innerText = dislikesCount;
    return;
  }
  (getButtons().children[1].querySelector("#text") as HTMLElement).innerText = dislikesCount;
}

function getLikeCountFromButton() {
  let likesStr = getLikeButton()
    .querySelector("button")
    .getAttribute("aria-label")
    .replace(/\D/g, "");
  return likesStr.length > 0 ? parseInt(likesStr) : false;
}

function processResponse(response: VideoDislikesResponse, storedData: VideoData) {
  const formattedDislike = numberFormat(response.dislikes);
  setDislikes(formattedDislike);
  storedData.dislikes = response.dislikes;
  storedData.likes = getLikeCountFromButton() || response.likes;
  createRateBar(storedData.likes, storedData.dislikes);
}

function setState(storedData: VideoData) {
  storedData.previousState = isVideoDisliked()
    ? VideoState.DISLIKED_STATE
    : isVideoLiked()
      ? VideoState.LIKED_STATE
      : VideoState.NEUTRAL_STATE;
  let statsSet = false;

  logMsg(`API call started.`)
  chrome.runtime.sendMessage(
    {
      message: "setPageState",
      videoId: getVideoId(window.location.href),
      state: getState(storedData).current,
      likeCount: getLikeCountFromButton() || null,
    },
    function (response: VideoDislikesResponse) {
      logMsg(`Response from ryd API: ${JSON.stringify(response)}`);
      if (response !== undefined && !("traceId" in response) && !statsSet) {
        processResponse(response, storedData);
      } else {
      }
    }
  );
}

function setInitialState(): void {
  setState(storedData);
  setTimeout(() => {
    sendVideoIds();
  }, 1500);
}

export {
  isMobile,
  isVideoDisliked,
  isVideoLiked,
  getState,
  setState,
  setInitialState,
  setLikes,
  setDislikes,
  getLikeCountFromButton,
  storedData,
};
