export const menuMarkup = async () => {
  return {
    message: `Please Select any action below 👇`,
    keyboard: [
      [
        {
          text: 'Invest',
          callback_data: JSON.stringify({
            command: '/invest',
            language: 'english',
          }),
        },
        {
          text: 'view Earnings',
          callback_data: JSON.stringify({
            command: '/viewEarnings',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'wallet 💳',
          callback_data: JSON.stringify({
            command: '/wallets',
            language: 'english',
          }),
        },
        {
          text: 'withdraw earnings',
          callback_data: JSON.stringify({
            command: '/withdraw',
            language: 'english',
          }),
        },
      ],
      [
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
