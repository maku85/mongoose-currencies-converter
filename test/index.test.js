const mongoose = require('mongoose');
const should = require('should');
const { Mockgoose } = require('mockgoose');

const converter = require('../lib');

const mockgoose = new Mockgoose(mongoose);
mongoose.Promise = global.Promise;

describe('Plugin tests', async () => {
  before((done) => {
    mockgoose.helper.setDbVersion('3.6.20');
    mockgoose.prepareStorage().then(() => {
      mongoose.connect(
        'mongodb://localhost/mydb',
        {
          useFindAndModify: false,
          useUnifiedTopology: true,
          useNewUrlParser: true,
        },
        done,
        done,
      );
    });
  });

  describe('setting a currency field', async () => {
    let Product1;

    before((done) => {
      const ProductSchema = new mongoose.Schema({
        price: { type: Number },
        currency: { type: String },
        date: { type: Date },
      });
      ProductSchema.plugin(converter, {
        fields: [{ name: 'price', currency: 'currency', date: 'date' }],
      });
      Product1 = mongoose.model('Product1', ProductSchema);

      done();
    });

    after((done) => {
      mockgoose.helper.reset().then(() => {
        done();
      });
    });

    it('should convert ITL currency to default EUR currency', async () => {
      const product = new Product1({ price: '1936.27', currency: 'ITL' });
      await product.save();

      const updated = await Product1.findById(product._id);
      updated.should.have.property('priceConversion');
      should.equal(updated.priceConversion.value, 1);
    });

    it('should convert USD currency to default EUR currency at the specified date', async () => {
      const product = new Product1({
        price: '1',
        currency: 'USD',
        date: new Date('2020-12-01'),
      });
      await product.save();

      const updated = await Product1.findById(product._id);
      updated.should.have.property('priceConversion');
      should.equal(updated.priceConversion.value, 0.84);
    });

    it.only('should convert using finOneAndUpdate', async () => {
      const product = new Product1({
        price: '1',
        currency: 'USD',
        date: new Date('2020-12-01'),
      });
      await Product1.findOneAndUpdate({ _id: product._id }, { price: '2' });

      const updated = await Product1.findById(product._id);
      updated.should.have.property('priceConversion');
      should.equal(updated.priceConversion.value, 0.84);
    });
  });

  describe('setting a currency field with default currency', async () => {
    let Product2;

    before((done) => {
      const ProductSchema = new mongoose.Schema({
        acquisition: {
          value: Number,
          currency: String,
          date: Date,
        },
        price: {
          value: Number,
          currency: String,
          date: Date,
        },
      });
      ProductSchema.plugin(converter, {
        fields: [
          {
            name: 'acquisition.value',
            currency: 'acquisition.currency',
            date: 'acquisition.date',
          },
          {
            name: 'price.value',
            currency: 'price.currency',
            date: 'price.date',
          },
        ],
      });
      Product2 = mongoose.model('Product2', ProductSchema);

      done();
    });

    after((done) => {
      mockgoose.helper.reset().then(() => {
        done();
      });
    });

    it('should convert currencies to default EUR currency at the specified date', async () => {
      const product = new Product2({
        acquisition: {
          value: '5',
          currency: 'GBP',
          date: new Date('2019-05-06'),
        },
        price: {
          value: '10',
          currency: 'USD',
          date: new Date('2020-12-26'),
        },
      });
      await product.save();

      const updated = await Product2.findById(product._id);
      should.exist(updated.acquisition.valueConversion);
      should.equal(updated.acquisition.valueConversion.value, 5.85);
      should.exist(updated.price.valueConversion);
      should.equal(updated.price.valueConversion.value, 8.2);
    });
  });

  describe('setting a currency field and a default to currency', async () => {
    let Product3;

    before((done) => {
      const ProductSchema = new mongoose.Schema({
        price: { type: Number },
        currency: { type: String },
        date: { type: Date },
      });
      ProductSchema.plugin(converter, {
        fields: [
          {
            name: 'price',
            currency: 'currency',
            date: 'date',
          },
        ],
        defaultToCurrency: 'USD',
      });
      Product3 = mongoose.model('Product3', ProductSchema);

      done();
    });

    after((done) => {
      mockgoose.helper.reset().then(() => {
        done();
      });
    });

    it('should convert EUR currency to setted USD currency', async () => {
      const product = new Product3({
        price: '25',
        currency: 'EUR',
        date: new Date('2020-12-12'),
      });
      await product.save();

      const updated = await Product3.findById(product._id);
      updated.should.have.property('priceConversion');
      should.equal(updated.priceConversion.value, 30.32);
    });
  });
});
