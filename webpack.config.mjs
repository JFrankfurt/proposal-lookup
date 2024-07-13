import path from "path";
import { fileURLToPath } from "url";
import HtmlWebpackPlugin from "html-webpack-plugin";
import CopyPlugin from "copy-webpack-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default (env, argv) => {
  const isDevelopment = argv.mode === "development";

  return {
    entry: {
      contentScript: "./src/contentScript.ts",
      service_worker: "./src/service_worker.js",
      index: "./src/index.tsx",
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.css$/,
          use: ["style-loader", "css-loader"],
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: "./public/sidepanel.html",
        filename: "sidepanel.html",
        chunks: ["main"],
      }),
      new CopyPlugin({
        patterns: [
          { from: "public/manifest.json", to: "manifest.json" },
          { from: "src/tooltipStyles.css", to: "tooltipStyles.css" },
        ],
      }),
    ],
    devServer: {
      static: {
        directory: path.join(__dirname, "public"),
      },
      compress: true,
      port: 8081,
    },
    devtool: isDevelopment ? "inline-source-map" : false,
  };
};
