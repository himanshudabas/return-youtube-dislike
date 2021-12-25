const webpackMerge = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = env => {
    let mode = "production";
    env.mode = mode;

    return webpackMerge.merge(common(env), {
        mode
    });
};