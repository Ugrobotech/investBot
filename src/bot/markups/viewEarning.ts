export const showEarningDetails = async (data: any) => {
  const { earnings, referralBonus } = data;
  const sumTotal = Number(earnings) + Number(referralBonus);
  return {
    message: `<b>Earnings 💵💵</b>\n\nEarnings : ${earnings} eth\nReferral Bonus : ${referralBonus} eth\n\n<b>Total :</b>${sumTotal} eth`,
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
