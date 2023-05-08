# P2P Messaging App

 A Peer to Peer decentralised messaging app

 # How to make it run

 1. Clone the project
    
    ```
    > git clone https://github.com/ayman-lahdili/p2p-messaging-app.git
    ```

2. Execute `npm install -y`
    ```
    > npm install -y
    ```

3. Modify the `PEERS` array containing the IPs in `index.js` with the IPs of the peers you want to communicate with
    ```js
    const express   = require("express"),
        cors        = require('cors'),
        bodyParser  = require("body-parser"),
        request     = require('request'),
        uniqid      = require('uniqid'),
        fs          = require('fs');

    const app   = express(),
        PORT  = 3000,
        URL   = 'http://127.0.0.1' + ':' + PORT,
        PEERS = [
                    'http://127.0.0.1:3000/', //<-- Add here
                    'http://127.0.0.1:3001/' 
                ];
    ```

4. Start your server
    ```
    > node index.js
    ```

5. Open your page to http://127.0.0.1:3000 in your browser

    In this example the peer is in http://127.0.0.1:3001, so to test it out your can repeat step 1 to 5 and modify the `PORT` variable to `3001`:

    ```js
    const express   = require("express"),
        cors        = require('cors'),
        bodyParser  = require("body-parser"),
        request     = require('request'),
        uniqid      = require('uniqid'),
        fs          = require('fs');

    const app   = express(),
        PORT  = 3001, //Modified
        URL   = 'http://127.0.0.1' + ':' + PORT,
        PEERS = [
                    'http://127.0.0.1:3000/',
                    'http://127.0.0.1:3001/' 
                ];
    ```


# How does it work

## Server side
The server side includes all operations that run on the server. The source code for the server is in the index.js file. Requests are managed using the npm express.js library.

### The Pairs
The pairs are the peer servers connected to our server. They allow the synchronization of the server data. In the code, we have a list of pairs called `PEERS`, which contains the addresses of the peers.

### The different HTTP requests
- `GET /addLetter` : This request allows to add a letter to the local database. The body of the request must contain the details of the letter to be added. When a `POST` request is received, the letter is assigned a unique ID using the uniqid library, a date and a time index before being added to the local database.

- `GET /peers`: This request allows to synchronize the messages contained in the other servers. The `syncFiles` function is responsible for synchronizing the data in the local database with the other databases of the peer servers. It starts by defining the first peer server in the `PEERS` list as the target of the synchronization. If the peer server is the same as the local server, it moves to the next peer server in the list. The function then reads the data from the local database file using `fs.readFileSync` and sends a `GET` request to the peer server using request from the npm requests library. If the request succeeds, the function receives a response containing the database data of the peer server in the `body2` parameter. 
The function then uses the `returnUniqueMessages` function to synchronize the contents of the two `JSON` files if necessary. The function merges the contents of the two databases and removes duplicates by comparing the `messageID` property of each object. It then sorts the merged array of messages by messageTimeIndex in descending order to get the most recent messages first. The result is stored in the synced variable.
Finally, the function writes the synchronized data to the local database file using `fs.writeFileSync` and logs a message indicating that the data has been successfully synchronized with the peer server.

- `POST /getLetters`: This section of code sets up a `GET` request endpoint to retrieve the contents of the local database from the server. When a `GET` request is sent to the /getLetters endpoint, the server reads the "`data.json`" file containing the local database contents using the fs module and returns the parsed JSON data as a response. This access point is used to provide access to the local database to other peers in the network, who can then synchronize their databases with the server's database.

### The database
The database is a `JSON` file called data.json that contains a list of messages. When a message is added to the database, it is stored as a `JSON` object in this file:

### Synchronization between databases
The `syncFiles()` function which allows to synchronize data between peer servers. The `fetch()` function is used to send a `GET` request to a peer, which returns data from its database. The data is then merged with the local data in the database using the `returnUniqueMessages()` function. The synchronized data is then stored in the local database.
The server attempts every **10 seconds** to synchronize with its pairs.


# Potential improvements
* The `syncFile()` function can be improved in terms of efficiency
* The peers url are hardcoded into the code which is not very safe
* The UI can be improved
* New functionalities can be added (reply, send to many, labels, etc.)