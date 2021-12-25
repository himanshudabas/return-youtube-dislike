import { getLikeButton, getDislikeButton, getButtons } from "./buttons";
import { createRateBar } from "./bar";
import { getVideoId, numberFormat } from "./utils";
import { sendVideoIds } from "./events";
import { logMsg } from "../utils";

const LIKED_STATE = "LIKED_STATE";
const DISLIKED_STATE = "DISLIKED_STATE";
const NEUTRAL_STATE = "NEUTRAL_STATE";

let storedData = {
  likes: 0,
  dislikes: 0,
  previousState: NEUTRAL_STATE,
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

function getState(storedData) {
  if (isVideoLiked()) {
    return { current: LIKED_STATE, previous: storedData.previousState };
  }
  if (isVideoDisliked()) {
    return { current: DISLIKED_STATE, previous: storedData.previousState };
  }
  return { current: NEUTRAL_STATE, previous: storedData.previousState };
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

function processResponse(response, storedData) {
  const formattedDislike = numberFormat(response.dislikes);
  setDislikes(formattedDislike);
  storedData.dislikes = parseInt(response.dislikes);
  storedData.likes = getLikeCountFromButton() || parseInt(response.likes);
  createRateBar(storedData.likes, storedData.dislikes);
}

function setState(storedData) {
  storedData.previousState = isVideoDisliked()
    ? DISLIKED_STATE
    : isVideoLiked()
      ? LIKED_STATE
      : NEUTRAL_STATE;
  let statsSet = false;

  chrome.runtime.sendMessage(
    {
      message: "setPageState",
      videoId: getVideoId(window.location.href),
      state: getState(storedData).current,
      likeCount: getLikeCountFromButton() || null,
    },
    function (response) {
      logMsg("response from api:");
      logMsg(JSON.stringify(response));
      if (response !== undefined && !("traceId" in response) && !statsSet) {
        processResponse(response, storedData);
      } else {
      }
    }
  );
}

function setInitialState() {
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
  LIKED_STATE,
  DISLIKED_STATE,
  NEUTRAL_STATE,
  storedData,
};
