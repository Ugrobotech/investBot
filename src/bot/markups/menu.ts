export const menuMarkup = async () => {
  return {
    message: `Please Select any action below 👇`,
    keyboard: [
      [
        {
          text: 'Stake 🏦',
          callback_data: JSON.stringify({
            command: '/invest',
            language: 'english',
          }),
        },
        // {
        //   text: 'wallet 💳',
        //   callback_data: JSON.stringify({
        //     command: '/wallets',
        //     language: 'english',
        //   }),
        // },
      ],
      [
        {
          text: 'view Earnings 📈',
          callback_data: JSON.stringify({
            command: '/viewEarnings',
            language: 'english',
          }),
        },
        {
          text: 'View stakes 🏦',
          callback_data: JSON.stringify({
            command: '/viewInvestments',
            language: 'english',
          }),
        },
      ],
      [
        {
          text: 'withdraw earnings ⏬',
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
        {
          text: 'Contact support 📞',
          url: 'https://t.me/AccessNode_Support',
        },
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
