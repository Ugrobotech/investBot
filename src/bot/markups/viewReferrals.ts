export const viewReferrals = async (data: any) => {
  const { allReferrals, username } = data;

  return {
    message:
      allReferrals.length === 0
        ? `@${username} you don't have any referrals.\nInvite your friends to earn!`
        : `@${username}, here are your referrals:\n${allReferrals.map((users) => `-@${users['userName']}`).join('\n')}`,

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
