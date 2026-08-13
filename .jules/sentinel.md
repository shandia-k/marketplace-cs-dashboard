## 2024-05-15 - [Raw SHA-256 for Password Hashing]
**Vulnerability:** Passwords were hashed using raw SHA-256 without a salt. This is highly vulnerable to rainbow table attacks and dictionary attacks.
**Learning:** Raw fast hashes should never be used for passwords. Salting is required to prevent rainbow table attacks, and slow hashes (scrypt, bcrypt, argon2) are needed to resist dictionary attacks.
**Prevention:** Always use `crypto.scrypt` (or bcrypt/argon2) with a random salt when storing passwords, and verify the hash appropriately.
