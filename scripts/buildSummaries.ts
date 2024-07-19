import fs from "fs/promises";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";

const apiKey = process.env.ANTHROPIC_API_KEY ?? "";
if (!apiKey) throw new Error("you forgot to add an anthropic api key");

const anthropic = new Anthropic({
  apiKey,
});

function wait(ms = 1200) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const MAX_INPUT_TOKENS = 1500;
const MAX_OUTPUT_TOKENS = 300;
const SUMMARY_FILE_PATH = "src/proposal-summaries.json";

const SYSTEM_PROMPT = `You have significant experience as a cryptocurrency dev and technical writer. You are also very plugged in to the crypto dev social world. Write a brief technical summary of the purpose and history of a given crypto improvement proposal. early usage, further development and other related proposals, whether this proposal should be implemented today, or perhaps if another has superseded it. You should constrain your request to be as short as possible. Three paragraphs would be an acceptable, but long answer. If possible include information about who wrote and shepherded the proposal, and why. Include information about the current status of the proposal if available. Output semantically correct html.`;

const readProposalContent = async (folderPath, fileName) => {
  const content = await fs.readFile(path.join(folderPath, fileName), {
    encoding: "utf-8",
  });
  const proposalId = fileName.split(".")[0];
  return { proposalId, content };
};

async function loadExistingSummaries(): Promise<Record<string, string>> {
  let data: any;
  try {
    data = await fs.readFile(SUMMARY_FILE_PATH, "utf-8");
  } catch (error) {
    console.log(
      `No existing summaries file (${SUMMARY_FILE_PATH}) found. Create one.`,
    );
    return {};
  }
  return JSON.parse(data);
}

async function saveSummaries(summaries: Record<string, string>): Promise<void> {
  await fs.writeFile(SUMMARY_FILE_PATH, JSON.stringify(summaries, null, 2));
}

async function main() {
  const EIPPaths = await fs.readdir(path.resolve("EIPs/EIPS"));
  const ERCPaths = await fs.readdir(path.resolve("ERCs/ERCS"));
  const RIPPaths = await fs.readdir(path.resolve("RIPs/RIPS"));
  // const BIPPaths = await fs.readdir(path.resolve("BIPs/BIPS"));

  const proposalContent: Record<string, string> = {};
  try {
    const allData = await Promise.all([
      ...EIPPaths.map((path) => readProposalContent("EIPs/EIPS", path)),
      ...ERCPaths.map((path) => readProposalContent("ERCs/ERCS", path)),
      ...RIPPaths.map((path) => readProposalContent("RIPs/RIPS", path)),
      // ...BIPPaths.map((path) => readProposalContent("BIPs/BIPS", path)), todo: make sure bips work
    ]);

    allData.forEach(({ proposalId, content }) => {
      proposalContent[proposalId.toUpperCase()] = content.substring(
        0,
        MAX_INPUT_TOKENS,
      );
    });

    console.log("Number of proposals:", Object.keys(proposalContent).length);
  } catch (e) {
    console.error("Error reading proposal content:", e);
    return;
  }

  let summaries = await loadExistingSummaries();

  try {
    for (const [proposalId, prompt] of Object.entries(proposalContent)) {
      if (summaries[proposalId]) {
        console.log(`Summary for ${proposalId} already exists. Skipping.`);
        continue;
      }

      console.log(`Fetching summary for ${proposalId}...`);
      const prefix = `<article><h1>${proposalId}`;
      const message = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        system: SYSTEM_PROMPT,
        max_tokens: MAX_OUTPUT_TOKENS,
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: prompt }],
          },
          {
            role: "assistant",
            content: prefix,
          },
        ],
      });

      const content = message.content[0];
      if (content?.type !== "text") {
        throw new Error(
          "Anthropic suggestion did not include the expected content.",
        );
      }

      summaries[proposalId] = `${prefix}${content.text}`;
      console.log(`Added summary for ${proposalId}`);

      // Save after each new summary to prevent data loss
      await saveSummaries(summaries);
      await wait();
    }

    console.log("All summaries updated successfully.");
  } catch (e) {
    console.error("Error during summary generation:", e);
    wait(60 * 1000).then(main);
  }
}

main();
