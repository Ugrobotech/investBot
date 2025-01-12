import * as dotenv from 'dotenv';
dotenv.config();

export const referralReportMarkup = async (data) => {
  const { referralBonus, referralCode } = data;
  const botLink = process.env.BOT_LINK;
  return {
    message: `Referral System Report 🔊\n\nYour referral link 🔗:\n<code>${botLink}${referralCode}</code>\n\n<b> Referral Bonus:</b>${referralBonus} eth\n\nShare and earn bonus with your friends!`,
    keyboard: [
      [
        {
          text: 'Visualize 👥',
          callback_data: JSON.stringify({
            command: '/visualize',
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
