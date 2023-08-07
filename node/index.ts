import express, { Request, Response } from 'express';
import bodyParser from 'body-parser';
import session from 'express-session';
// import levelStoreFactory from 'level-session-store';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
// import { Token } from './token'; // Import Token and TokenMetaData interfaces
import { VirtualMachine } from './virtualmachine'
import { TokenWalletData, Wallet, TokenMetaData } from './interfaces';
import {
  createUser,
  getUserByEmail,
  comparePasswords,
  getUserTokens,
  addTokenToUser,
  updatePassword,
  addFeedback,
  getAllFedback,
} from './store';

const vm = new VirtualMachine('eLabs', 'ELABS', 3000000, 1)

declare module "express-session" {
  interface SessionData {
    user: any;
  }
};

const app = express();
const port = 3000;

const SECTRET = '32er'

// Middleware
app.use(bodyParser.json());
app.use(cors({
  // origin: 'https://192.168.0.34:5173/',
  // credentials: true,
}));
app.set('trust proxy', 1);
app.use(session({
  genid: (_req) => uuidv4(),
  // store: new (levelStoreFactory(session))('./data/sessions'),
  name: 'eco',
  secret: SECTRET,
  resave: false,
  saveUninitialized: true,
  // cookie: {
  //   sameSite: 'none', // setting sameSite to none
  //   secure: true, // setting secure to true
  //   httpOnly: true,
  //   maxAge: 24 * 60 * 60 * 1000 // 24 hours
  // }
}) as any);

app.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await createUser(email, password);

    req.session.user = user.email;
    res.status(201).json({ message: 'User created successfully' });
  } catch (err) {
    res.status(500).json({ error: `Failed to create user: ${err}` });
  };
});

app.post('/signin', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);
    if (user && await comparePasswords(password, user.password)) {
      req.session.user = user.email;

      const tokens = await getUserTokens(email);
      res.json({ message: 'Authentication successful', tokens });
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    };
  } catch (err) {
    res.status(500).json({ error: 'Failed to authenticate' });
  };
});

app.post('/update-password', async (req: Request, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;
    await updatePassword(req.session.user, oldPassword, newPassword)

    res.status(200).json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update password' });
  };
  // if (req.session.user) {
  // } else {
  //   res.status(401).json({ error: 'Not authenticated' });
  // };
});

app.get('/tokens/:user', async (req: Request, res: Response) => {
  try {
    const tokens = await getUserTokens(req.params.user);
    let userTokens = []

    for (let token of tokens) {
      const balance = vm.calculateTokenBalance(token.symbol, token.publicKey);
      const tokenMetaData = vm.getTokenBySymbol(token.symbol);
      userTokens.push({
        id: tokenMetaData.id,
        name: tokenMetaData.name,
        symbol: tokenMetaData.symbol,
        fee: tokenMetaData.transactionFee,
        privateKey: token.privateKey,
        publicKey: token.publicKey,
        balance
      });
    };

    res.json(userTokens);
  } catch (error) {
    res.status(500).json({ error: 'Failed to get tokens' });
  };
  // if (req.session.user) {
  // } else {
  //   res.status(401).json({ error: 'Not authenticated' });
  // };
});

app.post('/tokens/deploy', async (req: Request, res: Response) => {
  try {
    const { user, tokenData } = req.body;
    const { name, symbol, totalSupply, transactionFee } = tokenData;

    const alreadyExists = await vm.getTokenBySymbol(symbol);
    if (alreadyExists) {
      return res.status(500).json({ error: 'Token already exists!' });
    };

    const data: any = await vm.deployToken(name, symbol, totalSupply, transactionFee);

    const processedTokenData = {
      id: data.tokenMetaData.id,
      symbol: data.tokenMetaData.symbol,
      name: data.tokenMetaData.name,
      publicKey: data.genesisWallet.publicKey,
      privateKey: data.genesisWallet.privateKey,
    };

    await addTokenToUser(user, processedTokenData);

    res.status(201).json({
      tokenId: processedTokenData.id,
      tokenName: processedTokenData.name,
      tokenSymbol: processedTokenData.symbol,
      balance: vm.calculateTokenBalance(processedTokenData.symbol, processedTokenData.publicKey),
      publicKey: processedTokenData.publicKey,
      privateKey: processedTokenData.privateKey
    });
  } catch (err) {
    res.status(500).json({ error: `Failed to deploy token: ${err}` });
  };
  // if (req.session.user) {
  // } else {
  //   res.status(401).json({ error: 'Not authenticated' });
  // };
});

app.post('/tokens/transfer', async (req: Request, res: Response) => {
  try {
    const { user, email, amount, token } = req.body;
    const sender = await getUserByEmail(user);
    const receiver = await getUserByEmail(email);

    const senderWalletData: any = sender.tokens.find(tk => tk.symbol === token.symbol);
    const receiverWalletData: any = receiver.tokens.find(tk => tk.symbol === token.symbol);

    const tokenInstance: any = vm.getTokenBySymbol(token.symbol);
    const tokenMetaData: TokenMetaData = tokenInstance;

    let finalReceiverWalletData: any = {};

    if (!senderWalletData) {
      return res.status(500).json({ error: 'Wallet for such token doesnt exist!' });
    };

    if (!receiverWalletData) {
      const newReceiverWallet: Wallet = vm.createTokenWallet(tokenMetaData.symbol);
      
      finalReceiverWalletData = {
        id: tokenMetaData.id,
        symbol: tokenMetaData.symbol,
        name: tokenMetaData.name,
        publicKey: newReceiverWallet.publicKey,
        privateKey: newReceiverWallet.privateKey
      };

      await addTokenToUser(receiver.email, finalReceiverWalletData);
    } else {
      finalReceiverWalletData = receiverWalletData;
    };
    await vm.createTokenTransaction(tokenMetaData.symbol, senderWalletData.publicKey, finalReceiverWalletData.publicKey, amount, senderWalletData.privateKey);

    res.status(201).json({ message: 'Token successfully transferred' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  };
});

app.post('/tokens/add', async (req: Request, res: Response) => {
  try {
    const { tokenId } = req.body;
    const token = await vm.getTokenBySymbol(tokenId);
    const wallet: Wallet = token.createWallet();
    const publicKey: string = wallet.publicKey;
    const privateKey: string = wallet.privateKey;
    const tokenData: TokenWalletData = {
      id: token.getTokenMetaData().id,
      symbol: token.getTokenMetaData().symbol,
      publicKey: publicKey,
      privateKey: privateKey,
    };

    await addTokenToUser(req.session.user, tokenData);
    res.status(201).json({ tokenData, privateKey });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create wallet for token' });
  };
  // if (req.session.user) {
  // } else {
  //   res.status(401).json({ error: 'Not authenticated' });
  // };
});

app.get('/all-tokens', async (_req: Request, res: Response) => {
  try {
    const tokens = await vm.getAllTokens();
    res.json(tokens);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tokens' });
  }
});

app.post('/feedback', async (req: Request, res: Response) => {
  try {
    await addFeedback(req.body.feedback)
    res.status(201).json({ message: 'Thanks for your feedback :)' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send feedback' });
  };
  // if (req.session.user) {
  // } else {
  //   res.status(401).json({ error: 'Not authenticated' });
  // };
});

app.get('/feedback', async (_req: Request, res: Response) => {
  try {
    const feedback = await getAllFedback()
    res.status(201).json(feedback);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load feedbacks' });
  };
  // if (req.session.user) {
  // } else {
  //   res.status(401).json({ error: 'Not authenticated' });
  // };
});

// Start the server
app.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
});
