const mongoose = require('mongoose');
const dns = require('dns');

const connectDB = async () => {
    const uri = process.env.MONGODB_URI;

    if (!uri) {
        console.error('❌ Error: MONGODB_URI is not defined in environment variables');
        process.exit(1);
    }

    const currentDnsServers = dns.getServers();
    if (currentDnsServers.length === 1 && currentDnsServers[0] === '127.0.0.1') {
        console.warn('⚠️ Local DNS server detected. Setting fallback DNS servers for Atlas SRV lookup.');
        dns.setServers(['8.8.8.8', '8.8.4.4']);
    }

    const attempt = async (retries = 5, delay = 5000) => {
        try {
            await mongoose.connect(uri, { serverSelectionTimeoutMS: 10000 });
            console.log(`✅ MongoDB Connected: ${mongoose.connection.host}`);
            console.log(`📚 Database: ${mongoose.connection.name}`);
        } catch (error) {
            console.error(`❌ MongoDB connection failed: ${error.message}`);
            if (retries > 0) {
                console.log(`🔄 Retrying in ${delay / 1000}s... (${retries} attempts left)`);
                setTimeout(() => attempt(retries - 1, delay), delay);
            } else {
                console.error('❌ Could not connect to MongoDB after 5 attempts. Server running without DB.');
            }
        }
    };

    await attempt();
};

module.exports = connectDB;