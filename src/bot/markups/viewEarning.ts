export const showEarningDetails = async (data: any) => {
  const { earnings, totalInvested, referralBonus } = data;
  const sumTotal =
    Number(earnings) + Number(totalInvested) + Number(referralBonus);
  return {
    message: `<b>Earnings</b>\n\nTotal Investment: ${totalInvested} eth\nEarnings : ${earnings} eth\nRefferal Bonus : ${referralBonus} eth\n\n<b>Total :</b>${sumTotal} eth`,
    keyboard: [
      [
        {
          text: 'Withdraw',
          callback_data: JSON.stringify({
            command: '/withdraw',
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
