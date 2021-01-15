const mongoose = require('mongoose');

beforeEach(async () => {
  const clearCollections = () => {
    const collections = Object.keys(mongoose.connection.collections);
    collections.forEach((collection) => {
      mongoose.connection.collections[collection].deleteMany(() => {});
    });
  };

  if (!mongoose.connection.db) {
    await mongoose.connect('mongodb://localhost/currency-test', {
      autoIndex: false,
      useNewUrlParser: true,
      useUnifiedTopology: true,
      useFindAndModify: false,
    });
  }
  clearCollections();
});
