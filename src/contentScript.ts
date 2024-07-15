// Constants
const PROPOSAL_MATCH_PATTERN =
  /\b(EIP|ERC|CAIP|BIP)[-\s]?([0-9]|[1-9][0-9]{1,3})\b/gi;
const CHECK_INTERVAL = 10 * 1000; // 10 seconds
const CHUNK_SIZE = 10000; // Process 10000 characters at a time

// State variables
let lastProcessedText = "";
let processingQueue: Node[] = [];
let isProcessing = false;

function normalizeMention(mention: string): string {
  // Remove any spaces, convert to uppercase, and ensure there's a hyphen between text and numbers
  return mention
    .replace(/\s/g, "")
    .toUpperCase()
    .replace(/([A-Z]+)(\d+)/, "$1-$2");
}

function findMentionsInText(text: string): Set<string> {
  const mentions = new Set<string>();
  const matches = text.match(PROPOSAL_MATCH_PATTERN);
  if (matches) {
    matches.forEach((match) => {
      const normalizedMention = normalizeMention(match);
      mentions.add(normalizedMention);
    });
  }
  return mentions;
}

function processTextNode(node: Text): Set<string> {
  return findMentionsInText(node.textContent || "");
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

  console.log(`Processing queue with ${processingQueue.length} elements`);
  isProcessing = true;
  const node = processingQueue.shift(); // Process one node at a time

  if (node && node.isConnected) {
    const mentions =
      node instanceof Element ? findMentionsInElement(node) : new Set<string>();
    console.log(`Sending ${mentions.size} mentions to background`);
    chrome.runtime.sendMessage({
      action: "updateMentions",
      mentions: Array.from(mentions),
    });
  }

  isProcessing = false;
  if (processingQueue.length > 0) {
    requestIdleCallback(processQueue);
  }
}

function queueForProcessing(node: Node) {
  if (!node || processingQueue.includes(node)) return;

  console.log("Queueing node for processing");
  processingQueue.push(node);
  if (!isProcessing) {
    requestIdleCallback(processQueue);
  }
}

function checkForChanges() {
  console.log("Checking for changes");
  const currentText = document.body.innerText;
  if (currentText !== lastProcessedText) {
    console.log("Changes detected, queueing for processing");
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
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          queueForProcessing(node);
        }
      });
    });
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

function initializeScanner() {
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onDocumentReady);
  } else {
    onDocumentReady();
  }
}

function onDocumentReady() {
  console.log("Document ready, initializing scanner");
  setupObserver();
  startScanning();
}

// Initialize the scanner
initializeScanner();

console.log("EIP/ERC Mention Finder revision: 14");
