import * as dotenv from 'dotenv';
dotenv.config();
export const requestWithdrawal = async (
  data: any,
  amount?: any,
  userWallet?: any,
) => {
  const { walletMain, chatId, username } = data;

  const state = process.env.ENVIRONMENT;

  return {
    message: `<b>Withdrawal Request 🔔</b>\n\n<b>Details :</b>\n- User: ${username}\n\n<b>Amount requested:</b> <code>${amount}</code> $.\n\n- wallet Address: <code>${state === 'NORMAL' ? userWallet : walletMain}</code>\n(tap to copy)`,
    keyboard: [
      [
        {
          text: '✅ Process',
          callback_data: JSON.stringify({
            command: '/withrawalProccessed',
            userChatIdAmount: `${chatId}&${amount}`,
          }),
        },
        // {
        //   text: '🚫 Cancel withdrawal',
        //   callback_data: JSON.stringify({
        //     command: '/withdrawalReject',
        //     userChatId: `${chatId}`,
        //   }),
        // },
      ],
    ],
  };
};
