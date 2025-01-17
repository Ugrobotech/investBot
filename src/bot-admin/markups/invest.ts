export const investDetailsMarkup = async (wallet: string) => {
  return {
    message: `Stake with a minimum of 200$ worth of eth ETH and watch your funds grow daily.\n\n<b>Steps to invest</b> :\n1. send token to this address:\n<code>${wallet}</code>(tap to copy)\n\n2. click on the verify payment and input payment transaction hash`,
    keyboard: [
      [
        {
          text: '✅ verify payment',
          callback_data: JSON.stringify({
            command: '/veryPayment',
            language: 'english',
          }),
        },
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
