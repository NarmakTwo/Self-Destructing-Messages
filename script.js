const express = require('express');
const fs = require('fs').promises;
const moment = require('moment');
const path = require('path');
const pino = require('pino');
const pinoPretty = require('pino-pretty');
const app = express();
const port = process.env.PORT || 10000;

const logger = pino({
  level: 'debug'
});

logger.pipe(pinoPretty());

app.use(express.json());
app.use(express.static(__dirname + '/public'));

const messagesFilePath = 'temporary-messages.json';
fs.writeFile(messagesFilePath, '[]', 'utf8')
  .then(() => logger.debug('Created messages file'))
  .catch(err => logger.error('Error creating messages file:', err));

app.post('/send', async (req, res) => {
  const message = req.body.message;
  logger.debug(`Message recieved: ${message}`)
  const timestamp = moment().format();

  try {
    const existingMessages = await fs.readFile(messagesFilePath, 'utf8');
    const parsedMessages = JSON.parse(existingMessages);
    parsedMessages.push({ message, timestamp });
    await fs.writeFile(messagesFilePath, JSON.stringify(parsedMessages), 'utf8');
    res.status(200).json({ message: 'Message stored successfully.' });
    logger.info('Message stored successfully')
  } catch (err) {
    res.status(500).json({ error: 'Failed to store the message.' });
    logger.error(`Failed to store the message. Error: ${err}`)
  }
});

app.get('/retrieve', async (req, res) => {
  try {
    const existingMessages = await fs.readFile(messagesFilePath, 'utf8');
    const parsedMessages = JSON.parse(existingMessages);
    const timestampThreshold = moment().subtract(48, 'hours').format();
    const filteredMessages = parsedMessages.filter(message => moment(message.timestamp).isAfter(timestampThreshold));
    res.status(200).json(filteredMessages);
    logger.info(filteredMessages)
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve messages.' });
    logger.error('Failed to retrieve messages.')
  }
});

// Serve the index.html file when accessing the root URL
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  res.sendFile(indexPath);
  logger.debug(`Serving ${indexPath} to /`)
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
  logger.info(`Server is running on port ${port}`)
});
