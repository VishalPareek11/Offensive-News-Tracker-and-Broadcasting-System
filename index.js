const { profanity } = require("allprofanity");

// Test text
const text = "What the f#ck is this?";

// Check
const result = profanity.check(text);

console.log("Offensive:", result);