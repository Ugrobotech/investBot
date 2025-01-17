export const welcomeMessageMarkup = async (userName: string) => {
  console.log(userName);
  return {
    message: `<b>Welcome to Access Node Staking AI BOT</b>\n\nOur Access node service makes it simple for you to stake your crypto and start earning rewards—all through our easy-to-use Telegram bot.\n\nHere’s how it works:\n  1.	Connect: Generate your wallet via the bot in a secure and seamless process.\n  2.	Stake: Choose the amount of crypto you want to stake.\n  3.	Earn Rewards: Sit back and watch as your staking generates passive income.\n\nWhy stake with us?\n  •	User-Friendly: Everything is managed directly in Telegram.\n  •	Secure & Reliable: Your assets remain protected throughout the staking process.\n  •	Earn Effortlessly: Maximize your rewards with minimal effort.\n\nReady to grow your crypto? Get started now! 💰

`,
    // message: `Hi @${userName},\n\nIntroducing NodeAgentAI, your personal crypto investment companion! With NodeAgentAI, you can invest and watch your funds grow daily by a fixed percentage. Boost your earnings even further by inviting friends—more referrals mean more rewards!\n\nStart your journey toward financial growth and let your investments work for you. Ready to begin? 👇`,

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
