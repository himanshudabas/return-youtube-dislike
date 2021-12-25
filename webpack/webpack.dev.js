const webpackMerge = require('webpack-merge');
const common = require('./webpack.common.js');

module.exports = env => webpackMerge.merge(common(env), {
    devtool: 'inline-source-map',
    mode: 'development'
});