
const { generateEsewaSignature } = require("./esewa");

const totalAmount = "100";
const transactionUuid = "test-transaction-123";
const productCode = process.env.ESEWA_PRODUCT_CODE || "EPAYTEST";

const signature = generateEsewaSignature(
    totalAmount,
    transactionUuid,
    productCode
);

console.log("Generated eSewa Signature:");
console.log(signature);
