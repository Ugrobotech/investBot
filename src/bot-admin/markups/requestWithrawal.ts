import * as dotenv from 'dotenv';
dotenv.config();
export const requestWithdrawal = async (data: any) => {
  const {
    wallet,
    walletMain,
    chatId,
    username,
    earnings,
    referralBonus,
    nodeBonus,
  } = data;

  const sumTotal = Number(earnings) + Number(referralBonus) + Number(nodeBonus);

  const state = process.env.ENVIRONMENT;

  return {
    message: `<b>Withdrawal Request 🔔</b>\n\n<b>Details :</b>\n- User: ${username}\n- Earning: ${earnings} eth.\n- Referral Bonus: ${referralBonus} eth.\nNode provider Bonus : ${nodeBonus} eth.\n\n <b>Total:</b> <code>${sumTotal}</code> eth\n\n- wallet Address: <code>${state === 'NORMAL' ? wallet : walletMain}</code>\n(tap to copy)`,
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
