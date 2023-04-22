/* 
    DOM Elements
*/

// Contact
const saveContact = document.querySelector(".addContact");
const cancelAddContact = document.querySelector(".cancelAddContact");
const contactDisplay = document.querySelector(".contacts");
const contacts = JSON.parse(localStorage.getItem("contacts")) || [];
const openAddContact = document.querySelector(".sidebar__addUser");
const profileInfo = document.querySelector(".sidebar__profileInfo");

// Messages
const sendMessage = document.querySelector(".sendMessage");
const cancelMessage = document.querySelector(".cancelMessage");

// Settings
const changeSettings = document.querySelector(".sidebar__viewSettings");
const confirmSettingsAction = document.querySelector(".confirmAction");
const cancelAction = document.querySelector(".cancelAction");

// Back
const backToMessage = document.querySelector(".backToMessage");

// Search: FUNCTIONALITY TO ADD
const search = document.querySelector(".search");

// Synchronise 
const syncMessages = document.querySelector(".sync");

// Display Areas
const viewMessages = document.querySelector(".messages");
const viewMessage = document.querySelector(".message");
const viewContactForm = document.querySelector(".addContactSetting");
const viewMessageForm = document.querySelector(".messageForm");
const viewUserSetting = document.querySelector(".userSetting");
const viewMessageContent =  document.querySelector(".messageContent");



// Synchronises with the latest messages and contacts
function sync() {
  clearDisplay();
  showProfile();
  showContacts();
  showMessages();
  fetch("/peers");
}

// Generates a Public Key and Private Key PEM format for to user in his localStorage 
function getKeyPair() {
    var keyPair, pem = localStorage.getItem("userPrivateKey");
    if (pem) {
        var privateKey = forge.pki.privateKeyFromPem(pem);
        var publicKey = forge.pki.setRsaPublicKey(privateKey.n, privateKey.e);
        
        keyPair = {privateKey, publicKey};
    } else {
        keyPair = forge.pki.rsa.generateKeyPair({bits: 1024});

        localStorage.setItem("userPrivateKey",forge.pki.privateKeyToPem(keyPair.privateKey));
        localStorage.setItem("userPublicKey", forge.pki.publicKeyToPem(forge.pki.setRsaPublicKey(keyPair.privateKey.n, keyPair.privateKey.e)));
    };
    return keyPair;
};

const keyPair = getKeyPair();
const USERPUBLICKEY = keyPair.publicKey;
const USERPRIVATEKEY = keyPair.privateKey;
// Truncated Public Key, used to identify the user in a concise way
const TRUNCUSERPUBLICKEY = localStorage.getItem("userPublicKey").trim().replace(/\r?\n|\r/g, '').substring(66, 76);

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
        content: encryptedBytesBase64,
        iv: ivBase64,
        aesKey: encryptedAesKeyBase64
    };
};
  
// Function to decrypt an encrypted message with a user's private key
function decryptMessage(encryptedMessage, userPrivateKey) {
    // Decode the Base64-encoded strings from the encrypted message
    const ivDecoded = forge.util.decode64(encryptedMessage.iv);
    const encryptedBytesDecoded = forge.util.decode64(encryptedMessage.content);
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
};

function showProfile() {
  profileInfo.innerHTML = `
  <h3>You</h3>
  <p>${TRUNCUSERPUBLICKEY}</p>
  `;
}

function showContacts() {
    contactDisplay.innerHTML = "";

    contacts.forEach((contact) => {
        // Create a new div element for each message
        const contactDiv = document.createElement('div');
      
        // Set the content of the div to the message content
        contactDiv.innerHTML = `
        <div class="contact">
            <div id="${contact.truncPublicKey}" class="sidebar__user">
                <div>
                <span class="status"></span>
                </div>
                <h4>${contact.truncPublicKey}</h4>
                <div id="${contact.truncPublicKey}" style="display:none">${contact.publicKey}</div>
            </div>
            <i id="deleteUser-${contact.truncPublicKey}" class="fas fa-trash-alt sidebar__deleteUser"></i>
        </div>
        `
        contactDisplay.appendChild(contactDiv);

        const sendMessageUser = document.getElementById(contact.truncPublicKey); 
        const deleteContact = document.getElementById(`deleteUser-${contact.truncPublicKey}`);

        sendMessageUser.addEventListener("click", ()  => {
            clearDisplay();
            document.querySelector(".messagePKInput").textContent = contact.publicKey;
            viewMessageForm.style.display = "block";
            
        });

        deleteContact.addEventListener("click", ()  => {
            let itarget = 0;
    
            for (let i; i<contacts.length; i++) {
                if (contacts[i].publicKey === contact.publicKey) {
                    itarget = i;
                }
            }

            contacts.splice(itarget, 1);
            localStorage.setItem("contacts", JSON.stringify(contacts));

            showContacts();
        });
    });
}

