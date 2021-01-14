const mongoose = require('mongoose');
const should = require('should');
const sinon = require('sinon');
const { Mockgoose } = require('mockgoose');

const converter = require('../lib');
const currencyService = require('../lib/currencyService');

const mockgoose = new Mockgoose(mongoose);
mongoose.Promise = global.Promise;

describe.skip('Plugin tests', async () => {
  let convertCurrencyStub;

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

  beforeEach(() => {
    convertCurrencyStub = sinon.stub(currencyService, 'convertCurrency');
  });

  afterEach(() => {
    convertCurrencyStub.restore();
  });

  describe('Scenario 1 - invalid data', async () => {
    let ProductSchema;
    let Product0;

    before((done) => {
      ProductSchema = new mongoose.Schema({
        price: { type: Number },
        currency: { type: String },
        date: { type: Date },
      });
      ProductSchema.plugin(converter);
      Product0 = mongoose.model('Product0', ProductSchema);

      done();
    });
  });

  describe('Scenario 2 - single currency field with default conversion currency', async () => {
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
      const productData = { price: 1936.27, currency: 'ITL' };
      convertCurrencyStub
        .withArgs({
          from: productData.currency,
          to: 'EUR',
          amount: productData.price,
          date: productData.date,
          digit: 2,
        })
        .returns({ value: '1', currency: 'EUR', date: productData.date });
      const product = new Product1(productData);
      await product.save();

      const updated = await Product1.findById(product._id);
      updated.should.have.property('priceConversion');
      should.equal(updated.priceConversion.value, 1);
    });

    it('should convert USD currency to default EUR currency at the specified date', async () => {
      const productData = {
        price: 1,
        currency: 'USD',
        date: new Date('2020-12-01'),
      };
      convertCurrencyStub
        .withArgs({
          from: productData.currency,
          to: 'EUR',
          amount: productData.price,
          date: productData.date,
          digit: 2,
        })
        .returns({
          value: 0.84,
          currency: 'EUR',
          date: productData.date,
        });
      const product = new Product1(productData);
      await product.save();

      const updated = await Product1.findById(product._id);
      updated.should.have.property('priceConversion');
      should.equal(updated.priceConversion.value, 0.84);
    });
  });

  describe('Scenario 3 - multiple fields with default conversion currency', async () => {
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
      const productData = {
        acquisition: {
          value: 5,
          currency: 'GBP',
          date: new Date('2019-05-06'),
        },
        price: {
          value: 10,
          currency: 'USD',
          date: new Date('2020-12-26'),
        },
      };
      convertCurrencyStub
        .withArgs({
          from: productData.acquisition.currency,
          to: 'EUR',
          amount: productData.acquisition.value,
          date: productData.acquisition.date,
          digit: 2,
        })
        .returns({
          value: 5.85,
          currency: 'EUR',
          date: productData.acquisition.date,
        });
      convertCurrencyStub
        .withArgs({
          from: productData.price.currency,
          to: 'EUR',
          amount: productData.price.value,
          date: productData.price.date,
          digit: 2,
        })
        .returns({
          value: 8.2,
          currency: 'EUR',
          date: productData.price.date,
        });
      const product = new Product2(productData);
      await product.save();

      const updated = await Product2.findById(product._id);
      should.exist(updated.acquisition.valueConversion);
      should.equal(updated.acquisition.valueConversion.value, 5.85);
      should.exist(updated.price.valueConversion);
      should.equal(updated.price.valueConversion.value, 8.2);
    });
  });

  describe('Scenario 4 - single field with custom conversion currency', async () => {
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
      const productData = {
        price: 25,
        currency: 'EUR',
        date: new Date('2020-12-12'),
      };
      convertCurrencyStub
        .withArgs({
          from: productData.currency,
          to: 'USD',
          amount: productData.price,
          date: productData.date,
          digit: 2,
        })
        .returns({
          value: 30.32,
          currency: 'USD',
          date: productData.date,
        });
      const product = new Product3(productData);
      await product.save();

      const updated = await Product3.findById(product._id);
      updated.should.have.property('priceConversion');
      should.equal(updated.priceConversion.value, 30.32);
    });
  });
});
