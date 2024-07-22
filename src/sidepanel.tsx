import { Tab, TabGroup, TabList, TabPanel, TabPanels } from "@headlessui/react";
import { formatDistanceToNow } from "date-fns/formatDistanceToNow";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import styled from "styled-components";
import { getProposalInfo } from "./getProposalInfo";
import AISummaries from "./proposal-summaries.json";
import { Message, Proposal } from "./types";

const POLLING_INTERVAL = 1000;

const SummaryContainer = styled.div`
  & a {
    color: red;
    transition: color 0.2s ease;
    text-decoration: red underline;
  }
  & a:hovered {
    color: black;
  }
  & a:visited {
    color: purple;
  }

  & p {
    margin-bottom: 1em;
  }

  & h1,
  & h2,
  & h3,
  & h4,
  & h5,
  & h6 {
    font-weight: 700;
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

const Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 100vh;
`;

const MemoizedTabPanel = React.memo(
  ({
    info,
    summary,
  }: {
    info: ReturnType<typeof getProposalInfo>;
    summary: string;
  }) => (
    <TabPanel className="bg-white shadow-md rounded-lg p-4">
      <a
        href={info?.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-lg underline decoration-2 text-red-600 transition-colors hover:text-black"
      >
        goto full text 🔗
      </a>
      {summary ? (
        <SummaryContainer
          className="prose max-w-none"
          dangerouslySetInnerHTML={{ __html: summary }}
        />
      ) : (
        <p>Sorry, we're missing info on this one!</p>
      )}
    </TabPanel>
  ),
);

const ErrorFallback = ({ error }: { error: Error }) => (
  <div role="alert">
    <p>Something went wrong:</p>
    <pre>{error.message}</pre>
  </div>
);

export default function SidePanel() {
  const [proposals, setProposals] = useState<Proposal[]>([]);

  const handleMessage = useCallback((msg: Message) => {
    if (msg.action === "proposalsUpdated") {
      setProposals(msg.proposals);
    }
  }, []);

  useEffect(() => {
    const port = chrome.runtime.connect({ name: "sidepanel" });
    port.onMessage.addListener(handleMessage);
    port.postMessage({ action: "getProposals" });

    const intervalId = setInterval(() => {
      port.postMessage({ action: "getProposals" });
    }, POLLING_INTERVAL);

    return () => {
      clearInterval(intervalId);
      port.onMessage.removeListener(handleMessage);
      port.disconnect();
    };
  }, [handleMessage]);

  const hasProposals = Boolean(proposals.length > 0);

  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <Wrapper className="p-2">
        <div className="p-2 bg-gray-100 flex-1 rounded-xl">
          {hasProposals ? (
            <TabGroup>
              <TabList className="flex flex-row flex-wrap items-center justify-start gap-2 mb-4 max-h-48 overflow-auto">
                {proposals.map((mention, index) => (
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
                    {({ selected }) => (
                      <span aria-selected={selected}>{mention}</span>
                    )}
                  </Tab>
                ))}
                {proposals.length > proposals.length && (
                  <div>
                    + {proposals.length - proposals.length} more unrendered
                  </div>
                )}
              </TabList>
              <TabPanels>
                {proposals.map((mention, index) => (
                  <MemoizedTabPanel
                    key={`${index}-${mention}-panel`}
                    info={getProposalInfo(mention)}
                    // @ts-expect-error string indexing is fine here
                    summary={AISummaries[mention]}
                  />
                ))}
              </TabPanels>
            </TabGroup>
          ) : (
            <p>No proposals found yet.</p>
          )}
        </div>
        <a
          target="_blank"
          rel="noopener noreferrer"
          href="https://jordanfrankfurt.com"
          className="underline decoration-2 text-red-600 transition-colors hover:text-black mx-auto"
        >
          written and maintained by Jordan Frankfurt 👺
        </a>
      </Wrapper>
    </ErrorBoundary>
  );
}
