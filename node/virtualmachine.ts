import { Token, TokenInstance } from './token';
import { Wallet, TokenMetaData, TokenInstanceData, Transaction } from './interfaces';
import { Manager, Database } from '@enjine/database';

export class VirtualMachine extends Token {
  private tokens: { [symbol: string]: any } = {}; // TODO fix interfaces `Token` & `TokenInstance`
  private db: Manager;

  constructor(name: string, symbol: string, totalSupply: number, transactionFee: number) {
    super(name, symbol, totalSupply, transactionFee);

    this.db = new Manager('./data/vm/' + symbol);
    this.initAllTokenInstances() // TODO
  };

  private async initToken(tokenInstance) {
    tokenInstance.on('transaction', async (transaction: Transaction) => {
      const transactionDatabase: Database = await this.db.open(tokenInstance.symbol);
      await transactionDatabase.put(transaction.id, transaction);
    });
  };

  private async loadTokenIndex() {
    return await this.db.all();
  };

  private async initAllTokenInstances() {
    const tokenIndex = await this.loadTokenIndex();
    for (const tokenMetaData of tokenIndex) {
      const transactionDatabase: Database = await this.db.open(tokenMetaData.symbol);

      const tokenInstanceData: TokenInstanceData = {
        id: tokenMetaData.id,
        name: tokenMetaData.name,
        symbol: tokenMetaData.symbol,
        owner: tokenMetaData.owner,
        totalSupply: tokenMetaData.totalSupply,
        transactionFee: tokenMetaData.transactionFee,
        transactions: await transactionDatabase.all(),
      };

      const token: TokenInstance = new TokenInstance(tokenInstanceData);
      await this.initToken(token);

      this.tokens[tokenMetaData.symbol] = token;
    };
  };

  public async deployToken(
    name: string,
    symbol: string,
    totalSupply: number,
    transactionFee: number
  ): Promise<any> {
    const token: Token = new Token(name, symbol, totalSupply, transactionFee);
    await this.initToken(token);
    const genesisWallet: Wallet = token.initGenesis();
    const tokenMetaData: TokenMetaData = token.getTokenMetaData();
    const balance: number = token.calculateBalance(genesisWallet.publicKey)

    this.tokens[tokenMetaData.symbol] = token;

    await this.db.put(tokenMetaData.symbol, tokenMetaData);

    return {
      tokenMetaData,
      genesisWallet,
      balance
    };
  };

  public getTokenBySymbol(symbol: string): TokenInstance | undefined {
    if (this.tokens[symbol]) {
      return this.tokens[symbol].getTokenMetaData();
    } else {
      return undefined;
    };
  };

  // public getTokenById() {
  //   return undefined;
  // };

  public createTokenWallet(symbol: string): Wallet | undefined {
    const token: TokenInstance = this.tokens[symbol];
    if (token) {
      return token.createWallet();
    };
    return undefined;
  };

  public createTokenTransaction(
    symbol: string,
    from: string,
    to: string,
    amount: number,
    privateKey: string
  ): boolean | Error {
    try {
      const token: TokenInstance = this.tokens[symbol];
      if (!token) {
        throw new Error('Token not found');
      };
      return token.createTransaction(from, to, amount, privateKey);
    } catch (error) {
      throw new Error(error)
    }
  };

  public calculateTokenBalance(symbol: string, publicKey: string): number {
    const token: TokenInstance = this.tokens[symbol];
    if (token) {
      return token.calculateBalance(publicKey);
    };
    return 0;
  };

  public getTokenTransactionsByPublicKey(
    symbol: string,
    publicKey: string
  ): Transaction[] | undefined {
    const token: TokenInstance = this.tokens[symbol];
    if (token) {
      return token.getTransactionsByPublicKey(publicKey);
    };
    return undefined;
  };

  public getAllTokens(): TokenMetaData[] {
    return Object.values(this.tokens).map((token) => token.getTokenMetaData());
  };
};
