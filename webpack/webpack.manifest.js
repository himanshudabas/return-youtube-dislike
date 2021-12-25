const path = require('path');
const schemaUtils = require('schema-utils');

const fs = require('fs');

const manifest = require("../manifest/manifest.json");
const firefoxManifest = require("../manifest/firefox-manifest.json");
const chromeManifest = require("../manifest/chrome-manifest.json");


const schema = {
    type: 'object',
    properties: {
        browser: {
            type: 'string'
        },
        pretty: {
            type: 'boolean'
        }
    }  
};

class BuildManifest {
    constructor (options = {}) {
        schemaUtils.validate(schema, options, "Build Manifest Plugin");
        this.options = options;
    }

    apply(compiler) {
        const distFolder = path.resolve(__dirname, "../dist");
        const distManifestFile = path.resolve(distFolder, "manifest.json");
        
        // Add missing manifest elements
        if (this.options.browser.toLowerCase() === "firefox") {
            mergeObjects(manifest, firefoxManifest);
        } else if (this.options.browser.toLowerCase() === "chrome" || this.options.browser.toLowerCase() === "chromium") {
            mergeObjects(manifest, chromeManifest);
        }
        
        let result = JSON.stringify(manifest);
        if (this.options.pretty) result = JSON.stringify(manifest, null, 2);
        
        fs.mkdirSync(distFolder, {recursive: true});
        fs.writeFileSync(distManifestFile, result);
    }
}

function mergeObjects(object1, object2) {
    for (const key in object2) {
        if (key in object1) {
            if (Array.isArray(object1[key])) {
                object1[key] = object1[key].concat(object2[key]);
            } else if (typeof object1[key] == 'object') {
                mergeObjects(object1[key], object2[key]);
            } else {
                object1[key] = object2[key];
            }
        } else {
            object1[key] = object2[key];
        }
    }
}

module.exports = BuildManifest;