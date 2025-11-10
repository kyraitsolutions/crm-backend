import dotenv from "dotenv"
import Queue from 'bull';
import logger from '../utils/logger';

dotenv.config()
// Create queues
const emailQueue = new Queue('email processing', {
    redis: {
        host: process.env.REDIS_HOST || 'redis-14482.c281.us-east-1-2.ec2.redns.redis-cloud.com',
        port: parseInt(process.env.REDIS_PORT || '14482'),
        password: process.env.REDIS_PASS||'uObO37toZgN8yO0AmkB4D73E4cpHe0MH', // this must be correct
    },
    defaultJobOptions: {
        removeOnComplete: 10,
        removeOnFail: 5,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
    },
});

// const notificationQueue = new Queue('notification processing', {
//     redis: {
//         host: process.env.REDIS_HOST || 'localhost',
//         port: parseInt(process.env.REDIS_PORT || '6379'),
//     },
//     defaultJobOptions: {
//         removeOnComplete: 10,
//         removeOnFail: 5,
//         attempts: 3,
//         backoff: {
//             type: 'exponential',
//             delay: 2000,
//         },
//     },
// });

// const leadProcessingQueue = new Queue('lead processing', {
//     redis: {
//         host: process.env.REDIS_HOST || 'localhost',
//         port: parseInt(process.env.REDIS_PORT || '6379'),
//     },
//     defaultJobOptions: {
//         removeOnComplete: 10,
//         removeOnFail: 5,
//         attempts: 3,
//         backoff: {
//             type: 'exponential',
//             delay: 2000,
//         },
//     },
// });

// Queue event handlers

// Connection events
emailQueue.on('ready', () => {
    console.log('✅ Redis queue connected');
});

emailQueue.on('error', (err) => {
    console.error('❌ Redis queue connection error:', err);
});

// Job lifecycle logs
emailQueue.on('active', (job) => {
    console.log(`🚀 Job ${job.id} started`);
});

emailQueue.on('completed', (job) => {
    console.log("✅ yes here");
    logger.info(`Email job ${job.id} completed`);
});

emailQueue.on('failed', (job, err) => {
    console.log("❌ it is failed");
    logger.error(`Email job ${job.id} failed:`, err);
});


// notificationQueue.on('completed', (job) => {
//     logger.info(`Notification job ${job.id} completed`);
// });

// notificationQueue.on('failed', (job, err) => {
//     logger.error(`Notification job ${job.id} failed:`, err);
// });

// leadProcessingQueue.on('completed', (job) => {
//     logger.info(`Lead processing job ${job.id} completed`);
// });

// leadProcessingQueue.on('failed', (job, err) => {
//     logger.error(`Lead processing job ${job.id} failed:`, err);
// });

// Queue processing functions
// emailQueue.process('send-welcome-email', async (job) => {
//     console.log("Job Id:",job)
//     const { email, name, profileId } = job.data;
//     logger.info(`Processing welcome email for ${email}`);

//     // Import email service here to avoid circular dependencies
//     const { EmailService } = await import('../services/email.service');
//     const emailService = new EmailService();

//     await emailService.sendWelcomeEmail(email, name, profileId);
// });

// emailQueue.process('send-lead-notification', async (job) => {
//     const { profileEmail, leadData, chatbotName } = job.data;
//     logger.info(`Processing lead notification email for ${profileEmail}`);

//     const { sendLeadNotificationEmail } = await import('../services/emailService');
//     await sendLeadNotificationEmail(profileEmail, leadData, chatbotName);
// });

// notificationQueue.process('create-notification', async (job) => {
//     const { userId, type, message, data } = job.data;
//     logger.info(`Processing notification for user ${userId}`);

//     const { createNotification } = await import('../services/notificationService');
//     await createNotification(userId, type, message, data);
// });

// leadProcessingQueue.process('process-lead', async (job) => {
//     const { leadData, chatbotId, profileId } = job.data;
//     logger.info(`Processing lead for chatbot ${chatbotId}`);

//     const { processIncomingLead } = await import('../services/leadService');
//     await processIncomingLead(leadData, chatbotId, profileId);
// });

// Graceful shutdown
const gracefulShutdown = async () => {
    logger.info('Shutting down queues...');

    await Promise.all([
        emailQueue.close(),
        // notificationQueue.close(),
        // leadProcessingQueue.close(),
    ]);

    logger.info('All queues closed');
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// export { emailQueue, notificationQueue, leadProcessingQueue };
// export default { emailQueue, notificationQueue, leadProcessingQueue };

export { emailQueue };
export default { emailQueue };
