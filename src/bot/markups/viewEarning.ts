export const showEarningDetails = async (data: any) => {
  const { earnings, referralBonus, totalWithrawal } = data;
  const sumTotal = Number(earnings) + Number(referralBonus);
  const SumAvailable = sumTotal - Number(totalWithrawal);
  return {
    message: `<b>Earnings 💵💵</b>\n\nEarnings : ${earnings} $\nReferral Bonus : ${referralBonus} $\n\n<b>Total amount withrawn :</b> ${totalWithrawal} $\n\n<b>Available Total:</b>${SumAvailable} $`,
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
