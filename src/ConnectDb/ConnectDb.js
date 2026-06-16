const mongoose = require("mongoose");
const dns = require("dns");
const { seedDefaultAdmin } = require("../Helpers/seedDefaultAdmin");

// Force Google DNS to resolve MongoDB Atlas SRV records (Cloudflare DNS blocks them)
dns.setServers(["8.8.8.8", "8.8.4.4"]);

// internal dependencies
const DB_Name = "johndox";

let isConnected = false;

const connectDb = async () => {
  try {
    if (isConnected) {
      console.log("Already connected to the Database");
      return;
    }

    await mongoose.connect(process.env.MONGO_URL, {
      dbName: DB_Name,
    });

    isConnected = true;

    await seedDefaultAdmin();
    console.log("Successfully connected to the data base");
  } catch (error) {
    console.log(`something wrong with your database connection : ${error}`);
  }
};

module.exports = {
  connectDb,
};
