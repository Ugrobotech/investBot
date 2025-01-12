import * as dotenv from 'dotenv';
dotenv.config();

export const walletDetailsMarkup = async (data: any) => {
  const { mainWallet, wallet } = data;
  const state = process.env.ENVIRONMENT;
  return {
    message: `<b>Address:</b>\n<code>${state === 'NORMAL' ? wallet : mainWallet}</code>\n\n Tap to copy the address`,
    keyboard: [
      [
        {
          text: 'Export wallet',
          callback_data: JSON.stringify({
            command: '/exportWallet',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'Close ❌',
          callback_data: JSON.stringify({
            command: '/close',
            language: 'english',
          }),
        },
      ],
    ],
  };
};
