import { Proposal } from "./types";

// Constants
const PROPOSAL_MATCH_PATTERN =
  /\b(EIP|ERC|RIP|CAIP)[-\s]?([0-9]|[1-9][0-9]{1,3})\b/gi;
const CHECK_INTERVAL = 3000;

// State variables
let lastProcessedText = "";
let processingQueue: Node[] = [];
let isProcessing = false;
console.time("content-script");
function normalizeProposal(mention: string): Proposal {
  // Remove any spaces, convert to uppercase, and ensure there's a hyphen between text and numbers
  return mention
    .replace(/\s/g, "")
    .toUpperCase()
    .replace(/([A-Z]+)(\d+)/, "$1-$2") as Proposal;
}

function findProposalsInText(text: string): Set<string> {
  const proposals = new Set<Proposal>();
  const matches = text.match(PROPOSAL_MATCH_PATTERN);
  if (matches) {
    matches.forEach((match) => {
      const normalizedMention = normalizeProposal(match);
      proposals.add(normalizedMention);
    });
  }
  return proposals;
}

function processTextNode(node: Text): Set<string> {
  return findProposalsInText(node.textContent || "");
}

function findMentionsInElement(element: Element): Set<string> {
  const mentions = new Set<string>();
  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);

  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeType === Node.TEXT_NODE) {
      const nodeMentions = processTextNode(node as Text);
      nodeMentions.forEach((mention) => mentions.add(mention));
    }
  }

  return mentions;
}

function processQueue() {
  if (isProcessing || processingQueue.length === 0) return;

  console.timeLog(
    "content-script",
    `Processing queue with ${processingQueue.length} elements`,
  );
  isProcessing = true;
  const node = processingQueue.shift(); // Process one node at a time

  if (node && node.isConnected) {
    const proposals =
      node instanceof Element ? findMentionsInElement(node) : new Set<string>();
    console.timeLog(
      "content-script",
      `Sending ${proposals.size} mentions to background`,
    );
    if (proposals.size > 0) {
      chrome.runtime.sendMessage({
        action: "updateProposals",
        proposals: Array.from(proposals),
      });
    }
  }

  isProcessing = false;
  if (processingQueue.length > 0) {
    requestIdleCallback(processQueue);
  }
}

function queueForProcessing(node: Node) {
  if (!node || processingQueue.includes(node)) return;

  console.timeLog("content-script", "Queueing node for processing");
  processingQueue.push(node);
  if (!isProcessing) {
    requestIdleCallback(processQueue);
  }
}

function checkForChanges() {
  console.timeLog("content-script", "Checking for changes");
  const currentText = document.body.innerText;
  if (currentText !== lastProcessedText) {
    console.timeLog(
      "content-script",
      "Changes detected, queueing for processing",
    );
    queueForProcessing(document.body);
    lastProcessedText = currentText;
  }
}

function startScanning() {
  queueForProcessing(document.body);
  setInterval(checkForChanges, CHECK_INTERVAL);
}

// Set up mutation observer to detect dynamic changes
function setupObserver() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => queueForProcessing(entry.target));
  });

  observer.observe(document.body);
}

function initializeScanner() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onDocumentReady);
  } else {
    onDocumentReady();
  }
}

function onDocumentReady() {
  console.timeLog("content-script", "Document ready, initializing scanner");
  setupObserver();
  startScanning();
}

// Initialize the scanner
initializeScanner();

console.timeLog("content-script", "EIP/ERC Mention Finder revision: 14");
