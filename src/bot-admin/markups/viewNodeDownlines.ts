export const viewNodeDownlines = async (data: any) => {
  const { allDownlines, username, nodeROIpercent, nodeDownLineROIpercent } =
    data;

  function sumArray(arr) {
    return arr.reduce((sum, item) => sum + Number(item.usdAmount || 0), 0);
  }

  const totalDownlineInvestment = allDownlines.map((users) =>
    sumArray(users['amountsInvested']),
  );

  const totalSum = totalDownlineInvestment.reduce(
    (sum, current) => sum + current,
    0,
  );

  return {
    message:
      allDownlines.length === 0
        ? `@${username} you don't have any Node downlines.\nInvite your friends to earn!`
        : `@${username}, here are your downlines: 👇\n\n${allDownlines.map((users) => `➡️@${users['userName']} Amount staked: ${sumArray(users['amountsInvested'])} $`).join('\n')}\n\n<b>Node Operator %:</b>${nodeROIpercent}\n<b>Downline earn %:</b>${nodeDownLineROIpercent}\n\n <b>Total Stakes:</b> ${totalSum} $`,

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
