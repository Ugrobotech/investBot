import * as dotenv from 'dotenv';
dotenv.config();
export const displayPrivateKeyMarkup = async (data: any) => {
  const { mainPK, PK } = data;
  const state = process.env.ENVIRONMENT;
  return {
    message: `Your Private Key is:\n\n <code>${state === 'NORMAL' ? PK : mainPK}</code> \n\nYou can now e.g. import the key into a wallet like trust Wallet, metamask etc (tap to copy)\nThis message should auto-delete in 1 minute. If not, delete this message once you are done.`,
    keyboard: [
      [
        {
          text: 'Delete 🗑️',
          callback_data: JSON.stringify({
            command: '/close',
            language: 'english',
          }),
        },
      ],
    ],
  };
};
