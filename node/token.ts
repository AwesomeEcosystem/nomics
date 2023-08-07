import { createHash } from 'crypto';
import { ec as EC } from 'elliptic';
import { EventEmitter } from 'events';
import {
  Wallet,
  TokenMetaData,
  Transaction,
  TokenInstanceData,
} from './interfaces';

export class TokenInstance { // TODO fix doubles with correct interaces
  id: string;
  name: string;
  symbol: string;
  owner: string | null;
  totalSupply: number;
  transactionFee: number;
  transactions: Transaction[];
  events: EventEmitter = new EventEmitter();

  constructor(tokenInstanceData: TokenInstanceData) {
    this.id = tokenInstanceData.id;
    this.name = tokenInstanceData.name;
    this.symbol = tokenInstanceData.symbol;
    this.owner = tokenInstanceData.owner;
    this.totalSupply = tokenInstanceData.totalSupply;
    this.transactionFee = tokenInstanceData.transactionFee;
    this.transactions = tokenInstanceData.transactions;
  };

  public on(eventName: string, listener: any) {
      this.events.on(eventName, listener);
  };

  public emit(eventName: string, data?: any) {
    this.events.emit(eventName, data);
  };

  public getTokenMetaData(): TokenMetaData {
    return {
      id: this.id,
      name: this.name,
      symbol: this.symbol,
      owner: this.owner,
      totalSupply: this.totalSupply,
      transactionFee: this.transactionFee,
      transactions: this.transactions,
    };
  };

  public initGenesis() {
    if (!this.owner) {
      const genesisWallet: Wallet = this.createWallet()
      this.owner = genesisWallet.publicKey

      // Genesis transaction
      const genesisTransaction: Transaction = {
        id: this.id,
        previousTransactionId: null,
        date: Date.now(),
        from: this.id,
        to: this.owner,
        amount: this.totalSupply,
        fee: 0,
        signature: this.id,
      };

      this.transactions.push(genesisTransaction);
      this.emit('transaction', genesisTransaction);

      return genesisWallet;
    };
  };

  public createWallet(): Wallet {
    const ec = new EC('secp256k1');
    const keyPair = ec.genKeyPair();
    const privateKey = keyPair.getPrivate('hex');
    const publicKey = keyPair.getPublic('hex');

    return {
      privateKey: privateKey,
      publicKey: publicKey,
    };
  };

  public createTransaction(from: string, to: string, amount: number, privateKey: string): boolean | Error {
    try {
      if (amount + this.transactionFee > this.calculateBalance(from)) {
          throw new Error('Insufficient Balance');
      };

      const previousTransaction: Transaction = this.transactions.slice(-1)[0];
      const transactionId = createHash('sha256').update(`${from}${to}${amount}${this.transactionFee}${Date.now()}`).digest('hex');

      const signature = this.sign(transactionId, privateKey);

      const transaction: Transaction = {
        id: transactionId,
        previousTransactionId: previousTransaction.id,
        date: Date.now(),
        from: from,
        to: to,
        amount: amount,
        fee: this.transactionFee,
        signature,
      };

      if (!this.verifySignature(transactionId, signature, from)) {
        return new Error(`Transaction couldn't be signed`);
      };

      this.transactions.push(transaction);
      this.emit('transaction', transaction);

      this.feeTransaction(transactionId, signature);
      return true;
    } catch (error) {
      throw new Error(error);
    };
  };

  private feeTransaction(transactionId, signature) {
    if (this.transactionFee) {
      const transaction: Transaction = {
        id: transactionId,
        previousTransactionId: transactionId,
        date: Date.now(),
        from: this.id,
        to: this.owner,
        amount: this.transactionFee,
        fee: 0,
        signature,
      };

      this.transactions.push(transaction);
      this.emit('transaction', transaction);
    };
  };

  private verifySignature(id: string, signature: string, publicKey: string): boolean {
    const ec = new EC('secp256k1');
    const key = ec.keyFromPublic(publicKey, 'hex');
    return key.verify(id, signature);
  };

  public sign(data: string, privateKey: string): string {
    const ec = new EC('secp256k1');
    const key = ec.keyFromPrivate(privateKey, 'hex');
    const signature = key.sign(data);
    return signature.toDER('hex');
  };

  public calculateBalance(publicKey: string): number {
    let balance = 0;
    for (const transaction of this.transactions) {
      if (transaction.from === publicKey) {
        balance -= transaction.amount + this.transactionFee;
      } else if (transaction.to === publicKey) {
        balance += transaction.amount;
      };
    };
    return balance;
  };

