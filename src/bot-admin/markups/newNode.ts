export const newNode = async (botURL: string) => {
  return {
    message: `<b>Your Node</b>\n\n<b>Node link:</b><code>${botURL}</code>\n\nyou can share the link to add friends to your node and earn with them`,
    keyboard: [
      [
        {
          text: 'Manage Node',
          callback_data: JSON.stringify({
            command: '/manageNode',
            language: 'english',
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
