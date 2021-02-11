const express = require("express");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const stripe = require("stripe")(
  "sk_test_51IHcXyHBSCPZmSfEoxPA7Nyzuwi4RS9LZFIvAKKLekcjeHnbwX4mwQwaTQ6rAzuYeOjEEWpuxupMUpmT40cL3dRO00rehoQ5ls"
);

const port = 3001;

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

app.use(cors());

app.get("/products", async (req, res) => {
  const fetchProducts = await stripe.products.list();
  const fetchPrices = await stripe.prices.list();
  const productsList = fetchProducts.data;
  const pricesList = fetchPrices.data;

  const allProducts = [];

  productsList.map((product) => {
    let prices = [];

    pricesList.map((price) => {
      if (price.product === product.id) {
        prices.push(price);
      }
    });

    const fullProduct = {
      ...product,
      prices: prices,
    };

    allProducts.push(fullProduct);
  });

  res.json({ allProducts });
});

app.post("/pay", async (req, res) => {
  const { email, amount, paymentMethod } = req.body;
  const customer = await stripe.customers.create({
    payment_method: paymentMethod,
    email: email,
    invoice_settings: {
      default_payment_method: paymentMethod,
    },
  });

  const paymentIntent = await stripe.paymentIntents.create({
    amount: amount,
    customer: customer.id,
    currency: "usd",
    // Verify your integration in this guide by including this parameter
    metadata: {
      integration_check: "accept_a_payment",
    },
    receipt_email: email,
  });

  res.json({ client_secret: paymentIntent["client_secret"] });
});

app.post("/sub", async (req, res) => {
  const { email, payment_method, priceId } = req.body;

  const customer = await stripe.customers.create({
    payment_method: payment_method,
    email: email,
    invoice_settings: {
      default_payment_method: payment_method,
    },
  });

  const subscription = await stripe.subscriptions.create({
    customer: customer.id,
    items: [
      {
        price: priceId,
      },
    ],
    expand: ["latest_invoice.payment_intent"],
  });

  const status = subscription["latest_invoice"]["payment_intent"]["status"];
  const client_secret =
    subscription["latest_invoice"]["payment_intent"]["client_secret"];

  res.json({ client_secret: client_secret, status: status });
});

app.listen(port, () => console.log(`listening on port ${port}!`));
