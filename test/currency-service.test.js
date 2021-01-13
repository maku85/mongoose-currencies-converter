const moment = require('moment');
const should = require('should');

const { convertCurrency } = require('../lib/currencyService');

describe('Currency service tests', () => {
  describe('convertCurrency method', () => {
    const today = moment().startOf('day').toDate();

    describe('Scenario 1 - invalid data', () => {
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

    describe('Scenario 2 - old currencies', () => {
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

    describe('Scenario 3 - EUR conversion', () => {
      it('should convert USD to EUR', async () => {
        const res = await convertCurrency({
          from: 'usd',
          to: 'eur',
          amount: 100,
          date: '2019-05-05',
        });
        should.deepEqual(res, {
          currency: 'EUR',
          date: moment('2019-05-03').toDate(),
          value: 89.65,
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
          value: 92.83,
        });
      });
    });

    describe('Scenario 4 - other currency conversion', () => {
      it('should convert USD to GBP', async () => {
        const res = await convertCurrency({
          from: 'usd',
          to: 'GbP',
          amount: 100,
          date: '2019-05-05',
        });
        should.deepEqual(res, {
          currency: 'GBP',
          date: moment('2019-05-03').toDate(),
          value: 76.9,
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
          date: moment('2019-05-03').toDate(),
          value: 132.6922,
        });
      });
    });
  });
});
