import { Injectable, Logger } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { HttpService } from '@nestjs/axios';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import * as multichainWallet from 'multichain-crypto-wallet';
import {
  displayPrivateKeyMarkup,
  investDetailsMarkup,
  menuMarkup,
  referralReportMarkup,
  requestWithdrawal,
  showAdminTransactionDetails,
  showEarningDetails,
  showUserTransactionDetails,
  viewReferrals,
  walletDetailsMarkup,
  welcomeMessageMarkup,
} from './markups';
import { Cron } from '@nestjs/schedule';
import { User } from './schemas/user.schema';
import * as dotenv from 'dotenv';

dotenv.config();

// const token =
//   process.env.NODE_ENV === 'production'
//     ? process.env.TELEGRAM_TOKEN
//     : process.env.TEST_TOKEN;

const token = process.env.TELEGRAM_TOKEN;

const wallet = process.env.ADMIN_WALLET;

@Injectable()
export class BotService {
  private readonly bot: TelegramBot;
  private logger = new Logger(BotService.name);

  constructor(
    private readonly httpService: HttpService,
    @InjectModel(User.name) private readonly UserModel: Model<User>,
  ) {
    this.bot = new TelegramBot(token, { polling: true });
    this.bot.on('message', this.handleRecievedMessages);
    this.bot.on('callback_query', this.handleButtonCommands);
  }

