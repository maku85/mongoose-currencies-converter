'use strict';

const get = require('lodash.get');
const Promise = require('bluebird');
const set = require('lodash.set');
const { Schema } = require('mongoose');

const { convertCurrency } = require('./currencyService');

const convertCurrencies = async ({
  doc,
  fields = [],
  defaultToCurrency = 'EUR',
  numberOfDigit = 2,
}) =>
  Promise.map(fields, async (field) => {
    let conversion;

    try {
      const isFieldModified =
        doc.isModified(field.name) || doc.isModified(field.currency);
      const hasValue = get(doc, field.name) >= 0;
      if (isFieldModified && hasValue) {
        conversion = await convertCurrency({
          from: get(doc, field.currency),
          to: defaultToCurrency,
          amount: get(doc, field.name),
          date: get(doc, field.date),
          digit: numberOfDigit,
        });
      }
    } finally {
      set(doc, `${field.name}Conversion`, conversion);
    }

    return doc;
  });

const checkField = ({ name, currency }) => {
  if (!name) throw new Error('name is required');

  if (typeof name !== 'string') {
    throw new Error(`name must be a string, received ${typeof name}`);
  }

  if (currency && typeof currency !== 'string') {
    throw new Error(`currency must be a string, received ${typeof name}`);
  }
};

const plugin = (schema, pluginOpts) => {
  const options = pluginOpts || {};

  if (typeof options !== 'object') {
    throw new Error(`options must be an object, received ${typeof options}`);
  }

  const {
    convertAutomatically = plugin.defaults.convertAutomatically,
    defaultToCurrency = plugin.defaults.defaultToCurrency,
    fields,
    numberOfDigit = plugin.defaults.numberOfDigit,
  } = options;

  if (!fields || !fields.length) throw new Error('option fields must be set');

  // add nested schema for each field
  fields.forEach((field) => {
    checkField(field);

    schema.add({
      [`${field.name}Conversion`]: new Schema(
        {
          currency: String,
          date: Date,
          value: Number,
        },
        { _id: false },
      ),
    });
  });

  /**
   * Update manually currency fields
   * @param options - (optional) specify fields to convert
   * @param cb - callback when conversion is complete
   */
  async function manualConversion(inOpts, inCb) {
    const opts = inOpts || {};
    const cb = inCb;

    return convertCurrencies({
      doc: this,
      fields: opts.fields,
      defaultToCurrency,
      numberOfDigit,
    }).then(cb);
  }
  // TODO: add manualConversion as method on documents and static on the schema
  // schema.method('convert', manualConversion);
  // schema.static('convert', manualConversion);

  async function preSave() {
    await convertCurrencies({
      doc: this,
      fields,
      defaultToCurrency,
      numberOfDigit,
    });
  }

  /**
   * Use standard Mongoose Middleware hooks
   */
  function setUpMiddlewareHooks(inSchema) {
    /**
     * Convert currency fields before save.
     */
    inSchema.pre('save', preSave);
  }

  if (convertAutomatically) {
    setUpMiddlewareHooks(schema);
  }
};

plugin.defaults = {
  convertAutomatically: true,
  defaultToCurrency: 'EUR',
  numberOfDigit: 2,
};

module.exports = plugin;
