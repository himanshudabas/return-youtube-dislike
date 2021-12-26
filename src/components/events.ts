import { getVideoId, numberFormat } from "./utils"
import { checkForSignInButton, getButtons } from "./buttons"
import { setDislikes, storedData } from "./state"
import { createRateBar } from "./bar"
import { VideoState } from "../types";

function sendVote(vote: number) {
  chrome.runtime.sendMessage({
    message: "submitVote",
    vote: vote,
    videoId: getVideoId(window.location.href),
  });
}

function sendVideoIds() {
  let links = Array.from(
    document.getElementsByClassName(
      "yt-simple-endpoint ytd-compact-video-renderer"
    )
  ).concat(
    Array.from(
      document.getElementsByClassName("yt-simple-endpoint ytd-thumbnail")
    )
  );
  // Also try mobile
  if (links.length < 1)
    links = Array.from(
      document.querySelectorAll(
        ".large-media-item-metadata > a, a.large-media-item-thumbnail-container"
      )
    );
  const ids = links
    .filter((x) => (x as HTMLAnchorElement).href && (x as HTMLAnchorElement).href.indexOf("/watch?v=") > 0)
    .map((x) => getVideoId((x as HTMLAnchorElement).href));
  chrome.runtime.sendMessage({
    message: "send_links",
    videoIds: ids,
  });
}

function likeClicked() {
  if (checkForSignInButton() === false) {
    if (storedData.previousState === VideoState.DISLIKED_STATE) {
      sendVote(1);
      storedData.dislikes--;
      storedData.likes++;
      createRateBar(storedData.likes, storedData.dislikes);
      setDislikes(numberFormat(storedData.dislikes));
      storedData.previousState = VideoState.LIKED_STATE;
    } else if (storedData.previousState === VideoState.NEUTRAL_STATE) {
      sendVote(1);
      storedData.likes++;
      createRateBar(storedData.likes, storedData.dislikes);
      storedData.previousState = VideoState.LIKED_STATE;
    } else if ((storedData.previousState = VideoState.LIKED_STATE)) {
      sendVote(0);
      storedData.likes--;
      createRateBar(storedData.likes, storedData.dislikes);
      storedData.previousState = VideoState.NEUTRAL_STATE;
    }
  }
}

function dislikeClicked() {
  if (checkForSignInButton() == false) {
    if (storedData.previousState === VideoState.NEUTRAL_STATE) {
      sendVote(-1);
      storedData.dislikes++;
      setDislikes(numberFormat(storedData.dislikes));
      createRateBar(storedData.likes, storedData.dislikes);
      storedData.previousState = VideoState.DISLIKED_STATE;
    } else if (storedData.previousState === VideoState.DISLIKED_STATE) {
      sendVote(0);
      storedData.dislikes--;
      setDislikes(numberFormat(storedData.dislikes));
      createRateBar(storedData.likes, storedData.dislikes);
      storedData.previousState = VideoState.NEUTRAL_STATE;
    } else if (storedData.previousState === VideoState.LIKED_STATE) {
      sendVote(-1);
      storedData.likes--;
      storedData.dislikes++;
      setDislikes(numberFormat(storedData.dislikes));
      createRateBar(storedData.likes, storedData.dislikes);
      storedData.previousState = VideoState.DISLIKED_STATE;
    }
  }
}

function addLikeDislikeEventListener() {
  const buttons = getButtons();
    if (!window.returnDislikeButtonlistenersSet) {
      buttons.children[0].addEventListener("click", likeClicked);
      buttons.children[1].addEventListener("click", dislikeClicked);
      window.returnDislikeButtonlistenersSet = true;
    }
}

export {
  sendVote,
  sendVideoIds,
  likeClicked,
  dislikeClicked,
  addLikeDislikeEventListener,
};