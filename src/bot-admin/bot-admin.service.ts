import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import * as TelegramBot from 'node-telegram-bot-api';
import { HttpService } from '@nestjs/axios';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import * as multichainWallet from 'multichain-crypto-wallet';
import {
  displayPrivateKeyMarkup,
  investDetailsMarkup,
  manageNodeMarkup,
  menuMarkup,
  newNode,
  referralReportMarkup,
  requestWithdrawal,
  showAdminTransactionDetails,
  showEarningDetails,
  showUserTransactionDetails,
  viewInvestmentsDetails,
  viewNodeDownlines,
  viewReferrals,
  walletDetailsMarkup,
  welcomeMessageMarkup,
} from './markups';
// import { Cron } from '@nestjs/schedule';
import { User } from './schemas/user.schema';
import * as dotenv from 'dotenv';
import { BotService } from 'src/bot/bot.service';

dotenv.config();

const token = process.env.TELEGRAM_TOKEN_NODE;

@Injectable()
export class BotAdminService {
  private readonly bot: TelegramBot;
  private logger = new Logger(BotAdminService.name);

  constructor(
    @Inject(forwardRef(() => BotService))
    private botService: BotService,
    private readonly httpService: HttpService,
    @InjectModel(User.name) private readonly UserModel: Model<User>,
  ) {
    this.bot = new TelegramBot(token, { polling: true });
    this.bot.on('message', this.handleRecievedMessages);
    this.bot.on('callback_query', this.handleButtonCommands);
    // this.bot.on('channel_post', this.handleChannelPost);
  }

