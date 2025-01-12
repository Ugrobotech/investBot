export const welcomeMessageMarkup = async (userName: string) => {
  return {
    message: `Hi @${userName},\n\nIntroducing NodeAgentAI, your personal crypto investment companion! With NodeAgentAI, you can invest and watch your funds grow daily by a fixed percentage. Boost your earnings even further by inviting friends—more referrals mean more rewards!\n\nStart your journey toward financial growth and let your investments work for you. Ready to begin? 👇`,

    keyboard: [
      [
        {
          text: 'Lets get started 🚀',
          callback_data: JSON.stringify({
            command: '/menu',
            language: 'english',
          }),
        },
      ],
    ],
  };
};
