import { Manager } from '@enjine/database';
import bcrypt from 'bcrypt';
import { TokenWalletData } from './interfaces';

// Database Manager
const db = new Manager('./data'); // TODO Facelift

// User Store
const userDB = db.create('users');

// Feddback Store
const feedbackDB = new Manager('./feedback');

// User Handling
export const getUserByEmail = async (email: string): Promise<any> => {
  try {
    const userExists = await userDB.exists(email);

    if (!userExists) {
      const user = {
        email,
        tokens: []
      };

      // if (token) {
      //
      // }

      await userDB.put(email, user);
      return user;
    }

    return await userDB.get(email);
  } catch (error) {
    throw new Error(error);
  };
};

export const userAuth0 = async (email: string):Promise<any> => {
  try {
    const userExists = await userDB.exists(email);

    if (userExists) {
      return await getUserTokens(email)
    }

    const user = {
      email,
      tokens: []
    };

    return await userDB.put(email, user);
  } catch (error) {
    throw new Error(error);
  };
}

export const createUser = async (email: string, password: string): Promise<any> => {
  try {
    const userExists = await userDB.exists(email);

    if (userExists) {
      throw new Error('User already exists!');
    };

    const hash = await bcrypt.hash(password, 10);
    const user = {
      email,
      password: hash,
      tokens: []
    };
    return await userDB.put(email, user);

  } catch (error) {
    throw new Error(error);
  };
};

export const comparePasswords = async (password: string, hash: string): Promise<boolean> => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (error) {
    throw new Error(error);
  };
};

export const updatePassword = async (email: string, oldPassword: string, newPassword: string) => {
  try {
    const user = await getUserByEmail(email);

    // Check that the old password is correct
    const isCorrectOldPassword = await comparePasswords(oldPassword, user.password);
    if (!isCorrectOldPassword) {
      throw new Error('Old password is incorrect');
    };

    // Update the password
    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    await userDB.put(user.email, user);
  } catch (error) {
    throw new Error(error);
  };
};

export const getUserTokens = async (email: string): Promise<any[]> => { // TODO denasty!
  try {
    const user = await getUserByEmail(email);
    return user.tokens;
  } catch (error) {
    throw new Error(error);
  };
};

export const addTokenToUser = async (email: string, token: TokenWalletData): Promise<any> => {
  try {
    const user = await getUserByEmail(email);

    const tokenExists = user.tokens.find(t => t.id === token.id);
    if (!tokenExists) {
      user.tokens.push(token);
      return await userDB.put(email, user);
    };
  } catch (error) {
    throw new Error(error);
  };
};

export const addFeedback = async (feedback: string): Promise<any> => {
  try {
    await feedbackDB.put(new Date().toString(), feedback)
  } catch (error) {
    throw new Error(error);
  };
};

export const getAllFedback = async (): Promise<any> => {
  try {
    return await feedbackDB.all();
  } catch (error) {
    throw new Error(error);
  };
};