  handleRecievedMessages = async (msg: any) => {
    this.logger.debug(msg);
    try {
      await this.bot.sendChatAction(msg.chat.id, 'typing');

      const command = msg.text.trim();

      // regex for transaction hash
      const pattern = /^0x[a-fA-F0-9]{64}$/;
      const urlRegex = /0x[a-fA-F0-9]{64}/;
      // const amountRegex = /^\d+(\.\d+)?$/;

      const match = command.match(urlRegex);
      const ROIs = this.extractAndSumNodePercentages(command);
      const withdrawalDetails = this.detectAndValidateInput(command);

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
            parse_mode: 'HTML',
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
            parse_mode: 'HTML',
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
        const user = await this.UserModel.findOne({
          chatId: msg.chat.id,
        });

        if (
          user.withdrawalSession &&
          withdrawalDetails.amount &&
          withdrawalDetails.wallet
        ) {
          await this.withdrawalRequest(
            msg.chat.id,
            withdrawalDetails.amount,
            withdrawalDetails.wallet,
          );
        } else if (user.withdrawalSession && command === '/cancel') {
          await this.UserModel.updateOne(
            { chatId: msg.chat.id },
            { withdrawalSession: false },
          );
          return await this.bot.sendMessage(
            msg.chat.id,
            `✅Withdraw session cancelled`,
          );
        } else if (user.withdrawalSession) {
          return await this.bot.sendMessage(
            msg.chat.id,
            `‼️You have an ongoing withdrawal session, type /cancel, to end session or enter the amount you want to withdraw to continue`,
          );
        } else if (ROIs && !user.withdrawalSession) {
          if (ROIs.sum >= 0.8) {
            return await this.bot.sendMessage(
              msg.chat.id,
              `⚠️Maximum sum of both operator  percentage  and downline ROI percentage is <b>0.7</b>, so when setting your operator and downline ROI percentage let it not exceed 0.7`,
              { parse_mode: 'HTML' },
            );
          }
          const setROIs = await this.UserModel.findOneAndUpdate(
            { chatId: msg.chat.id },
            {
              nodeROIpercent: +ROIs.provider,
              nodeDownLineROIpercent: +ROIs.downline,
            },
            { new: true }, // This ensures the updated document is returned
          );

          if (setROIs) {
            return await this.bot.sendMessage(
              msg.chat.id,
              `✅ Operator: ${setROIs.nodeROIpercent}%\n✅ Downline ROI: ${setROIs.nodeDownLineROIpercent}%`,
              { parse_mode: 'HTML' },
            );
          }
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

            case '/cancel':
              await this.bot.sendChatAction(msg.chat.id, 'typing');
              await this.UserModel.updateOne(
                { chatId: msg.chat.id },
                { withdrawalSession: false },
              );
              await this.bot.sendMessage(
                msg.chat.id,
                `✅Withdraw session cancelled`,
              );
              break;

            default:
              await this.bot.sendMessage(
                msg.chat.id,
                'Invalid command. Please use one of the available commands.',
              );
              break;
          }
        }
      }
    } catch (error) {
      console.error(error);
    }
  };

  handleChannelPost = async (msg: any) => {
    this.logger.debug(msg);
    try {
      const chatId = JSON.parse(
        msg.reply_markup['inline_keyboard'][0][0].callback_data,
      ).userChatId;

      const withdrawalRequest = JSON.parse(
        msg.reply_markup['inline_keyboard'][0][0].callback_data,
      ).command;

      if (chatId) {
        const user = await this.UserModel.findOne({ chatId: chatId });
        if (user && user.refereeCode) {
          const nodeOwner = await this.UserModel.findOne({
            nodeCode: user.refereeCode,
          });

          // only send withdrawal notification
          if (nodeOwner && withdrawalRequest === '/withrawalProccessed') {
            const earnings = user.earnings || 0;
            const referralBonus = user.referralBonus || 0;

            const sum = Number(earnings) + Number(referralBonus);

            await this.bot.sendMessage(
              nodeOwner.chatId,
              `<b>Downline Withdrawal Request 🔔</b>\n\n<b>Details :</b>\n- User: ${user.userName}\n- Earning: ${earnings} $.\n- Referral Bonus: ${referralBonus} $\n\n <b>Total:</b> <code>${sum}</code> $.`,
              {
                parse_mode: 'HTML',
              },
            );
          }
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

        case '/viewInvestments':
          await this.bot.sendChatAction(chatId, 'typing');
          return await this.viewInvestments(query.message.chat.id);

        case '/wallets':
          await this.bot.sendChatAction(chatId, 'typing');
          return await this.viewWallet(query.message.chat.id);

        case '/exportWallet':
          await this.bot.sendChatAction(chatId, 'typing');
          return await this.exportWallet(query.message.chat.id);
        case '/withdraw':
          await this.bot.sendChatAction(chatId, 'typing');
          await this.UserModel.updateOne(
            { chatId: query.message.chat.id },
            { withdrawalSession: true },
          );
          return await this.withdrawalRequest(query.message.chat.id);

        case '/withrawalProccessed':
          await this.bot.sendChatAction(chatId, 'typing');

          const user = await this.UserModel.findOne({
            chatId: userChatId,
          });

          if (!user) {
            throw new Error('User not found');
          }

          // Parse the string field to a number
          const currentValue = parseFloat(user.totalWithrawal || '0');

          // Increment the value
          const updatedValue =
            currentValue + parseFloat(user.withdrawalSessionAmount || '0');

          // Update the field in the database
          await this.UserModel.findOneAndUpdate(
            { chatId: user.chatId },
            { totalWithrawal: updatedValue.toString() }, // Save it back as a string
            { new: true }, // Return the updated document
          );
          const pnlImage: any = await this.httpService.axiosRef.post(
            'https://pnl-image-generator.onrender.com/pnl',
            { amount: `${user.withdrawalSessionAmount}` },
          );
          if (pnlImage.data.image) {
            await this.bot.sendMessage(
              user.chatId,
              '✅ Your withdrawal request has been processed!.',
            );
            await this.bot.sendPhoto(
              user.chatId,
              Buffer.from(pnlImage.data.image),
            );
            return await this.bot.sendMessage(
              query.message.chat.id,
              '✅withdrawal request has been processed!',
            );
          } else {
            await this.bot.sendMessage(
              user.chatId,
              '✅ Your withdrawal request has been processed!.',
            );
            return await this.bot.sendMessage(
              query.message.chat.id,
              '✅withdrawal request has been processed!',
            );
          }

        case '/referrals':
          await this.bot.sendChatAction(query.message.chat.id, 'typing');
          return await this.showReferralDetails(query.message.chat.id);

        case '/visualize':
          await this.bot.sendChatAction(query.message.chat.id, 'typing');
          return await this.showUsersReferrals(query.message.chat.id);

        case '/createNode':
          await this.bot.sendChatAction(query.message.chat.id, 'typing');
          return await this.createNode(query.message.chat.id);

        case '/manageNode':
          await this.bot.sendChatAction(query.message.chat.id, 'typing');
          return await this.manageNode(query.message.chat.id);

        case '/set%':
          await this.bot.sendChatAction(query.message.chat.id, 'typing');
          return await this.setROIPercentage(query.message.chat.id);

        case '/resetROI%':
          await this.bot.sendChatAction(query.message.chat.id, 'typing');
          return await this.resetROIPercentage(query.message.chat.id);

        case '/viewDownlines':
          await this.bot.sendChatAction(query.message.chat.id, 'typing');
          return await this.showNodeDownlines(query.message.chat.id);

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
        allWallets: [
          {
            walletAddress: wallet.address,
            privateKey: wallet.privateKey,
          },
        ],
      });

      return await saveUser.save();
    } catch (error) {
      console.log(error);
    }
  };

  sendAllFeature = async (chatId: any) => {
    try {
      const user = await this.UserModel.findOne({ chatId: chatId });
      const allFeatures = await menuMarkup(user.hasNode);
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
      const wallet = await multichainWallet.createWallet({
        network: 'ethereum',
      });
      const user = await this.UserModel.findOne({ chatId: chatId });
      if (!user) {
        return this.bot.sendMessage(chatId, 'User detail does not exist');
      }
      const updateUserWallet = await this.UserModel.findOneAndUpdate(
        {
          chatId: user.chatId,
        },
        {
          walletAddress: wallet.address,
          privateKey: wallet.privateKey,
          $push: {
            allWallets: {
              walletAddress: wallet.address,
              privateKey: wallet.privateKey,
            },
          },
        },
        { new: true },
      );
      if (updateUserWallet) {
        const investMarkup = await investDetailsMarkup(
          updateUserWallet.walletAddress,
        );
        if (investMarkup) {
          const replyMarkup = {
            inline_keyboard: investMarkup.keyboard,
          };
          await this.bot.sendMessage(chatId, investMarkup.message, {
            parse_mode: 'HTML',
            reply_markup: replyMarkup,
          });
        }
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
        return hashPromptId;
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
      } else {
        return;
      }
    } catch (error) {
      console.log(error);
    }
  };

  getTransactionReceipt = async (hash: string, chatId: any, username: any) => {
    const referralBonusPercentage = process.env.REFERRAL_PERCENT;
    const defaultRate = process.env.ETH_RATE;
    let ethUSDprice;
    try {
      try {
        const rates = await this.httpService.axiosRef.get(
          `https://api.coinbase.com/v2/exchange-rates?currency=ETH`,
        );
        ethUSDprice = parseFloat(rates.data.data.rates['USDT']);
      } catch (error) {
        ethUSDprice = parseFloat(defaultRate);
        console.log(error);
      }

      const user = await this.UserModel.findOne({ chatId: chatId });

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

      //  receipt.data.result.status === '0x1' &&
      //    receipt.data.result.to.toLowerCase() ===
      //      user.walletAddress.toLowerCase();

      if (
        receipt.data.result.status === '0x1' &&
        receipt.data.result.to.toLowerCase() ===
          user.walletAddress.toLowerCase()
      ) {
        const moralisURL = `https://deep-index.moralis.io/api/v2.2/transaction/${hash}/verbose?chain=eth`;

        const response = await this.httpService.axiosRef.get(moralisURL, {
          headers: { 'X-API-Key': process.env.MORALIS_API },
        });
        // Convert Wei to Ether manually
        const ethValue = parseFloat(response.data.value) / Math.pow(10, 18);
        const time = this.formatDateTime(response.data.block_timestamp);
        const usdValue = ethValue * ethUSDprice;

        const updatedUser = await this.UserModel.findOneAndUpdate(
          { chatId },
          {
            $push: {
              amountsInvested: {
                amount: ethValue,
                usdAmount: usdValue,
                timestamp: time,
              },
              paymentHashes: hash,
            },
          },
          { new: true },
        );

        const referee = await this.UserModel.findOne({
          referralCode: updatedUser.refereeCode,
        });

        if (referee) {
          const currentBonus = parseFloat(referee.referralBonus || '0');
          const newBonus =
            ((usdValue || ethValue) * parseFloat(referralBonusPercentage)) /
            100;

          const updatedBonus = currentBonus + newBonus;

          const updatedReferee = await this.UserModel.findOneAndUpdate(
            {
              referralCode: referee.referralCode,
            },
            {
              $set: {
                referralBonus: updatedBonus.toString(), // Store updated bonus as a string
              },
            },
            { new: true }, // Ensures the updated document is returned
          );

          if (updatedReferee && !updatedReferee.hasNode) {
            const message = `<b>🔔 Referral Bonus Alert</b>\n\nYou have been rewarded ${newBonus} $ referral bonus from @${user.userName} stake.\n<b>Total referral bonus:</b> ${updatedReferee.referralBonus} $`;

            await this.botService.sendMessageToOtherBots(
              updatedReferee.chatId,
              message,
            );
          } else if (updatedReferee) {
            await this.bot.sendMessage(
              updatedReferee.chatId,
              `<b>🔔 Referral Bonus Alert</b>\n\nYou have been rewarded ${newBonus} $ referral bonus from @${user.userName} stake.\n<b>Total referral bonus:</b> ${updatedReferee.referralBonus} $`,
              { parse_mode: 'HTML' },
            );
          }
        }

        return {
          status: 'confirmed',
          amount: ethValue,
          usdAmount: usdValue,
          sender: response.data.from_address,
          reciever: response.data.to_address,
          timestamp: time,
          hash,
          chatId,
          username,
          userWallet: user.walletAddress,
          userPK: user.privateKey,
        };
      } else {
        this.bot.sendMessage(chatId, '‼️Invalid Payment‼️');
        return;
      }
    } catch (error) {
      console.log(error);
    }
  };

  //   sendInvestmentDetails = async (data: any, chatId: any): Promise<unknown> => {
  //     try {
  //       const adminTransactionDetails = await showAdminTransactionDetails(data);
  //       const userTransactionDetails = await showUserTransactionDetails(data);

  //       const channelId = process.env.CHANNEL_ID;

  //       await this.bot.sendMessage(chatId, userTransactionDetails.message, {
  //         parse_mode: 'HTML',
  //         reply_markup: { inline_keyboard: userTransactionDetails.keyboard },
  //       });

  //       return await this.bot.sendMessage(
  //         channelId,
  //         adminTransactionDetails.message,
  //         {
  //           parse_mode: 'HTML',
  //           reply_markup: { inline_keyboard: adminTransactionDetails.keyboard },
  //         },
  //       );
  //     } catch (error) {
  //       console.log(error);
  //     }
  //   };

  sendInvestmentDetails = async (data: any, chatId: any): Promise<void> => {
    try {
      // Fetch transaction details for admin and user
      const [adminTransactionDetails, userTransactionDetails] =
        await Promise.all([
          showAdminTransactionDetails(data),
          showUserTransactionDetails(data),
        ]);

      // Extract channel ID from environment variables
      const channelId = process.env.CHANNEL_ID;

      // Send message to the user
      await this.bot.sendMessage(chatId, userTransactionDetails.message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: userTransactionDetails.keyboard },
      });

      // Send message to the admin channel
      await this.bot.sendMessage(channelId, adminTransactionDetails.message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: adminTransactionDetails.keyboard },
      });

      return;
    } catch (error) {
      console.error('Error sending investment details:', error);
    }
  };

  viewEarnings = async (chatId: any) => {
    function sumArray(arr) {
      return arr.reduce((sum, item) => sum + Number(item.usdAmount || 0), 0);
    }
    try {
      const user = await this.UserModel.findOne({ chatId: chatId });

      if (!user) {
        return this.bot.sendMessage(chatId, 'User detail does not exist');
      }
      const data = {
        earnings: user.earnings || 0,
        nodeBonus: user.nodeProviderBonus || 0,
        totalInvested: sumArray(user.amountsInvested) || 0,
        referralBonus: user.referralBonus || 0,
        totalWithrawal: user.totalWithrawal || 0,
      };

      console.log('data :', data);
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

  viewInvestments = async (chatId: any) => {
    function sumEthArray(arr) {
      return arr.reduce((sum, item) => sum + Number(item.amount || 0), 0);
    }
    function sumUsdArray(arr) {
      return arr.reduce((sum, item) => sum + Number(item.usdAmount || 0), 0);
    }
    try {
      const user = await this.UserModel.findOne({ chatId: chatId });

      if (!user) {
        return this.bot.sendMessage(chatId, 'User detail does not exist');
      }
      const data = {
        totalInvested: sumEthArray(user.amountsInvested) || 0,
        totalInvestedUSD: sumUsdArray(user.amountsInvested) || 0,
        investments: user.amountsInvested,
      };
      const viewInvestment = await viewInvestmentsDetails(data);
      if (viewInvestment) {
        const replyMarkup = {
          inline_keyboard: viewInvestment.keyboard,
        };
        await this.bot.sendMessage(chatId, viewInvestment.message, {
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

  withdrawalRequest = async (
    chatId: any,
    amount?: string,
    userWallet?: string,
  ): Promise<unknown> => {
    function sumArray(arr) {
      return arr.reduce((sum, item) => sum + Number(item.usdAmount || 0), 0);
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
        nodeProviderBonus: user.nodeProviderBonus || 0,
        totalWithrawn: user.totalWithrawal || 0,
      };
      const sumTotal =
        Number(data.earnings) +
        Number(data.referralBonus) +
        Number(data.nodeProviderBonus) -
        Number(data.totalWithrawn);

      if (!amount) {
        console.log(Number(data.totalWithrawn));
        await this.bot.sendMessage(
          chatId,
          `input amount to withdraw and wallet address, expected format => amount address (e.g 50 0xB506a70CE81A4037D7D030f3ACC1ba60b52e7b72).\n<b>available balance:</b> ${sumTotal} $`,
          {
            reply_markup: {
              force_reply: true,
            },
            parse_mode: 'HTML',
          },
        );
        return;
      }

      const withdraw = await requestWithdrawal(data, amount, userWallet);
      const channelId = process.env.CHANNEL_ID;
      if (sumTotal <= 0) {
        return await this.bot.sendMessage(
          chatId,
          `‼️You don't have any earnings or Referral bonus to withdraw`,
        );
      } else if (parseFloat(amount) > sumTotal) {
        return await this.bot.sendMessage(
          chatId,
          `‼️Insufficient amount to withdraw`,
        );
      }

      await this.bot.sendMessage(channelId, withdraw.message, {
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: withdraw.keyboard },
      });

      await this.bot.sendMessage(
        chatId,
        `<b>Withdrawal Request 🔔</b>\n\n<b>Details :</b>\n- User: ${data.username}\n\n\n<b>Amount requested:</b> <code>${amount}</code> $.\n\nHang on 🔄 while your withdrawal is being processed.`,
        {
          parse_mode: 'HTML',
        },
      );

      await this.UserModel.updateOne(
        { chatId: chatId },
        {
          withdrawalSession: false,
          withdrawalSessionAmount: amount,
        },
      );

      if (user && user.refereeCode) {
        const nodeOwner = await this.UserModel.findOne({
          nodeCode: user.refereeCode,
        });

        // only send withdrawal notification
        if (nodeOwner) {
          // const earnings = user.earnings || 0;
          // const referralBonus = user.referralBonus || 0;
          // const nodeBonus = user.nodeProviderBonus || 0;

          // const sum =
          //   Number(earnings) + Number(referralBonus) + Number(nodeBonus);

          await this.botService.sendMessageToOtherBots(
            nodeOwner.chatId,
            `<b>Downline Withdrawal Request 🔔</b>\n\n<b>Details :</b>\n- User: ${user.userName}\n<b>Amount requested:</b> <code>${amount}</code> $.`,
          );
        }
      }
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

  sendMessageToOtherBots = async (chatId: any, message: string) => {
    try {
      return await this.bot.sendMessage(chatId, message, {
        parse_mode: 'HTML',
      });
    } catch (error) {
      console.log(error);
    }
  };

  sendPhotoMessageToOtherBots = async (chatId: any, image: any) => {
    try {
      return await this.bot.sendPhoto(chatId, image);
    } catch (error) {
      console.trace();
      console.log(error);
    }
  };

  createNode = async (chatId: string) => {
    const nodeBotLink = process.env.NODE_BOT_LINK;
    try {
      const user = await this.UserModel.findOne({ chatId: chatId });

      if (!user) {
        return this.bot.sendMessage(chatId, 'User detail does not exist');
      } else if (user.nodeCode && user.hasNode) {
        const markup = await newNode(`${nodeBotLink}${user.nodeCode}`);
        const keyboardMarkup = { inline_keyboard: markup.keyboard };
        const newNodeDetails = await this.bot.sendMessage(
          chatId,
          markup.message,
          {
            parse_mode: 'HTML',
            reply_markup: keyboardMarkup,
          },
        );
        return newNodeDetails;
      }
      const createNodeForUser = await this.UserModel.findOneAndUpdate(
        { _id: user._id },
        { hasNode: true, nodeCode: user.referralCode, refereeCode: '' },
        { new: true }, // Ensures the updated document is returned
      );

      if (createNodeForUser) {
        const markup = await newNode(
          `${nodeBotLink}${createNodeForUser.nodeCode}`,
        );
        const keyboardMarkup = { inline_keyboard: markup.keyboard };
        const newNodeDetails = await this.bot.sendMessage(
          chatId,
          markup.message,
          {
            parse_mode: 'HTML',
            reply_markup: keyboardMarkup,
          },
        );
        return newNodeDetails;
      }
      return;
    } catch (error) {
      console.log(error);
    }
  };

  manageNode = async (chatId: string) => {
    try {
      const user = await this.UserModel.findOne({ chatId: chatId });

      if (!user) {
        return this.bot.sendMessage(chatId, 'User detail does not exist');
      }

      const markup = await manageNodeMarkup();
      const keyboardMarkup = { inline_keyboard: markup.keyboard };
      const manageNodeDetails = await this.bot.sendMessage(
        chatId,
        markup.message,
        {
          parse_mode: 'HTML',
          reply_markup: keyboardMarkup,
        },
      );
      return manageNodeDetails;
    } catch (error) {
      console.log(error);
    }
  };

  setROIPercentage = async (chatId: TelegramBot.ChatId) => {
    try {
      const promptId = await this.bot.sendMessage(
        chatId,
        'Input the node operator % and downline ROI % eg: 0.2 0.5',
        {
          reply_markup: {
            force_reply: true,
          },
        },
      );

      return promptId;
    } catch (error) {
      console.log(error);
    }
  };

  resetROIPercentage = async (chatId: TelegramBot.ChatId) => {
    try {
      const resetROIs = await this.UserModel.findOneAndUpdate(
        { chatId: chatId },
        {
          nodeROIpercent: 0.2,
          nodeDownLineROIpercent: 0.5,
        },
        { new: true },
      );
      if (resetROIs) {
        return await this.bot.sendMessage(
          chatId,
          `✅ Default Operator: ${resetROIs.nodeROIpercent}%\n✅ Default downline ROI: ${resetROIs.nodeDownLineROIpercent}%`,
          { parse_mode: 'HTML' },
        );
      }
    } catch (error) {
      console.log(error);
    }
  };

  showNodeDownlines = async (chatId: string) => {
    try {
      const user = await this.UserModel.findOne({ chatId: chatId });

      if (!user) {
        return this.bot.sendMessage(chatId, 'User detail does not exist');
      }
      const allNodeDownlines = await this.UserModel.find({
        refereeCode: user.nodeCode,
      });

      const data = {
        allDownlines: allNodeDownlines,
        username: user.userName,
        nodeROIpercent: user.nodeROIpercent,
        nodeDownLineROIpercent: user.nodeDownLineROIpercent,
      };

      const markup = await viewNodeDownlines(data);
      const keyboardMarkup = { inline_keyboard: markup.keyboard };
      const downlineDetails = await this.bot.sendMessage(
        chatId,
        markup.message,
        {
          parse_mode: 'HTML',
          reply_markup: keyboardMarkup,
        },
      );
      return downlineDetails;
    } catch (error) {
      console.log(error);
    }
  };

  // calculate aerning
  calculateEarning = async () => {
    try {
      const referralBonusPercentage = 5; // 5% referral bonus
      const earningBonusPercentage = 0.5; // 0.5% earning bonus

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

  // @Cron('0 0 * * *', { timeZone: 'Africa/Lagos' }) // 12:00 AM Nigerian Time
  // async handleCron(): Promise<void> {
  //   console.log('running cron');
  //   await this.calculateEarning();
  // }

  /// utilsss
  formatDateTime = (isoDateString: string): string => {
    const date = new Date(isoDateString);

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();

    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return `${day}/${month}/${year} ${hours}:${minutes}`;
  };

  // extractAndSumNodePercentages = (input) => {
  //   // Use regex to find numbers like 0.2, 0.7, 3, or 6
  //   const matches = input.match(/\d+(\.\d+)?/g);

  //   if (matches && matches.length >= 2) {
  //     // Convert matches to numbers
  //     const provider = parseFloat(matches[0]);
  //     const downline = parseFloat(matches[1]);

  //     // Calculate the sum
  //     const sum = provider + downline;

  //     return {
  //       provider,
  //       downline,
  //       sum,
  //     };
  //   }

  //   // Return null if there aren't enough matches
  //   return null;
  // };

  extractAndSumNodePercentages = (input) => {
    // Regex to match numbers separated by "and" or spaces
    const matches = input.match(/\d+(\.\d+)?(?:\s+and\s+|\s+)\d+(\.\d+)?/);

    if (matches) {
      // Extract provider and downline using capturing groups
      const [provider, downline] = matches[0]
        .split(/and|\s+/)
        .map((num) => parseFloat(num));

      // Calculate the sum
      const sum = provider + downline;

      return {
        provider,
        downline,
        sum,
      };
    }

    // Return null if no valid input is found
    return null;
  };

  parseIdAndAmount(input: string): { chatId: string; amount: string } | null {
    const [chatId, amount] = input.split('|');

    if (chatId && amount) {
      return {
        chatId: chatId.trim(),
        amount: amount.trim(),
      };
    }

    return null; // Return null if the input format is incorrect
  }

  detectAndValidateInput = (input: string) => {
    // Regular expression to match the format "amount walletAddress"
    const regex = /^(\d+(\.\d+)?)\s+(0x[a-fA-F0-9]{40})$/;

    const match = input.match(regex);

    if (!match) {
      return {
        error: "Invalid input format. Expected format: 'amount walletAddress'",
      };
    }

    const amount = match[1];
    const wallet = match[3];

    // Validate Ethereum wallet address without web3
    if (!this.isValidEthereumAddress(wallet)) {
      return { error: 'Invalid Ethereum wallet address.' };
    }

    // Return parsed data
    return { amount, wallet };
  };

  // Simple Ethereum address validation function
  isValidEthereumAddress = (address: string) => {
    // Check if the address starts with "0x" and has 40 hex characters after it
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };
}
