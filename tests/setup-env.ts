process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:0/test-setup-noop";
process.env.JWT_SECRET = "test-secret-32-chars-minimum-xxxxxxx";
process.env.JWT_EXPIRES_IN = "24h";
process.env.BCRYPT_ROUNDS = "10";
