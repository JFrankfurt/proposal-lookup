import * as cheerio from "cheerio";
import EIPs from "./EIPs.json";
import ERCs from "./ERCs.json";

const PROPOSAL_MATCH_PATTERN =
  /\b(EIP|ERC|CAIP|BIP)[-\s]([0-9]|[1-9][0-9]{1,3})\b/gi;
const CHECK_INTERVAL = 10000; // 10 seconds
const CHUNK_SIZE = 10000; // Process 10000 characters at a time
let lastProcessedHTML: string = "";

interface ProposalInfo {
  title: string;
  url: string;
}

function getProposalInfo(match: string): ProposalInfo {
  const [type, number] = match.split(/[-\s]/);
  let url = "";
  let title = "";

  switch (type.toUpperCase()) {
    case "EIP":
      const eip = EIPs[number as keyof typeof EIPs];
      title = eip?.title ?? "";
      url = `https://github.com/ethereum/EIPs/blob/master/EIPS/eip-${number}.md`;
      break;
    case "ERC":
      const erc = ERCs[number as keyof typeof ERCs];
      title = erc?.title ?? "";
      url = `https://github.com/ethereum/ERCs/blob/master/ERCS/erc-${number}.md`;
      break;
    case "CAIP":
      url = `https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-${number}.md`;
      title = `CAIP-${number}`;
      break;
    case "BIP":
      url = `https://github.com/bitcoin/bips/blob/master/bip-${number.padStart(
        4,
        "0"
      )}.mediawiki`;
      title = `BIP-${number}`;
      break;
    default:
      url = "#";
      title = match;
  }

  return { title, url };
}

function createStyledSpan(text: string, info: ProposalInfo): string {
  return `<a href="${info.url}" target="_blank" rel="noopener noreferrer" class="eip-erc-mention" style="background-color: #ffff00; color: #000000; padding: 2px 4px; border-radius: 3px; font-weight: bold; text-decoration: none; cursor: pointer;" title="${info.title}">${text}</a>`;
}

function processText(text: string): string {
  return text.replace(PROPOSAL_MATCH_PATTERN, (match) => {
    const info = getProposalInfo(match);
    return createStyledSpan(match, info);
  });
}

function processChunk(
  $: cheerio.CheerioAPI,
  nodes: cheerio.Cheerio<cheerio.AnyNode>
): Set<string> {
  const mentions = new Set<string>();
  let processedNodes = 0;
  let textNodesProcessed = 0;

  console.log(`Starting to process chunk with ${nodes.length} nodes`);

  nodes.each((index, node) => {
    if (node.type === "text") {
      textNodesProcessed++;
      const text = $(node).text();
      const matches = text.match(PROPOSAL_MATCH_PATTERN);
      if (matches) {
        console.log(`Found matches in text: ${matches.join(", ")}`);
        const newHtml = processText(text);
        $(node).replaceWith(newHtml);
        matches.forEach((match) => mentions.add(match.toUpperCase()));
      }
    }
    processedNodes++;

    if (processedNodes % 10 === 0) {
      console.log(
        `Processed ${processedNodes} nodes so far, ${textNodesProcessed} text nodes`
      );
    }
  });

  console.log(
    `Finished processing chunk. Processed ${processedNodes} nodes in total, ${textNodesProcessed} text nodes`
  );
  return mentions;
}

function findAndStyleEIPERCMentions(root: Element): Set<string> {
  console.log("Starting findAndStyleEIPERCMentions");
  const mentions = new Set<string>();
  const $ = cheerio.load(root.outerHTML);
  const allNodes = $("*").contents();

  console.log(`Total nodes to process: ${allNodes.length}`);

  for (let i = 0; i < allNodes.length; i += CHUNK_SIZE) {
    const chunkNodes = allNodes.slice(i, i + CHUNK_SIZE);
    console.log(`Processing chunk from ${i} to ${i + chunkNodes.length}`);
    const chunkMentions = processChunk($, chunkNodes);
    chunkMentions.forEach((mention) => mentions.add(mention));
    console.log(
      `Chunk processed. Total unique mentions so far: ${mentions.size}`
    );
  }

  root.innerHTML = $.html();
  console.log(`Total unique mentions found: ${mentions.size}`);
  return mentions;
}

let processingQueue: Element[] = [];
let isProcessing = false;

const processQueue = () => {
  if (isProcessing || processingQueue.length === 0) return;

  console.log(`Processing queue with ${processingQueue.length} elements`);
  isProcessing = true;
  const batchSize = 1; // Process one element at a time to avoid long-running tasks
  const batch = processingQueue.splice(0, batchSize);
  const allMentions = new Set<string>();

  batch.forEach((element) => {
    const mentions = findAndStyleEIPERCMentions(element);
    mentions.forEach((mention) => allMentions.add(mention));
  });

  console.log(`Sending ${allMentions.size} mentions to background`);
  chrome.runtime.sendMessage({
    action: "updateMentions",
    mentions: Array.from(allMentions),
  });

  isProcessing = false;
  if (processingQueue.length > 0) {
    requestIdleCallback(processQueue);
  }
};

const queueForProcessing = (element: Element) => {
  console.log("Queueing element for processing");
  processingQueue.push(element);
  if (!isProcessing) {
    requestIdleCallback(processQueue);
  }
};

function checkForChanges() {
  console.log("Checking for changes");
  const currentHTML = document.body.innerHTML;
  if (currentHTML !== lastProcessedHTML) {
    console.log("Changes detected, queueing for processing");
    queueForProcessing(document.body);
    lastProcessedHTML = currentHTML;
  }
}

// Initial run
console.log("Initial run");
queueForProcessing(document.body);

// Set up periodic checking
setInterval(checkForChanges, CHECK_INTERVAL);

console.log("EIP/ERC Mention Finder revision: 10");