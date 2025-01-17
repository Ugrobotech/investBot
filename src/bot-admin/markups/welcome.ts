export const welcomeMessageMarkup = async (userName: string) => {
  console.log(userName);
  return {
    message: `<b>Welcome to Access_Node Operator bot</b>\n\nwhere you can Set up ROIs and Manage your downlines`,

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
