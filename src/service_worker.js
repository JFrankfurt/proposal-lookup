let currentMentions = [];
let activeProposal = null;

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  console.log("Received message:", request);
  if (request.action === "updateMentions") {
    currentMentions = request.mentions;
    console.log("Mentions updated:", currentMentions);
    // Notify the side panel about the updated mentions
    chrome.runtime.sendMessage({
      action: "mentionsUpdated",
      mentions: currentMentions,
    });
  } else if (request.action === "getMentions") {
    // Send the current mentions when requested
    sendResponse({ mentions: currentMentions });
  }
  // Return true to indicate that we will send a response asynchronously
  return true;
});

// Listen for connections from the sidepanel
chrome.runtime.onConnect.addListener((port) => {
  console.log("Side panel connected");

  port.onMessage.addListener((msg) => {
    console.log("Received message from side panel:", msg);

    if (msg.action === "getMentions") {
      port.postMessage({
        action: "mentionsUpdated",
        mentions: currentMentions,
      });
    } else if (msg.action === "getActiveProposal") {
      port.postMessage({
        action: "activeProposalChanged",
        proposal: activeProposal,
      });
    }
  });
});

chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));
