
require("dotenv").config({ path: __dirname + "/.env" });

const crypto = require("crypto");

function generateEsewaSignature(totalAmount, transactionUuid, productCode) {

    const message = `total_amount=${totalAmount},transaction_uuid=${transactionUuid},product_code=${productCode}`;

    const signature = crypto
        .createHmac("sha256", process.env.ESEWA_SECRET_KEY)
        .update(message)
        .digest("base64");

    return signature;
}

module.exports = { generateEsewaSignature };
