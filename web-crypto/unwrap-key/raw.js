(() => {

  /*
  Salt that is to be used in derivation of the key-wrapping key,
  alongside the password the user supplies.
  This must match the salt value that was originally used to derive
  the key.
  */
  const saltBytes = [89,113,135,234,168,204,21,36,55,93,1,132,242,242,192,156];

  /*
  The wrapped key itself.
  */
  const wrappedKeyBytes = [171,223,14,36,201,233,233,120,164,68,217,192,226,80,
      224,39,199,235,239,60,212,169,100,23,61,54,244,197,160,80,109,230,207,
      225,57,197,175,71,80,209];

  /*
  Convert an array of byte values to an ArrayBuffer.
  */
  function bytesToArrayBuffer(bytes) {
    const bytesAsArrayBuffer = new ArrayBuffer(bytes.length);
    const bytesUint8 = new Uint8Array(bytesAsArrayBuffer);
    bytesUint8.set(bytes);
    return bytesAsArrayBuffer;
  }

  /*
  Get some key material to use as input to the deriveKey method.
  The key material is a password supplied by the user.
  */
  function getKeyMaterial() {
    let password = window.prompt("Enter your password");
    let enc = new TextEncoder();
    return window.crypto.subtle.importKey(
      "raw", 
      enc.encode(password), 
      {name: "PBKDF2"}, 
      false, 
      ["deriveBits", "deriveKey"]
    );
  }

  /*
  Derive an AES-KW key using PBKDF2.
  */
  async function getUnwrappingKey() {
    // 1. get the key material (user-supplied password)
    const keyMaterial = await getKeyMaterial();
    // 2 initialize the salt parameter.
    // The salt must match the salt originally used to derive the key.
    // In this example it's supplied as a constant "saltBytes".
    const saltBuffer = bytesToArrayBuffer(saltBytes);
    // 3 derive the key from key material and salt
    return window.crypto.subtle.deriveKey(
      {
        "name": "PBKDF2",
        salt: saltBuffer,
        "iterations": 100000,
        "hash": "SHA-256"
      },
      keyMaterial,
      { "name": "AES-KW", "length": 256},
      true,
      [ "wrapKey", "unwrapKey" ]
    );
  }

  /*
  Unwrap an AES secret key from an ArrayBuffer containing the raw bytes.
  Takes an array containing the bytes, and returns a Promise
  that will resolve to a CryptoKey representing the secret key.
  */
  async function unwrapSecretKey(wrappedKey) {
    // 1. get the unwrapping key
    const unwrappingKey = await getUnwrappingKey();
    // 2. initialize the wrapped key
    const wrappedKeyBuffer = bytesToArrayBuffer(wrappedKey);
    // 3. unwrap the key
    return window.crypto.subtle.unwrapKey(
      "raw",                 // import format
      wrappedKeyBuffer,      // ArrayBuffer representing key to unwrap
      unwrappingKey,         // CryptoKey representing key encryption key
      "AES-KW",              // algorithm identifier for key encryption key
      "AES-GCM",             // algorithm identifier for key to unwrap
      true,                  // extractability of key to unwrap
      ["encrypt", "decrypt"] // key usages for key to unwrap
    );
  }

  /*
  Fetch the contents of the "message" textbox, and encode it
  in a form we can use for the encrypt operation.
  */
  function getMessageEncoding() {
    const messageBox = document.querySelector("#raw-message");
    const message = messageBox.value;
    const enc = new TextEncoder();
    return enc.encode(message);
  }

  /*
  Get the encoded message, encrypt it and display a representation
  of the ciphertext in the "Ciphertext" element.
  */
  async function encryptMessage(key) {
    const encoded = getMessageEncoding();
    // iv will be needed for decryption
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await window.crypto.subtle.encrypt(
      {
        name: "AES-GCM",
        iv: iv
      },
      key,
      encoded
    );

    const buffer = new Uint8Array(ciphertext, 0, 5);
    const ciphertextValue = document.querySelector(".raw .ciphertext-value");
    ciphertextValue.classList.add('fade-in');
    ciphertextValue.addEventListener('animationend', () => {
      ciphertextValue.classList.remove('fade-in');
    });
    ciphertextValue.textContent = `${buffer}...[${ciphertext.byteLength} bytes total]`;
  }

  /*
  When the user clicks "Unwrap Key"
  - unwrap the key
  - enable the "Encrypt" button
  - add a listener to "Encrypt" that uses the key.
  */
  const unwrapKeyButton = document.querySelector(".raw .unwrap-key-button");
  unwrapKeyButton.addEventListener("click", async () => {
    const secretKey = await unwrapSecretKey(wrappedKeyBytes);
    const encryptButton = document.querySelector(".raw .encrypt-button");
    encryptButton.removeAttribute("disabled");
    encryptButton.addEventListener("click", () => {
      encryptMessage(secretKey);
    });
  });

})();
