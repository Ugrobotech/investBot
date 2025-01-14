export const welcomeMessageMarkup = async (userName: string) => {
  return {
    message: `Hi @${userName},\n\nWelcome to NodeAgentAI node providers bot, where you can Set up ROIs and Manage your downlines`,

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
