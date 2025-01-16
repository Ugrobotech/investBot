export const menuMarkup = async (hasNode?: boolean) => {
  return {
    message: `Please Select any action below 👇`,
    keyboard: [
      [
        {
          text: `${hasNode ? `Node 🌳` : `Create Node 🌳`}`,
          callback_data: JSON.stringify({
            command: '/createNode',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'Invest',
          callback_data: JSON.stringify({
            command: '/invest',
            language: 'english',
          }),
        },
        {
          text: 'wallet 💳',
          callback_data: JSON.stringify({
            command: '/wallets',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'view Earnings',
          callback_data: JSON.stringify({
            command: '/viewEarnings',
            language: 'english',
          }),
        },
        {
          text: 'View Investments',
          callback_data: JSON.stringify({
            command: '/viewInvestments',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'withdraw earnings',
          callback_data: JSON.stringify({
            command: '/withdraw',
            language: 'english',
          }),
        },
        {
          text: 'Referrals 🗣',
          callback_data: JSON.stringify({
            command: '/referrals',
            language: 'english',
          }),
        },
      ],
      [
        // {
        //   text: 'Settings ⚙️',
        //   callback_data: JSON.stringify({
        //     command: '/Settings',
        //     language: 'english',
        //   }),
        // },
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
