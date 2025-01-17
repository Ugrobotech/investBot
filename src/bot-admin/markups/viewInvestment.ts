export const viewInvestmentsDetails = async (data: any) => {
  const { investments, totalInvestedUSD } = data;

  return {
    message:
      investments.length === 0
        ? `You don't have any Stakes.\n Stake to start earning!`
        : `<b>STAKES :</b>\n\nTotal :${totalInvestedUSD} $\n\n${investments.map((investment) => `➡️ ${investment['usdAmount']} $\n date: ${investment['timestamp']}`).join('\n\n')}\n\n ⚠️ Capital staked is available for withdrawal after 365 days of staking. `,
    keyboard: [
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
