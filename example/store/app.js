/* eslint-disable no-param-reassign */
/* eslint-disable no-console */

const bodyParser = require('body-parser');
const express = require('express');
const mongoose = require('mongoose');
const mongooseCurrenciesConverter = require('mongoose-currencies-converter');

const { Schema } = mongoose;

// DB + Model
mongoose.connect('mongodb://localhost/my-store', (err) => {
  if (err) {
    console.log(`Failed to establish connection with MongoDB. Error: ${err}`);
  }
  console.log('Successfully established connection with MongoDB');
});

const ProductSchema = new Schema({
  name: { type: String, required: true },
  acquisition: Number,
  acquisitionCurrency: String,
  price: Number,
});

ProductSchema.plugin(mongooseCurrenciesConverter, {
  fields: [
    { name: 'price' },
    { name: 'acquisition', currency: 'acquisitionCurrency' },
  ],
  defaultToCurrency: 'USD',
});

const Product = mongoose.model('Product', ProductSchema);

// Server
const app = express();
app.use(bodyParser.json());

// Routes
const router = express.Router();

// Product details
router.get('/:id', (req, res) =>
  Product.findById(req.params.id)
    .then((product) => {
      if (!product) {
        return res.status(404).send({
          message: `Product not found with id ${req.params.id}`,
        });
      }
      return res.status(200).send(product);
    })
    .catch(() =>
      res.status(500).send({
        message: `Error retrieving product with id ${req.params.id}`,
      }),
    ),
);

// Products list
router.get('/', (_req, res) =>
  Product.find()
    .then((products) => {
      res.status(200).send(products);
    })
    .catch((err) => {
      res.status(500).send({
        message: err.message || 'Error Occured',
      });
    }),
);

// Create product
router.post('/', (req, res) => {
  if (!req.body.name) {
    return res.status(400).send({
      message: 'Required field can not be empty',
    });
  }
  const product = new Product({
    name: req.body.name,
    acquisition: req.body.acquisition,
    acquisitionCurrency: req.body.acquisitionCurrency,
    price: req.body.price,
  });
  return product
    .save()
    .then((data) => res.send(data))
    .catch((err) =>
      res.status(500).send({
        message:
          err.message || 'Some error occurred while creating the Product.',
      }),
    );
});

// Update product
router.put('/:id', (req, res) =>
  Product.findById(req.params.id)
    .then((product) => {
      if (req.body.name) product.name = req.body.name;
      if (req.body.acquisition) product.price = req.body.acquisition;
      if (req.body.acquisitionCurrency) {
        product.currency = req.body.acquisitionCurrency;
      }
      if (req.body.price) product.price = req.body.price;
      product
        .save()
        .then((updatedProduct) => res.status(200).send(updatedProduct))
        .catch(() =>
          res.status(404).send({
            message: 'error while updating the product',
          }),
        );
    })
    .catch(() =>
      res.status(500).send({
        message: `Error retrieving product with id ${req.params.id}`,
      }),
    ),
);

// Delete product
router.delete('/:id', (req, res) =>
  Product.findByIdAndRemove(req.params.id)
    .then((product) => {
      if (!product) {
        return res.status(404).send({
          message: 'Product not found ',
        });
      }
      return res.send({ message: 'Product deleted successfully!' });
    })
    .catch(() =>
      res.status(500).send({
        message: 'Could not delete product',
      }),
    ),
);

app.use('/products', router);

app.listen(3000, () => {
  console.log(`Server listening on port ${3000}`);
});
