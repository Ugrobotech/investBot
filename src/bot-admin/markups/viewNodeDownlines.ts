export const viewNodeDownlines = async (data: any) => {
  const { allDownlines, username, nodeROIpercent, nodeDownLineROIpercent } =
    data;

  function sumArray(arr) {
    return arr.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }

  return {
    message:
      allDownlines.length === 0
        ? `@${username} you don't have any Node downlines.\nInvite your friends to earn!`
        : `@${username}, here are your referrals:\n${allDownlines.map((users) => `➡️@${users['userName']} Amount invested: ${sumArray(users['amountsInvested'])} eth`).join('\n')}\n\n<b>Node Provider %:</b>${nodeROIpercent}\n<b>Downline earn %:</b>${nodeDownLineROIpercent} `,

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
