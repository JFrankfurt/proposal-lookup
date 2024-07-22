import { Proposal } from "./types";

console.time("service-worker");

let activeTabId: number | null | undefined = null;
async function getCurrentTab() {
  let queryOptions = { active: true, lastFocusedWindow: true };
  // `tab` will either be a `tabs.Tab` instance or `undefined`.
  let [tab] = await chrome.tabs.query(queryOptions);
  activeTabId = tab.id;
}

let sidePanelPort: chrome.runtime.Port | null = null;
// Keep track of the active tab
chrome.tabs.onActivated.addListener(getCurrentTab);

// Update activeTabId when a new window is focused
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) {
    getCurrentTab();
  }
});

let currentProposals: Proposal[] = [];
// Listen for messages from content scripts or other parts of the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.timeLog("service-worker", "Received message:", request);

  if (request.action === "updateProposals") {
    currentProposals = request.proposals;
    console.timeLog(
      "service-worker",
      "Service worker proposal set updated:",
      currentProposals,
    );

    // Broadcast the update to all tabs and the side panel
    if (
      sidePanelPort &&
      (sender.tab?.id === activeTabId || sender.id === activeTabId)
    ) {
      sidePanelPort.postMessage({
        action: "proposalsUpdated",
        proposals: currentProposals,
      });
    }
  } else if (request.action === "getProposals") {
    sendResponse({ proposals: currentProposals });
  }

  // Return true to indicate you wish to send a response asynchronously
  return true;
});

// Handle connections from the side panel
chrome.runtime.onConnect.addListener((port) => {
  console.timeLog("service-worker", "Side panel connected");

  if (port.name !== "sidepanel") {
    console.error("Unexpected port name:", port.name);
    return;
  }

  sidePanelPort = port;

  port.onMessage.addListener((msg) => {
    console.timeLog("service-worker", "Received message from side panel:", msg);
    if (msg.action === "getProposals") {
      port.postMessage({
        action: "proposalsUpdated",
        proposals: currentProposals,
      });
    }
  });

  // Send initial proposals to the side panel upon connection
  port.postMessage({ action: "proposalsUpdated", proposals: currentProposals });

  // Clean up when the port is disconnected
  port.onDisconnect.addListener(() => {
    console.timeLog("service-worker", "Side panel disconnected");
  });
});

// Initial active tab setup
getCurrentTab();

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
