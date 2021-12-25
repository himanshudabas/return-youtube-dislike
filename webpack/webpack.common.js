const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require("copy-webpack-plugin");
const path = require('path');
const BuildManifest = require('./webpack.manifest');


// project constants
const srcDir = '../src';
const content_script_name = "content-script";
const bg_script_name = "background-script";


const tsRule = {
  test: /\.tsx?$/,
  use: 'ts-loader',
  exclude: /node_modules/
};

const plugins = (env) => {
  return [
    // new HtmlWebpackPlugin({
    //   template: 'src/popup-page/popup.html',
    //   filename: 'popup.html',
    //   chunks: ['popup'],
    // }),
    new BuildManifest({
      browser: env.browser,
      pretty: env.mode === "production",
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'public', to: '../dist' },
      ],
    }),
  ]
};

module.exports = env => ({
  entry: {
    popup: path.join(__dirname, srcDir, "popup.ts"),
    [bg_script_name]: path.join(__dirname, srcDir, "background.ts"),
    [content_script_name]: path.join(__dirname, srcDir, "content.ts"),
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, "../dist"),
  },
  module: {
    rules: [tsRule],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  plugins: plugins(env),
});