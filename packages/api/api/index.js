let handler;

module.exports = async (req, res) => {
  if (!handler) {
    const { bootstrap } = require('../dist/serverless');
    handler = await bootstrap();
  }
  handler(req, res);
};