  handleRecievedMessages = async (msg: any) => {
    this.logger.debug(msg);
    try {
      await this.bot.sendChatAction(msg.chat.id, 'typing');

      const command = msg.text.trim();

      // regex for transaction hash
      const pattern = /^0x[a-fA-F0-9]{64}$/;
      const urlRegex = /0x[a-fA-F0-9]{64}/;

      const match = command.match(urlRegex);

      if (command.startsWith('/start')) {
        const username = `${msg.from.username}`;
        const userExist = await this.UserModel.findOne({
          chatId: msg.chat.id,
        });
        if (userExist) {
          const welcome = await welcomeMessageMarkup(username);
          const replyMarkup = {
            inline_keyboard: welcome.keyboard,
          };
          return await this.bot.sendMessage(msg.chat.id, welcome.message, {
            reply_markup: replyMarkup,
          });
        }
        let refereeCode: string;
        // Extract referral code if present
        const match = msg.text?.match(/\/start (.+)/);
        const referralCode = match ? match[1] : null;
        if (referralCode) {
          console.log(`Referral code received: ${referralCode}`);
          refereeCode = referralCode;
        } else {
          console.log('No referral code provided.');
        }

        // save users to db
        const saved = await this.saveUserToDB(
          username,
          msg.chat.id,
          refereeCode,
        );

        const welcome = await welcomeMessageMarkup(username);

        if (welcome && saved) {
          const replyMarkup = {
            inline_keyboard: welcome.keyboard,
          };
          await this.bot.sendMessage(msg.chat.id, welcome.message, {
            reply_markup: replyMarkup,
          });
        } else {
          await this.bot.sendMessage(
            msg.chat.id,
            'There was an error saving your data, Please click the button below to try again.\n\nclick on /start or retry with the refferal link',
          );
        }
      } else if (pattern.test(command)) {
        await this.verifyPayment(msg.chat.id, command, msg.from.username);
        console.log('The text is in the correct format.');
      } else if (match) {
        await this.verifyPayment(msg.chat.id, match[0], msg.from.username);
        console.log('Url hash detected.');
      } else {
        switch (command) {
          case '/menu':
            await this.bot.sendChatAction(msg.chat.id, 'typing');
            await this.sendAllFeature(msg.chat.id);
            break;

          case '/invest':
            await this.bot.sendChatAction(msg.chat.id, 'typing');
            await this.showInvestMarkdown(msg.chat.id);
            break;

          default:
            await this.bot.sendMessage(
              msg.chat.id,
              'Invalid command. Please use one of the available commands.',
            );
            break;
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  handleButtonCommands = async (query: any) => {
    this.logger.debug(query);
    let command: string;
    let userChatId: string;

    function isJSON(str) {
      try {
        JSON.parse(str);
        return true;
      } catch (e) {
        console.log(e);
        return false;
      }
    }

    if (isJSON(query.data)) {
      command = JSON.parse(query.data).command;
      userChatId = JSON.parse(query.data).userChatId;
    } else {
      command = query.data;
    }

    const chatId = query.message.chat.id;
    // const userId = query.from.id;

    try {
      switch (command) {
        case '/menu':
          await this.bot.sendChatAction(chatId, 'typing');
          await this.sendAllFeature(chatId);
          return;

        case '/invest':
          await this.bot.sendChatAction(chatId, 'typing');
          await this.showInvestMarkdown(chatId);
          return;

        case '/veryPayment':
          await this.bot.sendChatAction(chatId, 'typing');
          await this.sendTransactionHashPrompt(chatId, 'verifyPayment');
          return;

        case '/close':
          await this.bot.sendChatAction(query.message.chat.id, 'typing');
          return await this.bot.deleteMessage(
            query.message.chat.id,
            query.message.message_id,
          );

        case '/approve':
          await this.bot.sendChatAction(query.message.chat.id, 'typing');

          await this.UserModel.updateOne(
            { chatId: userChatId },
            { approved: true, rejected: false },
          );
          return await this.bot.sendMessage(query.message.chat.id, `Approved`);

        case '/reject':
          await this.bot.sendChatAction(query.message.chat.id, 'typing');
          await this.UserModel.updateOne(
            { chatId: userChatId },
            { approved: false, rejected: true },
          );
          return await this.bot.sendMessage(query.message.chat.id, `Rejected`);

        case '/viewEarnings':
          await this.bot.sendChatAction(chatId, 'typing');
          return await this.viewEarnings(query.message.chat.id);

        case '/wallets':
          await this.bot.sendChatAction(chatId, 'typing');
          return await this.viewWallet(query.message.chat.id);

        case '/exportWallet':
          await this.bot.sendChatAction(chatId, 'typing');
          return await this.exportWallet(query.message.chat.id);

        case '/withdraw':
          await this.bot.sendChatAction(chatId, 'typing');
          return await this.withdrawalRequest(query.message.chat.id);

        case '/withrawalProccessed':
          await this.bot.sendChatAction(chatId, 'typing');
          await this.UserModel.updateOne(
            { chatId: userChatId },
            {
              $unset: { earnings: '', referralBonus: '' },
              $set: { amountsInvested: [] },
            },
          );
          await this.bot.sendMessage(
            userChatId,
            '✅ Your withdrawal request has been processed! You can check your balance now.',
          );
          return await this.bot.sendMessage(
            query.message.chat.id,
            '✅withdrawal request has been processed!',
          );

        case '/referrals':
          await this.bot.sendChatAction(query.message.chat.id, 'typing');
          return await this.showReferralDetails(query.message.chat.id);

        case '/visualize':
          await this.bot.sendChatAction(query.message.chat.id, 'typing');
          return await this.showUsersReferrals(query.message.chat.id);

        case '/default':
          await this.bot.sendChatAction(chatId, 'typing');
          return await this.bot.sendMessage(query.message.chat.id, ``);

        default:
          await this.bot.sendChatAction(query.message.chat.id, 'typing');
          return await this.bot.sendMessage(
            query.message.chat.id,
            `Error processing data`,
          );
      }
    } catch (error) {
      console.log(error);
    }
  };

  saveUserToDB = async (
    username: string,
    chat_id: number,
    referee?: string,
  ) => {
    function generateUniqueAlphanumeric(): string {
      const characters =
        'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      while (result.length < 8) {
        const randomChar = characters.charAt(
          Math.floor(Math.random() * characters.length),
        );
        if (!result.includes(randomChar)) {
          result += randomChar;
        }
      }
      return result;
    }

    try {
      let uniquecode: string;
      let codeExist: any;
      //loop through to make sure the code does not alread exist
      do {
        uniquecode = generateUniqueAlphanumeric();
        codeExist = await this.UserModel.findOne({
          referralCode: uniquecode,
        });
      } while (codeExist);

      const walletMain = await multichainWallet.createWallet({
        network: 'ethereum',
      });

      const wallet = await multichainWallet.createWallet({
        network: 'ethereum',
      });

      const saveUser = new this.UserModel({
        referralCode: uniquecode,
        userName: username,
        refereeCode: referee ? referee : '',
        chatId: chat_id,
        walletAddress: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic,
        walletAddressMain: walletMain.address,
        privateKeyMain: walletMain.privateKey,
        mnemonicMain: walletMain.mnemonic,
      });

      return await saveUser.save();
    } catch (error) {
      console.log(error);
    }
  };

  sendAllFeature = async (chatId: any) => {
    try {
      const allFeatures = await menuMarkup();
      if (allFeatures) {
        const replyMarkup = {
          inline_keyboard: allFeatures.keyboard,
        };
        await this.bot.sendMessage(chatId, allFeatures.message, {
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  showInvestMarkdown = async (chatId: any) => {
    try {
      const investMarkup = await investDetailsMarkup(wallet);
      if (investMarkup) {
        const replyMarkup = {
          inline_keyboard: investMarkup.keyboard,
        };
        await this.bot.sendMessage(chatId, investMarkup.message, {
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  sendTransactionHashPrompt = async (
    chatId: TelegramBot.ChatId,
    context?: string,
  ) => {
    try {
      await this.bot.sendChatAction(chatId, 'typing');
      if (context === 'verifyPayment') {
        const hashPromptId = await this.bot.sendMessage(
          chatId,
          'Please paste the transaction hash of your payment',
          {
            reply_markup: {
              force_reply: true,
            },
          },
        );

        await this.UserModel.updateOne(
          { chatId: chatId },
          {
            verifyPaymentSession: true,
            $push: { hashPromptId: hashPromptId.message_id },
          },
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  verifyPayment = async (chatId: any, hash: string, username: any) => {
    try {
      const receipt = await this.getTransactionReceipt(hash, chatId, username);

      if (receipt.status && receipt.status === 'confirmed') {
        await this.sendInvestmentDetails(receipt, chatId);
      }
    } catch (error) {
      console.log(error);
    }
  };

  getTransactionReceipt = async (hash: string, chatId: any, username: any) => {
    try {
      const hashExist = await this.UserModel.find({
        paymentHashes: { $in: [hash] },
      });

      if (hashExist.length > 0) {
        await this.bot.sendMessage(
          chatId,
          `‼️ This transaction already exist in the system‼️`,
        );
        return;
      }

      const body = JSON.stringify({
        method: 'eth_getTransactionReceipt',
        params: [`${hash}`],
        id: 1,
        jsonrpc: '2.0',
      });
      const receipt = await this.httpService.axiosRef.post(
        process.env.RPC_URL,
        body,
      );

      if (
        receipt.data.result.status === '0x1' &&
        receipt.data.result.to.toLowerCase() === wallet.toLowerCase()
      ) {
        const moralisURL = `https://deep-index.moralis.io/api/v2.2/transaction/${hash}/verbose?chain=eth`;

        const response = await this.httpService.axiosRef.get(moralisURL, {
          headers: { 'X-API-Key': process.env.MORALIS_API },
        });
        // Convert Wei to Ether manually
        const ethValue = parseFloat(response.data.value) / Math.pow(10, 18);

        await this.UserModel.updateOne(
          { chatId },
          { $push: { amountsInvested: ethValue, paymentHashes: hash } },
        );

        return {
          status: 'confirmed',
          amount: ethValue,
          sender: response.data.from_address,
          reciever: response.data.to_address,
          hash,
          chatId,
          username,
        };
      }
    } catch (error) {
      console.log(error);
    }
  };

  sendInvestmentDetails = async (data: any, chatId: any): Promise<unknown> => {
    try {
      const adminTransactionDetails = await showAdminTransactionDetails(data);
      const userTransactionDetails = await showUserTransactionDetails(data);

      const channelId = process.env.CHANNEL_ID;

      await this.bot.sendMessage(chatId, userTransactionDetails.message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: userTransactionDetails.keyboard },
      });

      return await this.bot.sendMessage(
        channelId,
        adminTransactionDetails.message,
        {
          parse_mode: 'HTML',
          reply_markup: { inline_keyboard: adminTransactionDetails.keyboard },
        },
      );
    } catch (error) {
      console.log(error);
    }
  };

  viewEarnings = async (chatId: any) => {
    function sumArray(arr) {
      return arr.map(Number).reduce((sum, current) => sum + current, 0);
    }
    try {
      const user = await this.UserModel.findOne({ chatId: chatId });

      if (!user) {
        return this.bot.sendMessage(chatId, 'User detail does not exist');
      }
      const data = {
        earnings: user.earnings || 0,
        totalInvested: sumArray(user.amountsInvested) || 0,
        referralBonus: user.referralBonus || 0,
      };
      const viewEarning = await showEarningDetails(data);
      if (viewEarning) {
        const replyMarkup = {
          inline_keyboard: viewEarning.keyboard,
        };
        await this.bot.sendMessage(chatId, viewEarning.message, {
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  viewWallet = async (chatId: any) => {
    try {
      const user = await this.UserModel.findOne({ chatId: chatId });

      if (!user) {
        return this.bot.sendMessage(chatId, 'User detail does not exist');
      }
      const data = {
        mainWallet: user.walletAddress || ' ',
        wallet: user.walletAddress || ' ',
      };
      const viewWalletDetails = await walletDetailsMarkup(data);
      if (viewWalletDetails) {
        const replyMarkup = {
          inline_keyboard: viewWalletDetails.keyboard,
        };
        await this.bot.sendMessage(chatId, viewWalletDetails.message, {
          parse_mode: 'HTML',
          reply_markup: replyMarkup,
        });
      }
    } catch (error) {
      console.log(error);
    }
  };

  exportWallet = async (chatId: any) => {
    try {
      const user = await this.UserModel.findOne({ chatId: chatId });

      if (!user) {
        return this.bot.sendMessage(chatId, 'User detail does not exist');
      }
      const data = {
        mainPK: user.privateKeyMain || ' ',
        PK: user.privateKey || ' ',
      };
      const viewPK = await displayPrivateKeyMarkup(data);
      if (viewPK) {
        const replyMarkup = {
          inline_keyboard: viewPK.keyboard,
        };
        const sendPrivateKey = await this.bot.sendMessage(
          chatId,
          viewPK.message,
          {
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
          },
        );

        if (sendPrivateKey) {
          // Delay the message deletion by 1 minute
          setTimeout(async () => {
            try {
              // Delete the message after 1 minute
              await this.bot.deleteMessage(chatId, sendPrivateKey.message_id);
            } catch (error) {
              console.error('Error deleting message:', error);
            }
          }, 60000);
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  withdrawalRequest = async (chatId: any): Promise<unknown> => {
    function sumArray(arr) {
      return arr.map(Number).reduce((sum, current) => sum + current, 0);
    }
    try {
      const user = await this.UserModel.findOne({ chatId: chatId });

      if (!user) {
        return this.bot.sendMessage(chatId, 'User detail does not exist');
      }
      const data = {
        wallet: user.walletAddress,
        walletMain: user.walletAddressMain,
        chatId,
        username: user.userName,
        earnings: user.earnings || 0,
        totalInvested: sumArray(user.amountsInvested) || 0,
        referralBonus: user.referralBonus || 0,
      };
      const withdraw = await requestWithdrawal(data);
      const channelId = process.env.CHANNEL_ID;
      if (data.totalInvested <= 0) {
        return await this.bot.sendMessage(
          chatId,
          '‼️You have to invest before you can withdraw',
        );
      }
      await this.bot.sendMessage(channelId, withdraw.message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: withdraw.keyboard },
      });

      const sumTotal =
        Number(data.earnings) +
        Number(data.totalInvested) +
        Number(data.referralBonus);
      await this.bot.sendMessage(
        chatId,
        `<b>Withdrawal Request 🔔</b>\n<b>Details: </b>\n\n<b>Details :</b>\n- User: ${data.username}\n- Amount Invested: ${data.totalInvested} eth\n- Earning: ${data.earnings} eth.\n- Referral Bonus: ${data.referralBonus} eth\n\n <b>Total:</b> <code>${sumTotal}</code> eth\n\nHang on 🔄 while your withdrawal is being processed.`,
        {
          parse_mode: 'HTML',
        },
      );
      return;
    } catch (error) {
      console.log(error);
    }
  };

  showReferralDetails = async (chatId: string) => {
    try {
      const user = await this.UserModel.findOne({ chatId: chatId });

      if (!user) {
        return this.bot.sendMessage(chatId, 'User detail does not exist');
      }
      const data = {
        referralCode: user.referralCode,
        referralBonus: user.referralBonus || 0,
      };

      const referralDetailsMarkup = await referralReportMarkup(data);
      const keyboardMarkup = {
        inline_keyboard: referralDetailsMarkup.keyboard,
      };

      const referralDetails = await this.bot.sendMessage(
        chatId,
        referralDetailsMarkup.message,
        {
          parse_mode: 'HTML',
          reply_markup: keyboardMarkup,
        },
      );
      return referralDetails;
    } catch (error) {
      console.log(error);
    }
  };

  showUsersReferrals = async (chatId: string) => {
    try {
      const user = await this.UserModel.findOne({ chatId: chatId });

      if (!user) {
        return this.bot.sendMessage(chatId, 'User detail does not exist');
      }
      const allReferrals = await this.UserModel.find({
        refereeCode: user.referralCode,
      });

      const data = { allReferrals: allReferrals, username: user.userName };

      const markup = await viewReferrals(data);
      const keyboardMarkup = { inline_keyboard: markup.keyboard };
      const referralsDetails = await this.bot.sendMessage(
        chatId,
        markup.message,
        {
          parse_mode: 'HTML',
          reply_markup: keyboardMarkup,
        },
      );
      return referralsDetails;
    } catch (error) {
      console.log(error);
    }
  };

  // calculate aerning
  calculateEarning = async () => {
    try {
      const referralBonusPercentage = 0.5; // 0.5% referral bonus
      const earningBonusPercentage = 0.5; // 10% earning bonus

      // Fetch all users from the database
      const allUsers = await this.UserModel.find();

      for (const user of allUsers) {
        // Calculate earnings based on amounts invested
        const totalInvested = user.amountsInvested.reduce(
          (sum, amount) => sum + parseFloat(amount),
          0,
        ); // sum of all investments

        // Calculate the earning bonus (earningBonus% of totalInvested)
        const earnings = (totalInvested * earningBonusPercentage) / 100;

        // Accumulate earnings: if the user already has earnings, add the new ones
        const currentEarnings = parseFloat(user.earnings || '0');
        const updatedEarnings = currentEarnings + earnings;

        // Update the user's earnings with the accumulated value
        await this.UserModel.updateOne(
          { chatId: user.chatId },
          { $set: { earnings: updatedEarnings.toString() } },
        );

        // Now, handle the referral bonus logic
        if (user.referralCode) {
          // Fetch all users with the current user's referral code (the referees)
          const referees = await this.UserModel.find({
            refereeCode: user.referralCode,
          });

          let totalReferralBonus = 0;

          // Loop through referees to calculate the total referral bonus
          for (const referee of referees) {
            const totalInvestedByReferee = referee.amountsInvested.reduce(
              (sum, amount) => sum + parseFloat(amount),
              0,
            ); // sum of all the referee's investments

            // Calculate the referral bonus (referralBonus% of the referee's earnings)
            const refereeEarnings =
              (totalInvestedByReferee * earningBonusPercentage) / 100;
            const referralBonus =
              (refereeEarnings * referralBonusPercentage) / 100;

            // Add this to the totalReferralBonus
            totalReferralBonus += referralBonus;
          }

          // Accumulate referral bonus: if the user already has referralBonus, add the new one
          const currentReferralBonus = parseFloat(user.referralBonus || '0');
          const updatedReferralBonus =
            currentReferralBonus + totalReferralBonus;

          // Update the user's referral bonus with the accumulated value
          await this.UserModel.updateOne(
            { chatId: user.chatId },
            { $set: { referralBonus: updatedReferralBonus.toString() } },
          );
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  @Cron('0 0 * * *', { timeZone: 'Africa/Lagos' }) // 12:00 AM Nigerian Time
  async handleCron(): Promise<void> {
    console.log('running cron');
    await this.calculateEarning();
  }
}
