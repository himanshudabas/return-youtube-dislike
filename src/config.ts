import { StorageChangesObject } from "./types";
import CompileConfig from "../extension.config.json";

interface RYDConfig {
  userID: string,
  serverAddress: string,
  voteSubmission: boolean, // default is true, false -> voting would be disabled
  debugMode: boolean, // default it false, if (true) -> all debugging statementes would be printed to console
}

export interface RYDObject {
  configListeners: Array<(changes: StorageChangesObject) => unknown>;
  defaults: RYDConfig;
  localConfig: RYDConfig;
  config: RYDConfig;
}

const Config: RYDObject = {
  /**
   * 
   */
  configListeners: [],
  defaults: {
    userID: null,
    serverAddress: CompileConfig.serverAddress,
    voteSubmission: true,
    debugMode: true,
  },
  localConfig: null,
  config: null,
}

/**
 * fetches the config from storage for initialization
 * @returns 
 */
function fetchConfig(): Promise<void> { 
  return new Promise((resolve) => {
      chrome.storage.sync.get(null, function(items) {
          Config.localConfig = <RYDConfig> <unknown> items;  // Data is ready
          resolve();
      });
  });
}

// Add defaults
function addDefaults() {
  for (const key in Config.defaults) {
      if(!Object.prototype.hasOwnProperty.call(Config.localConfig, key)) {
          Config.localConfig[key] = Config.defaults[key];
      }
  }
}

function configProxy(): RYDConfig {

  /**
   * proxy for handling the onChanged event of storage
   * we store the new changes to the local config before invoking the callback fn
   */
  chrome.storage.onChanged.addListener((changes: {[key: string]: chrome.storage.StorageChange}) => {
      for (const key in changes) {
          Config.localConfig[key] = changes[key].newValue;
      }

      for (const callback of Config.configListeners) {
          callback(changes);
      }
  });

  const handler: ProxyHandler<RYDConfig> = {
      set<K extends keyof RYDConfig>(obj: RYDConfig, prop: K, value: RYDConfig[K]) {
        Config.localConfig[prop] = value;

        chrome.storage.sync.set({
            [prop]: value
        });

        return true;
      },

      get<K extends keyof RYDConfig>(obj: RYDConfig, prop: K): RYDConfig[K] {
        const data = Config.localConfig[prop];

        return obj[prop] || data;
      },

      deleteProperty(obj: RYDConfig, prop: keyof RYDConfig) {
        chrome.storage.sync.remove(<string> prop);
        
        return true;
      }

  };

  return new Proxy<RYDConfig>({handler} as unknown as RYDConfig, handler);
}


async function setupConfig() {
  await fetchConfig();
  addDefaults();
  const config = configProxy();
  Config.config = config;
}

// Sync config
setupConfig();

export default Config;