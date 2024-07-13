let currentMentions = [];

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateMentions") {
    currentMentions = request.mentions;
    // Instead of sending a message, we'll just update our stored mentions
    console.log("Mentions updated:", currentMentions);
  } else if (request.action === "getMentions") {
    // Send the current mentions when requested
    sendResponse({ mentions: currentMentions });
  }
  // Return true to indicate that we will send a response asynchronously
  return true;
});

// Listen for connections from the sidepanel
chrome.runtime.onConnect.addListener((port) => {
  console.assert(port.name === "sidepanel");
  port.onMessage.addListener((msg) => {
    console.log('jf msg service_worker', msg)
    if (msg.action === "getMentions") {
      port.postMessage({
        action: "mentionsUpdated",
        mentions: currentMentions,
      });
    }
  });
});
