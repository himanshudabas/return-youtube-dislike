import { getButtons } from "./components/buttons";
import { addLikeDislikeEventListener, sendVideoIds } from "./components/events";
import { setInitialState } from "./components/state";
import { isVideoLoaded } from "./components/utils";
import { logMsg } from "./utils";


logMsg("content-script loaded!");

let jsInitChecktimer = null;

function setEventListeners() {
  function checkForJS_Finish() {
    if (getButtons()?.offsetParent) {
      logMsg(`finished checkForJS_Finish()`);
      clearInterval(jsInitChecktimer);
      jsInitChecktimer = null;
      addLikeDislikeEventListener();
      setInitialState();
    }
  }

  if (window.location.href.indexOf("watch?") >= 0) {
    jsInitChecktimer = setInterval(checkForJS_Finish, 111);
  }
}

setEventListeners();

document.addEventListener("yt-navigate-finish", function (event) {
  logMsg(`finished yt-navigate-finish`);
  if (jsInitChecktimer !== null) clearInterval(jsInitChecktimer);
  window.returnDislikeButtonlistenersSet = false;
  setEventListeners();
});

setTimeout(() => sendVideoIds(), 2500);