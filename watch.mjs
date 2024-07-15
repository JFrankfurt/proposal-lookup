import chokidar from "chokidar";
import { exec } from "child_process";

const watcher = chokidar.watch(["src/**/*", "public/**/*"], {
  ignored: /(^|[\/\\])\../,
  persistent: true,
});

console.log("Watching for file changes...");

watcher.on("change", (path) => {
  console.log(`File ${path} has been changed`);
  exec("bun run start", (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    console.log("Extension rebuilt!");
  });
});
