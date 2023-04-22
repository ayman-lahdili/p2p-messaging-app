const express     = require("express"),
      cors        = require('cors'),
      bodyParser  = require("body-parser"),
      request     = require('request'),
      uniqid      = require('uniqid'),
      fs          = require('fs');

const app   = express(),
      PORT  = 3000,
      URL   = 'http://127.0.0.1' + ':' + PORT,
      PEERS = [
                'http://127.0.0.1:3000/', 
                'http://127.0.0.1:3001/'
              ];

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Unique merge the content of the two JSON files
// NOT OPTIMISED FOR PERFORMANCE
const returnUniqueMessages = (data1, data2) => {
  let synced = []

  if (data1 == []) {
    synced = data2;
  } else {
    const uniqueParam = 'messageID';

    const d1          = [... new Set(data1.map(item => item[uniqueParam]))]
    const d2          = [... new Set(data2.map(item => item[uniqueParam]))]
    const onlyunique  = [... new Set (d1.concat(d2))]
    const both        = data1.concat(data2);

    onlyunique.forEach(id => {
      let message = both.find(item => item[uniqueParam] === id);
      
      synced.push(message);
    });

    synced = synced.sort((a, b) => parseFloat(b.messageTimeIndex) - parseFloat(a.messageTimeIndex));
  }

  return synced;
};

// Synchronises the local database data with the other databases of the peers server
const syncFiles = () => {

  const peer = PEERS[0] +  'getLetters';

  if (peer === URL + '/getLetters') {
    PEERS.push(PEERS.shift());
    return;
  }

  console.log(" ... attempt syncing with "+peer);

  let data1 = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  
  // Send GET request to peer server
  request(peer, (error, response, body2) => {
    if (error) {
      console.error('Error fetching data from server 2:', error);
      return;
    }
    console.log(" ... syncing with "+peer);

    const data2 = JSON.parse(body2);

    // Sync the content of the two JSON files as needed
    const synced = returnUniqueMessages(data1, data2);

    fs.writeFileSync('data.json', JSON.stringify(synced), 'utf8');
    console.log("Successfully synced data with "+peer);
  });
};

// POST REQUEST: Adds letter to local database
app.post('/addLetter', (req, res) => {
  const data    = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  const date    = new Date();
  const message = req.body;

  // Add metadata
  message.messageID         = uniqid();
  message.messageDate       = date.toLocaleString();
  message.messageTimeIndex  = date.getTime();

  // Write to database
  data.push(message);
  fs.writeFileSync('data.json', JSON.stringify(data), 'utf8');
  res.status(200).send('New message sent successfully');
});

// GET REQUEST: Fetch content of local database
app.get('/getLetters', (req, res) => {
  const txt   = fs.readFileSync('data.json', 'utf8');
  const data  = JSON.parse(txt);

  res.send(data);
});

// GET REQUEST: Forces synchronisation with valid peers
app.get('/peers', (req, res) => {
  console.log(" ... forcing sync with peers");
  syncFiles();

  res.status(200).send("Synced with peers successfully");
});

// SERVER
app.listen(PORT, () => {
  console.log('Listening at '+ URL);

  // Attempt synchronisation with peers every 10000ms
  setInterval(syncFiles, 10000)
});