  public getTransactionsByPublicKey(publicKey: string): Transaction[] {
    return this.transactions.filter((transaction) => transaction.from === publicKey || transaction.to === publicKey);
  };
};

export class Token {
  id: string;
  name: string;
  symbol: string;
  owner: string | null;
  totalSupply: number;
  transactionFee: number;
  transactions: Transaction[];
  events: EventEmitter = new EventEmitter();

  constructor(name: string, symbol: string, totalSupply: number, transactionFee: number) {
    const hash = createHash('sha256');
    hash.update(symbol);

    // Initialize Token
    this.id = hash.digest('hex');
    this.name = name;
    this.symbol = symbol;
    this.owner = null;
    this.totalSupply = totalSupply;
    this.transactionFee = transactionFee;
    this.transactions = [];
  };

  public on(eventName: string, listener: any) {
    this.events.on(eventName, listener);
  };

  public emit(eventName: string, data?: any) {
    this.events.emit(eventName, data)
  };

  public getTokenMetaData(): TokenMetaData {
    return {
      id: this.id,
      name: this.name,
      symbol: this.symbol,
      owner: this.owner,
      totalSupply: this.totalSupply,
      transactionFee: this.transactionFee,
      transactions: this.transactions,
    };
  };

  public initGenesis() {
    if (!this.owner) {
      const genesisWallet: Wallet = this.createWallet()
      this.owner = genesisWallet.publicKey

      // Genesis transaction
      const genesisTransaction: Transaction = {
        id: this.id,
        previousTransactionId: null,
        date: Date.now(),
        from: this.id,
        to: this.owner,
        amount: this.totalSupply,
        fee: 0,
        signature: this.id,
      };

      this.transactions.push(genesisTransaction);
      this.emit('transaction', genesisTransaction);

      return genesisWallet;
    };
  };

  public createWallet(): Wallet {
    const ec = new EC('secp256k1');
    const keyPair = ec.genKeyPair();
    const privateKey = keyPair.getPrivate('hex');
    const publicKey = keyPair.getPublic('hex');

    return {
      privateKey: privateKey,
      publicKey: publicKey,
    };
  };

  public createTransaction(from: string, to: string, amount: number, privateKey: string): boolean | Error {
    if (amount + this.transactionFee > this.calculateBalance(from)) {
      return new Error('Insufficient Balance');
    };

    const previousTransaction: Transaction = this.transactions.slice(-1)[0];
    const transactionId = createHash('sha256').update(`${from}${to}${amount}${this.transactionFee}${Date.now()}`).digest('hex');

    const signature = this.sign(transactionId, privateKey);

    const transaction: Transaction = {
      id: transactionId,
      previousTransactionId: previousTransaction.id,
      date: Date.now(),
      from: from,
      to: to,
      amount: amount,
      fee: this.transactionFee,
      signature,
    };

    if (!this.verifySignature(transactionId, signature, from)) {
      return new Error(`Transaction couldn't be signed`);
    };

    this.transactions.push(transaction);
    this.emit('transaction', transaction);

    this.feeTransaction(transactionId, signature);
    return true;
  };

  private feeTransaction(transactionId, signature) {
    if (this.transactionFee) {
      const transaction: Transaction = {
        id: transactionId,
        previousTransactionId: transactionId,
        date: Date.now(),
        from: this.id,
        to: this.owner,
        amount: this.transactionFee,
        fee: 0,
        signature,
      };

      this.transactions.push(transaction);
      this.emit('transaction', transaction);
    };
  };

  private verifySignature(id: string, signature: string, publicKey: string): boolean {
    const ec = new EC('secp256k1');
    const key = ec.keyFromPublic(publicKey, 'hex');
    return key.verify(id, signature);
  };

  public sign(data: string, privateKey: string): string {
    const ec = new EC('secp256k1');
    const key = ec.keyFromPrivate(privateKey, 'hex');
    const signature = key.sign(data);
    return signature.toDER('hex');
  };

  public calculateBalance(publicKey: string): number {
    let balance = 0;
    for (const transaction of this.transactions) {
      if (transaction.from === publicKey) {
        balance -= transaction.amount + this.transactionFee;
      } else if (transaction.to === publicKey) {
        balance += transaction.amount;
      };
    };
    return balance;
  };

  public getTransactionsByPublicKey(publicKey: string): Transaction[] {
    return this.transactions.filter((transaction) => transaction.from === publicKey || transaction.to === publicKey);
  };
};
