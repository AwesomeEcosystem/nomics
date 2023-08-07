// export interface SessionRequest extends Request {
//   session: any;
// };

export interface Wallet {
  privateKey: string;
  publicKey: string;
};

export interface TokenMetaData {
  id: string;
  name: string;
  symbol: string;
  owner: string | null;
  totalSupply: number;
  transactionFee: number;
  transactions: Transaction[];
};

export interface TokenWalletData {
  id: string
  symbol: string;
  publicKey: string;
  privateKey: string; // TODO rework!!
};

export interface Transaction {
  id: string;
  previousTransactionId: string | null;
  date: number;
  from: string;
  to: string;
  amount: number;
  fee: number;
  signature: string;
};

export interface TokenInstanceData {
  id: string;
  name: string;
  symbol: string;
  owner: string | null;
  totalSupply: number;
  transactionFee: number;
  transactions: Transaction[]; // TODO fix doubles with correct interaces
};
