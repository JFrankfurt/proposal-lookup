import fs from "fs/promises";
import path from "path";
// import Anthropic from "@anthropic-ai/sdk";

// const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
// const anthropic = new Anthropic({
//   apiKey,
// });

// function wait(ms = 2500) {
//   return new Promise(resolve => setTimeout(resolve, ms))
// }

const SYSTEM_PROMPT = `You have significant experience in crypto. You have been a developer for a long time and have 
spent time working on many different kinds of projects. You are also very plugged in to the crypto developer 
social world. Your job is to write a brief summary of the purpose and history of a given crypto improvement proposal.
For example, you may be asked about "ERC-721"--you would tell the asker about the reason why this EIP was developed, 
who (individually, and organizations within the industry) advocated for and guided its early development. 
early usage, further development and other related proposals, whether this proposal should be implemented today, or 
perhaps if another has superseded it. You should constrain your request to be as short as possible. Three paragraphs
would be an acceptable, but long answer. If possible a single paragraph would be ideal.`;

const readProposalContent = async (folderPath, fileName) => {
  const content = await fs.readFile(path.join(folderPath, fileName), {
    encoding: "utf-8",
  });
  // assumes filename is proposal id i.e., ERC-20
  const proposalId = fileName.split(".")[0];
  return { proposalId, content };
};

async function main() {
  const EIPPaths = await fs.readdir(
    path.resolve("../../../ethereum/EIPs/EIPS"),
  );
  const ERCPaths = await fs.readdir(
    path.resolve("../../../ethereum/ERCs/ERCS"),
  );
  const RIPPaths = await fs.readdir(
    path.resolve("../../../ethereum/RIPs/RIPS"),
  );
  console.log(RIPPaths);

  const proposalContent = {}; // {'ERC-20': snippet }
  try {
    const EIPdata = await Promise.all(
      EIPPaths.map((path) =>
        readProposalContent("../../../ethereum/EIPs/EIPS", path),
      ),
    );
    const ERCdata = await Promise.all(
      ERCPaths.map((path) =>
        readProposalContent("../../../ethereum/ERCs/ERCS", path),
      ),
    );
    const RIPdata = await Promise.all(
      RIPPaths.map((path) =>
        readProposalContent("../../../ethereum/RIPs/RIPS", path),
      ),
    );
    // [...EIPdata, ...ERCdata, ...RIPdata].forEach(({ proposalId, content }) => {
    //   proposalContent[proposalId] = content.substring(0, 2000); // Limit content to 2000 characters
    // });
    RIPdata.forEach(({ proposalId, content }) => {
      proposalContent[proposalId] = content.substring(0, 1500);
    });

    console.log("Proposal IDs:", Object.keys(proposalContent));
    console.log("Number of proposals:", Object.keys(proposalContent).length);
  } catch (e) {
    console.error(e);
  }

  console.log(proposalContent);
  // try {
  //   const proposalPrompts = proposalContent.map(snippet => anthropic.messages.create({
  //     model: "claude-3-5-sonnet-20240620",
  //     system: SYSTEM_PROMPT,
  //     messages: [
  //      { role: "user", content: [{ type: "text", text: snippet }] }
  //      { role: "assisstant", content: '' }
  //     ],
  //   }))
  //   const BATCH_SIZE = 5
  //   for (let i = 0; i < proposalPrompts.length / BATCH_SIZE; i++) {
  //     try {
  //       await Promise.all(proposalPrompts.slice(BATCH_SIZE * i, BATCH_SIZE * i + BATCH_SIZE))
  //     } catch (e) {
  //       console.error(e)
  //     }
  //     await wait(2500)
  //   }
  // } catch (e) {
  //   console.error(e);
  // }
}

main();
