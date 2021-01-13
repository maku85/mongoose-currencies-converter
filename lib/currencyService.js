const get = require('lodash.get');
const moment = require('moment');

const CacheService = require('./cacheService');
const { STATIC_CURRENCY, exchangeApi, ttl } = require('./constants');
const { checkCurrency, checkDate, fetchData } = require('./helpers');

const cache = new CacheService(ttl);

const getCurrencyRate = async (from, to, date) => {
  console.log({ from, to, date });
  if (from === to) {
    return {
      base: to,
      date,
      rates: { [to]: 1 },
    };
  }

  if (
    (to === 'EUR' && from in STATIC_CURRENCY) ||
    (from === 'EUR' && to in STATIC_CURRENCY)
  ) {
    return {
      base: to,
      date,
      rates: {
        [to]: from === 'EUR' ? STATIC_CURRENCY[to] : 1 / STATIC_CURRENCY[from],
      },
    };
  }

  console.log(`${exchangeApi}${date}?base=${from}&symbols=${to}`);
  return cache.get(`${from}-${to}-${date}`, () =>
    fetchData(`${exchangeApi}${date}?base=${from}&symbols=${to}`),
  );
};

module.exports.convertCurrency = async ({
  from = 'EUR',
  to = 'EUR',
  amount = 0,
  date,
  digit = 2,
}) => {
  const currencyFrom = checkCurrency(from);
  const currencyTo = checkCurrency(to);
  let conversionDate = checkDate(date);

  if (date && currencyTo === 'EUR') {
    // Note: conversions referring to a date prior to the introduction of euro are not supported.
    // The conversion displayed used the exchange rate from 04-01-1999.
    if (moment(conversionDate).isBefore('1999-04-01', 'year')) {
      conversionDate = '1999-04-01';
    }
  }

  try {
    const currencyRate = await getCurrencyRate(
      currencyFrom,
      currencyTo,
      conversionDate,
    );
    if (!get(currencyRate, 'rates')) {
      throw new Error('Currency Exchange rate is unknown!');
    }

    console.log({ currencyRate });
    return {
      currency: currencyTo,
      date: moment(currencyRate.date).toDate(),
      value: parseFloat(
        (amount * currencyRate.rates[currencyTo]).toFixed(digit),
      ),
    };
  } catch (err) {
    throw new Error(err);
  }
};
