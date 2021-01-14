const moment = require('moment');
const nock = require('nock');
const should = require('should');
const url = require('url');

const { convertCurrency } = require('../lib/currencyService');
const { exchangeApi } = require('../lib/constants');

describe('Currency service tests', () => {
  describe('convertCurrency method', () => {
    const today = moment().startOf('day').toDate();

    describe('Scenario 1 - invalid data', () => {
      it('should throw error for empty currency', async () => {
        await convertCurrency({
          from: '',
          to: 'itl',
          amount: 1,
        }).catch((err) =>
          err.message.should.equal('Invalid value. Currency is required!'),
        );
      });

      it('should throw error for invalid currency type', async () => {
        await convertCurrency({
          from: 1,
          to: 'itl',
          amount: 1,
        }).catch((err) =>
          err.message.should.equal(
            'Invalid value: 1. Currency must be a string!',
          ),
        );
      });

      it('should throw error for invalid currency length', async () => {
        await convertCurrency({
          from: '1234',
          to: 'itl',
          amount: 1,
        }).catch((err) =>
          err.message.should.equal(
            'Invalid value: 1234. Letter count not equal to 3!',
          ),
        );
      });

      it('should throw error for invalid from currency', async () => {
        await convertCurrency({
          from: 'aaa',
          to: 'itl',
          amount: 1,
        }).catch((err) =>
          err.message.should.equal('Error: Currency Exchange rate is unknown!'),
        );
      });

      it('should throw error for invalid to currency', async () => {
        await convertCurrency({
          from: 'eur',
          to: 'aaa',
          amount: 1,
        }).catch((err) =>
          err.message.should.equal('Error: Currency Exchange rate is unknown!'),
        );
      });

      it('should throw error for invalid date', async () => {
        await convertCurrency({
          from: 'eur',
          to: 'usd',
          amount: 1,
          date: '123-45-67',
        }).catch((err) => err.message.should.equal('Invalid Date: 123-45-67'));
      });

      it('should convert to from currency', async () => {
        const res = await convertCurrency({
          from: 'eur',
          to: 'eur',
          amount: 100,
        });
        should.deepEqual(res, {
          currency: 'EUR',
          date: today,
          value: 100,
        });
      });
    });

    describe('Scenario 2 - old currencies from/to EUR', () => {
      it('should convert EUR to ITL', async () => {
        const res = await convertCurrency({
          from: 'eur',
          to: 'itl',
          amount: 1,
        });
        should.deepEqual(res, {
          currency: 'ITL',
          date: today,
          value: 1936.27,
        });
      });

      it('should convert ITL to EUR', async () => {
        const res = await convertCurrency({
          from: 'itl',
          to: 'eur',
          amount: 2000,
        });
        should.deepEqual(res, {
          currency: 'EUR',
          date: today,
          value: 1.03,
        });
      });
    });

    describe('Scenario 3 - other currencies', () => {
      beforeEach(() => {
        nock(exchangeApi)
          .get(/^\/[0-9]{4}-[0-9]{2}-[0-9]{2}$/)
          .query({ base: /[A-Z]{3}/, symbols: /[A-Z]{3}/ })
          .reply(200, (uri) => {
            const parsed = new url.URL(uri, 'http://example.com');
            return {
              base: parsed.searchParams.get('base').toUpperCase(),
              date: parsed.pathname.replace('/', ''),
              rates: {
                [parsed.searchParams.get('symbols').toUpperCase()]: 1.123456789,
              },
            };
          });
      });

      it('should convert USD to EUR', async () => {
        const res = await convertCurrency({
          from: 'usd',
          to: 'eur',
          amount: 100,
          date: '2019-05-05',
        });
        should.deepEqual(res, {
          currency: 'EUR',
          date: moment('2019-05-05').toDate(),
          value: 112.35,
        });
      });

      it('should convert USD to EUR with date before EUR introduction', async () => {
        const res = await convertCurrency({
          from: 'usd',
          to: 'eur',
          amount: 100,
          date: '1990-01-01',
        });
        should.deepEqual(res, {
          currency: 'EUR',
          date: moment('1999-04-01').toDate(),
          value: 112.35,
        });
      });

      it('should convert GBP to CHF with a specific number of digit', async () => {
        const res = await convertCurrency({
          from: 'GBP',
          to: 'chf',
          amount: 100,
          date: '2019-05-05',
          digit: 4,
        });
        should.deepEqual(res, {
          currency: 'CHF',
          date: moment('2019-05-05').toDate(),
          value: 112.3457,
        });
      });
    });
  });
});
