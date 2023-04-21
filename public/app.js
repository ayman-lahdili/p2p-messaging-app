
function getKeyPair() {
  // generer et sauvegarder la clef privee en format PEM dans localStorage
  // si elle n'y est pas encore...
  var keyPair, pem = localStorage.getItem("userPublicKey");
  if (pem) {
    console.log("USING MY KEY")
    var privateKey = forge.pki.privateKeyFromPem(pem);
    var publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e);
    keyPair = {privateKey, publicKey};
  } else {
    console.log("CREATING NEW KEY")
    keyPair = forge.pki.rsa.generateKeyPair({bits: 1024});
    localStorage.setItem("userPublicKey",forge.pki.privateKeyToPem(keyPair.privateKey));
    localStorage.setItem("userPrivateKey",forge.pki.privateKeyToPem(keyPair.privateKey));
  };
  return keyPair;
};

var keyPair = getKeyPair();

publicKey = keyPair.publicKey;
privateKey = keyPair.privateKey;

// Function to encrypt a message with a recipient's public key
function encryptMessage(message, receiverPublicKey) {
  // Convert the message to a Uint8Array
  const originalBytes = forge.util.createBuffer(message, 'utf8');

  // Generate a random 128-bit AES key
  const aesKey = forge.random.getBytesSync(16);

  // Convert the AES key to a Base64-encoded string
  const aesKeyBase64 = forge.util.encode64(aesKey);

  // Encrypt the message with AES using the AES key
  const cipher = forge.cipher.createCipher('AES-CBC', aesKey);
  const iv = forge.random.getBytesSync(16);
  cipher.start({ iv: iv });
  cipher.update(originalBytes);
  cipher.finish();
  const encryptedBytes = cipher.output.getBytes();

  // Convert the IV and encrypted bytes to Base64-encoded strings
  const ivBase64 = forge.util.encode64(iv);
  const encryptedBytesBase64 = forge.util.encode64(encryptedBytes);

  // Encrypt the AES key with the recipient's public key
  const encryptedAesKey = receiverPublicKey.encrypt(aesKey);

  // Convert the encrypted AES key to Base64-encoded string
  const encryptedAesKeyBase64 = forge.util.encode64(encryptedAesKey);

  // Return the encrypted message, IV, and encrypted AES key as an object
  return {
    message: encryptedBytesBase64,
    iv: ivBase64,
    aesKey: encryptedAesKeyBase64
  };
}

// Function to decrypt an encrypted message with a user's private key
function decryptMessage(encryptedMessage, userPrivateKey) {
  // Decode the Base64-encoded strings from the encrypted message
  const ivDecoded = forge.util.decode64(encryptedMessage.iv);
  const encryptedBytesDecoded = forge.util.decode64(encryptedMessage.message);
  const encryptedAesKeyDecoded = forge.util.decode64(encryptedMessage.aesKey);

  // Decrypt the AES key with the user's private key
  const decryptedAesKey = userPrivateKey.decrypt(encryptedAesKeyDecoded);

  // Decrypt the encrypted bytes with the decrypted AES key and IV
  const decipher = forge.cipher.createDecipher('AES-CBC', decryptedAesKey);
  decipher.start({ iv: ivDecoded });
  decipher.update(forge.util.createBuffer(encryptedBytesDecoded));
  decipher.finish();
  const decryptedBytes = decipher.output.getBytes();

  // Convert the decrypted bytes to a string
  const decryptedString = decryptedBytes.toString('utf8');

  // Return the decrypted message
  return decryptedString;
}


document.getElementById('dataForm').addEventListener('submit', function(event) {
  event.preventDefault();
  
  const dataTextarea = document.getElementById('dataTextarea');
  const message = dataTextarea.value.trim();
  
  if (message === '') {
    alert('Please enter some data.');
    return;
  }

  // Create a data object to send in JSON format
  const data = {
    messageID: null,
    messageDate: null,
    messageTitle: null,
    messageContent: decryptMessage(encryptMessage(message, publicKey), privateKey)
  };

  // Make a fetch() request to the server with the data object serialized as JSON
  fetch('/addLetter', {
    method: 'POST',
    body: JSON.stringify(data), // Serialize data as JSON
    headers: {
      'Content-Type': 'application/json' // Set the Content-Type header to JSON
    }
  })
  .then(response => {
      if (response.ok) {
        console.log('Data added successfully!');
      } else {
        console.error('Failed to add data:', response.status, response.statusText);
      }
  })
  .catch(error => {
    console.error('Failed to add data:', error);
  });
});