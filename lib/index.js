const get = require('lodash.get');
const Promise = require('bluebird');
const set = require('lodash.set');
const { Schema } = require('mongoose');

const { convertCurrency } = require('./currencyService');

const convertCurrencies = async (
  doc,
  fields = [],
  defaultToCurrency,
  numberOfDigit,
) => {
  await Promise.map(fields, async (field) => {
    let conversion;

    try {
      const isFieldModified = doc.isModified
        ? doc.isModified(field.value) || doc.isModified(field.currency)
        : true;
      console.log({ isFieldModified });
      const hasValue = get(doc, field.name) >= 0;
      if (isFieldModified && hasValue) {
        conversion = await convertCurrency({
          from: get(doc, field.currency),
          to: defaultToCurrency || 'EUR',
          amount: get(doc, field.name),
          date: get(doc, field.date),
          digit: numberOfDigit || 2,
        });
      }
    } finally {
      set(doc, `${field.name}Conversion`, conversion);
    }
  });

  return doc;
};

const MongooseCurrenciesConverter = (schema, pluginOpts) => {
  const options = pluginOpts || {};

  const convertAutomatically = (options.convertAutomatically || true) === true;
  const { defaultToCurrency, numberOfDigit } = options;
  const fields = get(options, 'fields') || [];

  // add nested schema for each field
  options.fields.forEach((field) => {
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
  Object.assign(schema.statics, {
    convert: async function convert(inOpts, inCb) {
      const opts = inOpts || [];
      const cb = inCb;

      convertCurrencies(
        this,
        opts.fields,
        defaultToCurrency,
        numberOfDigit,
      ).then(cb);
    },
  });

  async function preSave() {
    await convertCurrencies(this, fields, defaultToCurrency, numberOfDigit);
  }

  /**
   * Use standard Mongoose Middleware hooks
   */
  function setUpMiddlewareHooks(inSchema) {
    /**
     * Convert currency fields before save.
     */
    inSchema.pre('save', preSave);
    // inSchema.post('findOneAndUpdate', preSave);
    // inSchema.post('insertMany', (docs) => {
    //   docs.forEach((doc) => preSave(doc));
    // });
  }

  if (convertAutomatically) {
    setUpMiddlewareHooks(schema);
  }
};

module.exports = MongooseCurrenciesConverter;
