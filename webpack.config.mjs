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
      devtoolModuleFilenameTemplate: isDevelopment
        ? "[absolute-resource-path]"
        : "webpack://[namespace]/[resource-path]?[loaders]",
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: "ts-loader",
            options: {
              transpileOnly: isDevelopment,
              compilerOptions: {
                sourceMap: true,
              },
            },
          },
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
          { from: "public/**/*.json", to: "[name][ext]" },
          { from: "src/**/*.json", to: "[name][ext]" },
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
    devtool: "source-map",
    optimization: {
      moduleIds: "named",
      chunkIds: "named",
    },
  };
};
