import EIPs from "./EIPs.json";
import ERCs from "./ERCs.json";

interface ProposalInfo {
  title: string;
  url: string;
}

export function getProposalInfo(proposal?: string): ProposalInfo | void {
  if (!proposal) return;
  const [type, number] = proposal.split(/[-\s]/);
  let url = "";
  let title = "";

  switch (type.toUpperCase()) {
    case "EIP":
      const eip = EIPs[number as keyof typeof EIPs];
      title = eip?.title ?? "";
      url = `https://github.com/ethereum/EIPs/blob/master/EIPS/eip-${number}.md`;
      break;
    case "ERC":
      const erc = ERCs[number as keyof typeof ERCs];
      title = erc?.title ?? "";
      url = `https://github.com/ethereum/ERCs/blob/master/ERCS/erc-${number}.md`;
      break;
    case "CAIP":
      url = `https://github.com/ChainAgnostic/CAIPs/blob/master/CAIPs/caip-${number}.md`;
      title = `CAIP-${number}`;
      break;
    case "BIP":
      url = `https://github.com/bitcoin/bips/blob/master/bip-${number.padStart(
        4,
        "0",
      )}.mediawiki`;
      title = `BIP-${number}`;
      break;
    default:
      url = "#";
      title = proposal;
  }

  return { title, url };
}
