import nodemailer from 'nodemailer';
import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
dotenv.config();

export class Notifier {
    private transporter: nodemailer.Transporter | null = null;
    private bot: TelegramBot | null = null;
    private telegramChatId: string | undefined;

    constructor() {
        // Email Setup
        if (process.env.SMTP_HOST && process.env.SMTP_USER) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: Number(process.env.SMTP_PORT) || 587,
                secure: false, // true for 465, false for other ports
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
            console.log('[Notifier] Email configured.');
        }

        // Telegram Setup
        if (process.env.TELEGRAM_BOT_TOKEN) {
            this.bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
            this.telegramChatId = process.env.TELEGRAM_CHAT_ID;
            console.log('[Notifier] Telegram configured.');
        }
    }

    async send(platform: string, title: string, url: string) {
        const message = `[${platform}] New Post!\n\n${title}\n${url}`;

        // Send Telegram
        if (this.bot && this.telegramChatId) {
            try {
                await this.bot.sendMessage(this.telegramChatId, message);
                console.log(`[Notifier] Telegram sent for ${url}`);
            } catch (err) {
                console.error('[Notifier] Telegram Failed:', err);
            }
        }

        // Send Email
        if (this.transporter && process.env.EMAIL_TO) {
            try {
                await this.transporter.sendMail({
                    from: '"Post Tracker" <tracker@example.com>',
                    to: process.env.EMAIL_TO,
                    subject: `[${platform}] New Post Detected`,
                    text: message,
                    html: `<h3>New Post on ${platform}</h3><p>${title}</p><a href="${url}">Read More</a>`
                });
                console.log(`[Notifier] Email sent for ${url}`);
            } catch (err) {
                console.error('[Notifier] Email Failed:', err);
            }
        }
    }
}
