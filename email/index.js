const { emailSender } = require('@keystonejs/email');

const pugEmailSender = emailSender.pug({
  root: __dirname,
  transport: 'mailgun',
});

const sendEmail = (templatePath, rendererProps, options) => {
  if (!templatePath) {
    console.error('No template path provided');
  }
  return pugEmailSender(templatePath).send(rendererProps, options);
};

module.exports = {
  sendEmail,
};