import Config from "./config";
import { Message, MessageResponse } from "./messageTypes";
import { wait } from "./utils";


window.RYD = Config;
interface MessageListener {
  (request: Message, sender: unknown, sendResponse: (response: MessageResponse) => void): void;
}

class MessageHandler {
  messageListener: MessageListener;

  constructor(messageListener?: MessageListener) {
      this.messageListener = messageListener;
  }

  sendMessage(id: number, request: Message, callback?) {
      if (this.messageListener) {
          this.messageListener(request, null, callback);
      } else {
          chrome.tabs.sendMessage(id, request, callback);
      }
  }

  query(config, callback) {
      if (this.messageListener) {
          // Send back dummy info
          callback([{
              url: document.URL,
              id: -1
          }]);
      } else {
          chrome.tabs.query(config, callback);
      }

  }
}

//make this a function to allow this to run on the content page
async function runThePopup(messageListener?: MessageListener): Promise<void> {
  const messageHandler = new MessageHandler(messageListener);

  await wait(() => Config.config !== null);

  type InputPageElements = {
    voteSubmissionToggle?: HTMLInputElement,
  };

  type PageElements = { [key: string]: HTMLElement } & InputPageElements

  const PageElements: PageElements = {};

  [
    "voteSubmissionToggle",
    "websiteUrl",
    "gitHubUrl",
    "discordUrl",
    "faqUrl",
    "donateUrl",
    "advancedToggle",
    "advancedSettings",
  ].forEach(id => PageElements[id] = document.getElementById(id));

  PageElements.voteSubmissionToggle.addEventListener("change", function () {
    toggleVoteSubmission(this.checked);
  });
  PageElements.websiteUrl.addEventListener("click", () => openNew("Website"));
  PageElements.gitHubUrl.addEventListener("click", () => openNew("GitHub"));
  PageElements.discordUrl.addEventListener("click", () => openNew("Discord"));
  PageElements.faqUrl.addEventListener("click", () => openNew("Faq"));
  PageElements.donateUrl.addEventListener("click", () => openNew("Donate"));
  PageElements.advancedToggle.addEventListener("click", toggleAdvancedSettings);

  initUIElements();

  function toggleVoteSubmission(enabled: boolean): void {
    Config.config.voteSubmission = enabled;
  }

  function toggleAdvancedSettings(): void {
    let advancedSettingsVissible = PageElements.advancedSettings.offsetParent !== null;
    if (advancedSettingsVissible) {
      PageElements.advancedSettings.style.display = "none";
      PageElements.advancedToggle.innerHTML = "Show Settings"
    } else {
      PageElements.advancedSettings.style.display = "block";
      PageElements.advancedToggle.innerHTML = "Hide Settings"
    }
  }

  /** sends a message to bg script, which handels the opening of pages */
  function openNew(pageName: string): void {
    chrome.runtime.sendMessage({ message: ("open" + pageName) });
  }

  function initUIElements(): void {
    PageElements.voteSubmissionToggle.checked = Config.config.voteSubmission;
  }
}

if (chrome.tabs != undefined) {
  //this means it is actually opened in the popup
  runThePopup();
}

export default runThePopup;