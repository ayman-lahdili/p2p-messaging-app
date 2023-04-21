const express = require("express"),
  cors = require('cors'),
  bodyParser = require("body-parser"),
  request = require('request'),
  uniqid = require('uniqid'),
  fs = require('fs');

const app = express(),
  port = 3000,
  url = 'http://127.0.0.1' + ':' + port,
  peers = ['http://127.0.0.1:3000/', 'http://127.0.0.1:3001/'];

app.use(cors());
app.use(express.static('public'));

let data;
let exists = fs.existsSync('data.json');
if (exists) {
    // Read the file
    console.log('loading data');
    data = JSON.parse(fs.readFileSync('data.json', 'utf8'));
    // Parse it  back to object
  } else {
    // Otherwise start with blank list
    console.log('No words');
    data = [];
}

app.post('/addLetter', bodyParser.json(), (req, res) => {
  let data = JSON.parse(fs.readFileSync('data.json', 'utf8'));


  const date = new Date()
  const message = req.body;
  message.messageID = uniqid(); // Generate Unique ID for the message
  message.messageDate = date.toLocaleString();
  message.messageTimeIndex = date.getTime();
  data.push(message);
  fs.writeFileSync('data.json', JSON.stringify(data), 'utf8');
  // Send a response indicating success
  res.status(200).send('New message added successfully');
});

app.get('/getLetters', (req, res) => {
  // express automatically renders objects as JSON
  var txt = fs.readFileSync('data.json', 'utf8');
  // Parse it  back to object
  var data = JSON.parse(txt);
  res.send(data);
});

var syncFiles = () => {

  var peer = peers[0] +  'getLetters';
  console.log(peer);
  if (peer === url + '/getLetters') {
    peers.push(peers.shift());
    return;
  }

  console.log(" ... syncing with "+peer);

  console.log("MY");
  let data1 = JSON.parse(fs.readFileSync('data.json', 'utf8'));
  // console.log(data1);
  
  // Send GET request to server 2
  request(peer, (error, response, body2) => {
    if (error) {
      console.error('Error fetching data from server 2:', error);
      return;
    }

    // Parse JSON data from server 1 and server 2

    console.log("OTHER");
    const data2 = JSON.parse(body2);
    // console.log(data2);

    // Sync the content of the two JSON files as needed
    // For example, you can merge the data from the two files
    let synced = []
    
    if (data1 == []) {
      synced = data2;
    } else {
      const uniqueParam = 'messageID'; // Change this to the unique parameter in your JSON

      const uniqueID1 = data1.map(item => item[uniqueParam]);
      const d1 = [... new Set(uniqueID1)]
      console.log(d1);
      const uniqueID2 = data2.map(item => item[uniqueParam]);
      const d2 = [... new Set(uniqueID2)]
      console.log(d2);

      const onlyunique = [... new Set (d1.concat(d2))]

      const both = data1.concat(data2);

      onlyunique.forEach(id => {
        let message = both.find(item => item[uniqueParam] === id);
        synced.push(message);
      });

      synced = synced.sort((a, b) => parseFloat(b.messageTimeIndex) - parseFloat(a.messageTimeIndex));
    
    }
    
    // synced = data1//.concat(data2);

    fs.writeFileSync('data.json', JSON.stringify(synced), 'utf8');

    // Do something with the synced data
  });

};


app.get('/peers', (req, res) => {
  res.send(peers);
});

var server = app.listen(port, () => {
  console.log('Listening at '+ url);
  setInterval(syncFiles, 10000)
});
