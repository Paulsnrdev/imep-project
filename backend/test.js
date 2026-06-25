const mongoose = require('mongoose');

const URI = 'mongodb://ajibade_db_user:Ajibade123@ac-hahve02-shard-00-00.l6vxs27.mongodb.net:27017,ac-hahve02-shard-00-01.l6vxs27.mongodb.net:27017,ac-hahve02-shard-00-02.l6vxs27.mongodb.net:27017/?ssl=true&replicaSet=atlas-zfx66h-shard-0&authSource=admin';

console.log('Connecting to correct cluster...');
console.log('URI preview:', URI.substring(0, 80) + '...');

mongoose.connect(URI, {
  serverSelectionTimeoutMS: 10000,
  family: 4,
})
.then(() => {
  console.log('✅ SUCCESS! Connected to MongoDB Atlas!');
  process.exit(0);
})
.catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});