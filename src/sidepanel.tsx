import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import styled from "styled-components";
import { getProposalInfo } from "./getProposalInfo";

const MarkdownContainer = styled.div`
  & p {
    margin-bottom: 1em;
  }

  & h1,
  & h2,
  & h3,
  & h4,
  & h5,
  & h6 {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
  }

  & ul,
  & ol {
    margin-bottom: 1em;
    padding-left: 2em;
  }

  & li {
    margin-bottom: 0.5em;
  }

  & pre {
    margin-bottom: 1em;
    padding: 1em;
    background-color: #f0f0f0;
    border-radius: 4px;
    overflow-x: auto;
  }

  & code {
    background-color: #f0f0f0;
    padding: 0.2em 0.4em;
    border-radius: 3px;
  }

  & blockquote {
    border-left: 4px solid #ccc;
    padding-left: 1em;
    margin-left: 0;
    margin-bottom: 1em;
  }
`;

const fetchMarkdown = async (url: string, retries = 3, delay = 1000) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(`${url}?raw=true`);
      if (response.status === 404) {
        return null; // Return null for 404 errors
      }
      if (response.status === 429) {
        // If rate limited, wait before retrying
        await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
        continue;
      }
      if (!response.ok) throw new Error("Network response was not ok");
      return await response.text();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }
  return "Failed to load content after retries.";
};

interface Frontmatter {
  [key: string]: string | string[] | number | undefined;
}

export default function SidePanel() {
  const [mentions, setMentions] = useState([]);
  const [markdownContent, setMarkdownContent] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [failedMentions, setFailedMentions] = useState(new Set());

  const handleMessage = useCallback((msg: any) => {
    if (msg.action === "mentionsUpdated") {
      setMentions(msg.mentions);
    }
  }, []);

  const truncatedMentions = useMemo(() => mentions.slice(0, 9), [mentions]);

  useEffect(() => {
    const port = chrome.runtime.connect({ name: "sidepanel" });
    port.onMessage.addListener(handleMessage);
    port.postMessage({ action: "getMentions" });

    const intervalId = setInterval(() => {
      port.postMessage({ action: "getMentions" });
    }, 5000);

    return () => {
      clearInterval(intervalId);
      port.onMessage.removeListener(handleMessage);
      port.disconnect();
    };
  }, [handleMessage]);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      const mentionsToFetch = truncatedMentions.filter(
        (mention) => !markdownContent[mention] && !failedMentions.has(mention),
      );

      for (const mention of mentionsToFetch) {
        const info = getProposalInfo(mention);
        if (info?.url) {
          try {
            const content = await fetchMarkdown(info.url);
            if (content === null) {
              setFailedMentions((prev) => new Set(prev).add(mention));
              setMarkdownContent((prev) => ({
                ...prev,
                [mention]: "Content not available (404 error).",
              }));
            } else {
              setMarkdownContent((prev) => ({ ...prev, [mention]: content }));
            }
          } catch (error) {
            console.error(`Failed to fetch content for ${mention}:`, error);
            setMarkdownContent((prev) => ({
              ...prev,
              [mention]: "Failed to load content.",
            }));
          }
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      setIsLoading(false);
    };

    if (truncatedMentions.length > 0) {
      fetchContent();
    }
  }, [truncatedMentions, markdownContent, failedMentions]);

  return (
    <TabGroup className="font-sans p-6 bg-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Proposals</h1>
      <TabList className="flex flex-row flex-wrap items-center justify-start gap-2 mb-4">
        {truncatedMentions.map((mention, index) => (
          <Tab
            key={`${index}-${mention}-tab`}
            className={({ selected }) =>
              `px-4 py-2 rounded-md text-sm font-medium focus:outline-none ${
                selected
                  ? "bg-blue-600 text-white"
                  : "bg-white text-blue-600 hover:bg-gray-100"
              }`
            }
          >
            {mention}
          </Tab>
        ))}
        {mentions.length > truncatedMentions.length && (
          <div>
            + {mentions.length - truncatedMentions.length} more unrendered
          </div>
        )}
      </TabList>
      <TabPanels>
        {truncatedMentions.map((mention, index) => {
          const info = getProposalInfo(mention);
          return (
            <TabPanel
              key={`${index}-${mention}-panel`}
              className="bg-white shadow-md rounded-lg p-4"
            >
              <h2 className="text-xl font-semibold text-gray-700 mb-4">
                <a
                  href={info?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline decoration-wavy"
                >
                  {mention}
                </a>
              </h2>
              <MarkdownContainer className="prose max-w-none">
                {isLoading && !markdownContent[mention] ? (
                  <p>Loading...</p>
                ) : (
                  <Markdown remarkPlugins={[remarkGfm]}>
                    {markdownContent[mention] || "Content not available."}
                  </Markdown>
                )}
              </MarkdownContainer>
            </TabPanel>
          );
        })}
      </TabPanels>
    </TabGroup>
  );
}
