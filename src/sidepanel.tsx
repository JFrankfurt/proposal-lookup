import React, { useEffect, useState } from "react";

export default function SidePanel() {
  const [mentions, setMentions] = useState<string[]>([]);

  useEffect(() => {
    const port = chrome.runtime.connect({ name: "sidepanel" });

    const handleMessage = (msg: any) => {
      if (msg.action === "mentionsUpdated") {
        setMentions(msg.mentions);
      }
    };

    port.onMessage.addListener(handleMessage);

    // Initial request for mentions
    port.postMessage({ action: "getMentions" });

    // Set up an interval to periodically request updates
    const intervalId = setInterval(() => {
      console.log('jf postmessage getMentions')
      port.postMessage({ action: "getMentions" });
    }, 5000); // Check every 5 seconds

    // Cleanup function
    return () => {
      clearInterval(intervalId);
      port.onMessage.removeListener(handleMessage);
      port.disconnect();
    };
  }, []);

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: "20px" }}>
      <h1 style={{ color: "#4a4a4a" }}>EIP/ERC Mentions</h1>
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
};
