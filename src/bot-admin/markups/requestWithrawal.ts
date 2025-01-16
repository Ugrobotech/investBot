import * as dotenv from 'dotenv';
dotenv.config();
export const requestWithdrawal = async (data: any, amount?: any) => {
  const {
    wallet,
    walletMain,
    chatId,
    username,
    earnings,
    referralBonus,
    nodeProviderBonus,
  } = data;

  const sumTotal =
    Number(earnings) + Number(referralBonus) + Number(nodeProviderBonus);

  const state = process.env.ENVIRONMENT;

  return {
    message: `<b>Withdrawal Request 🔔</b>\n\n<b>Details :</b>\n- User: ${username}\n- Earning: ${earnings} eth.\n- Referral Bonus: ${referralBonus} eth.\n${parseFloat(nodeProviderBonus) > 0 ? `- Node provider earnings: ${nodeProviderBonus} eth` : ``}\n\n <b>Total:</b> <code>${sumTotal}</code> eth\n\n\n<b>Amount requested:</b> <code>${amount}</code> eth.\n\n- wallet Address: <code>${state === 'NORMAL' ? wallet : walletMain}</code>\n(tap to copy)`,
    keyboard: [
      [
        {
          text: '✅ Process',
          callback_data: JSON.stringify({
            command: '/withrawalProccessed',
            userChatId: `${chatId}`,
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
