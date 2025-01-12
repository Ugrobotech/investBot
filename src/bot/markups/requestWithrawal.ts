import * as dotenv from 'dotenv';
dotenv.config();
export const requestWithdrawal = async (data: any) => {
  const {
    wallet,
    walletMain,
    chatId,
    username,
    earnings,
    totalInvested,
    referralBonus,
  } = data;

  const sumTotal =
    Number(earnings) + Number(totalInvested) + Number(referralBonus);

  const state = process.env.ENVIRONMENT;

  return {
    message: `<b>Withdrawal Request 🔔</b>\n<b>Details: </b>\n\n<b>Details :</b>\n- User: ${username}\n- Amount Invested: ${totalInvested} eth\n- Earning: ${earnings} eth.\n- Referral Bonus: ${referralBonus} eth\n\n <b>Total:</b> <code>${sumTotal}</code> eth\n\n- wallet Address: <code>${state === 'NORMAL' ? wallet : walletMain}</code>\n(tap to copy)`,
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
