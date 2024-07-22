export type Proposal = `${string}-${string}`;
export type Message = {
  action: string;
  proposals: Proposal[];
};
