import React, { useCallback, useEffect, useState } from "react";

interface ProposalInfo {
  type: string;
  number: string;
  title: string;
  url: string;
}

export default function SidePanel() {
  const [mentions, setMentions] = useState<string[]>([]);
  const [activeProposal, setActiveProposal] = useState<ProposalInfo | null>(
    null,
  );

  const handleMessage = useCallback((msg: any) => {
    if (msg.action === "mentionsUpdated") {
      setMentions(msg.mentions);
    }
    if (msg.action === "activeProposalChanged") {
      setActiveProposal(msg.proposal);
    }
  }, []);

  useEffect(() => {
    const port = chrome.runtime.connect({ name: "sidepanel" });

    port.onMessage.addListener(handleMessage);

    // Initial request for mentions
    port.postMessage({ action: "getMentions" });
    port.postMessage({ action: "getActiveProposal" });

    // Set up an interval to periodically request updates
    const intervalId = setInterval(() => {
      console.log("jf postmessage getMentions");
      port.postMessage({ action: "getMentions" });
    }, 5000); // Check every 5 seconds

    // Cleanup function
    return () => {
      clearInterval(intervalId);
      port.onMessage.removeListener(handleMessage);
      port.disconnect();
    };
  }, [handleMessage]);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <h1 style={{ color: "#4a4a4a" }}>EIP/ERC Mentions</h1>
      {activeProposal && (
        <div
          style={{
            marginBottom: "20px",
            padding: "10px",
            backgroundColor: "#f0f0f0",
            borderRadius: "5px",
          }}
        >
          <h2>
            {activeProposal.type}-{activeProposal.number}
          </h2>
          <p>{activeProposal.title}</p>
          <a
            href={activeProposal.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View Proposal
          </a>
        </div>
      )}
      <ul style={{ listStyleType: "none", padding: 0 }}>
        {mentions.map((mention, index) => (
          <li key={index} style={{ marginBottom: "10px" }}>
            <a
              href={`https://eips.ethereum.org/EIPS/${mention.toLowerCase()}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: "#0066cc",
                textDecoration: "none",
                fontWeight: "bold",
                backgroundColor: "#f0f0f0",
                padding: "5px 10px",
                borderRadius: "5px",
                display: "inline-block",
              }}
            >
              {mention}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
