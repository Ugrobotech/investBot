export const showTransactionDetails = async (data: any) => {
  const { amount, hash, chatId, username } = data;

  return {
    message: `<b>Investment Alert 🚨</b>\n<b>transaction hash:</b> <a href="https://etherscan.io/tx/${hash}">${hash}</a>\n\n<b>Details :</b>\n<b>User: </b>${username}\n<b>Amount Invested: </b>${amount} eth`,
    keyboard: [
      [
        {
          text: '✅ Approve',
          callback_data: JSON.stringify({
            command: '/approve',
            userChatId: `${chatId}`,
          }),
        },
        // {
        //   text: '🚫 Reject',
        //   callback_data: JSON.stringify({
        //     command: '/reject',
        //     userChatId: `${chatId}`,
        //   }),
        // },
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
