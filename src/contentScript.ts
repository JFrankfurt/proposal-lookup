import * as cheerio from "cheerio";

const EIP_ERC_PATTERN = /\b(EIP|ERC)-(\d{1,4})\b/g;

function createStyledSpan(text: string): string {
  return `<span class="eip-erc-mention" style="background-color: #ffff00; color: #000000; padding: 2px 4px; border-radius: 3px; font-weight: bold;">${text}</span>`;
}

function processText(text: string): string {
  return text.replace(EIP_ERC_PATTERN, (match) => createStyledSpan(match));
}

function findAndStyleEIPERCMentions(): Set<string> {
  const mentions = new Set<string>();
  const $ = cheerio.load(document.body.innerHTML);

  $("*")
    .contents()
    .each((_, node) => {
      if (
        node.type === "text" &&
        node.parent &&
        !$(node.parent).hasClass("eip-erc-mention")
      ) {
        const text = $(node).text();
        if (EIP_ERC_PATTERN.test(text)) {
          const newHtml = processText(text);
          $(node).replaceWith(newHtml);
          text.match(EIP_ERC_PATTERN)?.forEach((match) => mentions.add(match));
        }
      }
    });

  // Apply changes to the actual DOM
  document.body.innerHTML = $.html();

  return mentions;
}

function sendMentionsToBackground(mentions: Set<string>) {
  const uniqueMentions = Array.from(mentions).sort();
  chrome.runtime.sendMessage({
    action: "updateMentions",
    mentions: uniqueMentions,
  });
}

// Initial run
const initialMentions = findAndStyleEIPERCMentions();
sendMentionsToBackground(initialMentions);

// Set up MutationObserver for dynamic content
const observer = new MutationObserver((mutations) => {
  let shouldUpdate = false;
  for (const mutation of mutations) {
    if (mutation.type === "childList") {
      for (const node of mutation.addedNodes) {
        if (
          node.nodeType === Node.ELEMENT_NODE &&
          !(node as Element).classList.contains("eip-erc-mention")
        ) {
          shouldUpdate = true;
          break;
        }
      }
    }
    if (shouldUpdate) break;
  }

  if (shouldUpdate) {
    const newMentions = findAndStyleEIPERCMentions();
    sendMentionsToBackground(newMentions);
  }
});

observer.observe(document.body, { childList: true, subtree: true });

console.log("EIP/ERC Mention Finder: Script loaded and running");