async function showMessages() {
    
    viewMessages.innerHTML = "";
    console.log("messages")

    const response = await fetch("/getLetters");
    const messages = await response.json();

    console.log(messages);


    messages.forEach((message) => {
        try {
            const decryptedMessageTitle = decryptMessage(message.messageTitle, USERPRIVATEKEY);
            const decryptedMessageContent = decryptMessage(message.messageContent, USERPRIVATEKEY);
            
            // Create a new div element for each message
            const contactDiv = document.createElement('div');
        
            // Set the content of the div to the message content
            contactDiv.innerHTML = `
            <div id="${message.messageID}" class="message">
            <div class="message__info">
                <h4>${message.messageSenderTrunc} <span class="message__timestamp"> ${message.messageDate} </span></h4>
                <p>${decryptedMessageTitle}</p>
                
            </div>
            </div>
            `
            viewMessages.appendChild(contactDiv);
            console.log("Decrypted");

            const messageBox = document.getElementById(message.messageID); 

            messageBox.addEventListener("click", ()  => {
                clearDisplay();
                document.querySelector(".messageContent__sender").textContent = message.messageSender; 
                document.querySelector(".messageContent__title").innerHTML = `<h3>${decryptedMessageTitle}</h3>`;
                document.querySelector(".messageContent__content").innerHTML = `${decryptedMessageContent}`;
                
                viewMessageContent.style.display = "block";
            });

        } catch (error) {
            console.log(error);
        }

    });
    viewMessages.style.display = "block";

} 

function clearDisplay() {
    viewMessages.style.display = "none";
    viewContactForm.style.display = "none";
    viewMessageForm.style.display = "none";
    viewUserSetting.style.display = "none";
    viewMessageContent.style.display = "none";
}

sync();

openAddContact.addEventListener("click", ()  => {
    clearDisplay();
    viewContactForm.style.display = "block";
});

saveContact.addEventListener("click", ()  => {
    clearDisplay();
    viewMessages.style.display = "block";

    const contact = document.querySelector(".newContactPuKInput").value.trim().replace(/\r?\n|\r/g, '');
    const trunc = contact.substring(66, 76);

    const json = {
        publicKey: contact,
        truncPublicKey: trunc
    }

    contacts.push(json);
    localStorage.setItem("contacts", JSON.stringify(contacts));
    sync();
});

cancelAddContact.addEventListener("click", ()  => {
    // alert("addUser");
    clearDisplay();
    viewMessages.style.display = "block";

});

changeSettings.addEventListener("click", ()  => {

    clearDisplay();
    viewUserSetting.style.display = "block";

    const userPuKInput = document.querySelector(".userPuKInput");
    const userPrKInput = document.querySelector(".userPrKInput");

    publicKey = localStorage.getItem("userPublicKey");
    privateKey = localStorage.getItem("userPrivateKey");

    userPuKInput.innerHTML = publicKey;
    userPrKInput.innerHTML = privateKey;

});

search.addEventListener("keydown", (event)  => {
    if (event.key === "Enter") {
        const searchTerm = document.querySelector(".searchTerm").value;

        alert(searchTerm);
    }
});

syncMessages.addEventListener("click", ()  => {
    sync();
});

sendMessage.addEventListener("click", ()  => {

    const messagePKInput = document.querySelector(".messagePKInput").value.trim();
    const messageTitleInput = document.querySelector(".messageTitleInput").value.trim();
    const messageContentInput = document.querySelector(".messageContentInput").value.trim();
    const messageSender = localStorage.getItem("userPublicKey");
    const ReceiverPuK = forge.pki.publicKeyFromPem(messagePKInput);

    const message = {
        messageID: null,
        messageDate: null,
        messageTimeIndex: null,
        messageSender: messageSender,
        messageSenderTrunc: TRUNCUSERPUBLICKEY,
        messageTitle: encryptMessage(messageTitleInput, ReceiverPuK),
        messageContent: encryptMessage(messageContentInput, ReceiverPuK)
    };



    fetch('/addLetter', {
    method: 'POST',
    body: JSON.stringify(message), // Serialize data as JSON
    headers: {
        'Content-Type': 'application/json' // Set the Content-Type header to JSON
    }
    })
    .then(response => {
        if (response.ok) {
        console.log('Message sent successfully!');
        } else {
        console.error('Failed to add data:', response.status, response.statusText);
        }
    })
    .catch(error => {
    console.error('Failed to add data:', error);
    });

    clearDisplay();
    sync();
    viewMessages.style.display = "block";
});

cancelMessage.addEventListener("click", ()  => {
    // alert("cancelMessage");
    clearDisplay();
    viewMessages.style.display = "block";
});

viewMessage.addEventListener("click", ()  => {
    clearDisplay();
    viewMessageContent.style.display = "block";
});

backToMessage.addEventListener("click", ()  => {  
    clearDisplay();
    viewMessages.style.display = "block";
});

confirmSettingsAction.addEventListener("click", ()  => {
    clearDisplay();
    viewUserSetting.style.display = "none";

    const userPuKInput = document.querySelector(".userPuKInput");
    const userPrKInput = document.querySelector(".userPrKInput");

    const credentials = {
        userPublicKey: userPuKInput,
        userPrivateKey: userPrKInput
    };

    alert(JSON.stringify(credentials));

});

cancelAction.addEventListener("click", ()  => {
    // alert("cancelMessage");
    clearDisplay();
    viewMessages.style.display = "block";
});
