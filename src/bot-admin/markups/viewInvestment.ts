export const viewInvestmentsDetails = async (data: any) => {
  const { investments, totalInvested } = data;

  return {
    message:
      investments.length === 0
        ? `You don't have any investment.\n Invest to start earning!`
        : `<b>INVESTMENTS :</b>\n\nTotal : ${totalInvested} eth.\n\n${investments.map((investment) => `➡️ ${investment['amount']} eth\n date: ${investment['timestamp']}`).join('\n\n')}\n\n ⚠️ Capital investment is available for withdrawal after 365 days of investment. `,
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
