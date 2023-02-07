require("source-map-support").install()

//initializes
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const dotenvExpand = require('dotenv-expand');
const myEnv = dotenv.config();
dotenvExpand.expand(myEnv);
import { Scenes, session, Telegraf } from 'telegraf';
import { NEW_USER_WIZARD_SCENE_ID, PAYMENT_WIZARD_SCENE_ID, USER_WIZARD_SCENE_ID } from './config';
import { subscriptionController, userController } from './controllers';
const Subscription = require("./models/subscription.model");

import { newUserWizard, paymentScene, userWizard } from './scenes';
import { processWechatPay } from './services/wechatpay';

let database_url = process.env.LOCAL_DATABASE_URL
if(process.env.NODE_ENV === "production"){
    database_url = process.env.LOCAL_DATABASE_URL
}
//mongoose
mongoose.set('useFindAndModify', false);
mongoose.set('useUnifiedTopology', true);
mongoose
	.connect(database_url, { useNewUrlParser: true })
	.then(async () => {
		console.log('Connected!')
        //const data = await Subscription.find();
        //console.log(data);
	})
	.catch((err: any) => {
		console.log(err);
	});

const { enter, leave } = Scenes.Stage;

const token = process.env.BOT_TOKEN
if(process.env.BOT_TOKEN === undefined){
    throw new TypeError("BOT_TOKEN must be provided");
}

const bot = new Telegraf<Scenes.WizardContext>(`${token}`);
//bot.use(Telegraf.log());
const stage = new Scenes.Stage<Scenes.WizardContext>([newUserWizard, userWizard, paymentScene]);
bot.use(session());
bot.use(stage.middleware());
/* /start */
/*bot.start(ctx => {
    const msg =
      "Welcome to Wings! ✌️\n\n" +
      "We cover your limitation! :)\n\n" +
      "Are you a new user? Please say hi to Wings!\n\n" +
      "An existing new user? Please say hi to Crown!";
    ctx.reply(msg, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "Hi Wings!", callback_data: "wings" },
            { text: "Hi Crown!", callback_data: "crown" },
          ],
        ],
      },
    });
})*/
bot.start(async (ctx) => {
  const data = await processWechatPay({amount: 50});
  console.log(data);
  await ctx.reply(data);
})
// Hi Wings!
bot.action("wings", async ctx => {
    //const subscription = await subscriptionController.findById("639a10e24f75acae828af8fd");
    //const initialState = {newuser: true, subscription: subscription}
    const initialState = {newuser: true}
    ctx.scene.enter(NEW_USER_WIZARD_SCENE_ID, initialState)
    //ctx.scene.enter(PAYMENT_WIZARD_SCENE_ID, initialState)
} );
// Hi Crown!
bot.action("crown", ctx => {
    const initialState = {newuser: false}
    ctx.scene.enter(USER_WIZARD_SCENE_ID, initialState)
})

bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));